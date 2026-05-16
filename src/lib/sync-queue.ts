import { supabase } from "@/integrations/supabase/client";
import { offlineDB, type PendingPhoto } from "./offline-db";

const MAX_ATTEMPTS = 8;
// backoff em ms — 5s, 15s, 60s, 5min, 15min, 30min, 1h, 2h
const BACKOFFS = [5_000, 15_000, 60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000, 60 * 60_000, 120 * 60_000];

type Listener = (state: { processing: boolean; cancelling: boolean }) => void;
const listeners = new Set<Listener>();
let processing = false;
let cancelRequested = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let pauseUntil = 0; // após cancelar, segura auto-retry por alguns segundos

function emit() {
  for (const l of listeners) l({ processing, cancelling: cancelRequested });
}

export function cancelSync() {
  if (!processing) return false;
  cancelRequested = true;
  pauseUntil = Date.now() + 10_000; // 10s sem auto-retry
  emit();
  return true;
}

export function isCancelling() {
  return cancelRequested;
}

export function subscribeSyncQueue(l: Listener) {
  listeners.add(l);
  l({ processing });
  return () => listeners.delete(l);
}

function uuid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueuePhoto(args: {
  inspecao_id: string;
  organizacao_id: string;
  tipo_foto: string;
  file: File | Blob;
  nome?: string;
}) {
  const blob = args.file instanceof File ? args.file : args.file;
  const nome = args.nome ?? (args.file instanceof File ? args.file.name : `${args.tipo_foto}.jpg`);
  const content_type = (args.file as File).type || "image/jpeg";
  const item: PendingPhoto = {
    id: uuid(),
    inspecao_id: args.inspecao_id,
    organizacao_id: args.organizacao_id,
    tipo_foto: args.tipo_foto,
    blob,
    nome,
    content_type,
    status: "pendente",
    attempts: 0,
    next_attempt_at: Date.now(),
    created_at: Date.now(),
  };
  await offlineDB.pendingPhotos.add(item);
  scheduleProcess(50);
  return item.id;
}

export async function retryPendingPhoto(id: string) {
  await offlineDB.pendingPhotos.update(id, {
    status: "pendente",
    attempts: 0,
    next_attempt_at: Date.now(),
    last_error: undefined,
  });
  scheduleProcess(0);
}

export async function deletePendingPhoto(id: string) {
  await offlineDB.pendingPhotos.delete(id);
}

export async function retryAllPendingPhotos() {
  const all = await offlineDB.pendingPhotos.toArray();
  await offlineDB.pendingPhotos.bulkPut(
    all.map((p) => ({ ...p, status: "pendente" as const, attempts: 0, next_attempt_at: Date.now(), last_error: undefined })),
  );
  scheduleProcess(0);
}

async function uploadOne(item: PendingPhoto): Promise<void> {
  const path = `${item.organizacao_id}/${item.inspecao_id}/${item.tipo_foto}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error: upErr } = await supabase.storage.from("inspection-photos").upload(path, item.blob, {
    contentType: item.content_type,
    upsert: false,
  });
  if (upErr) throw upErr;
  const { error: insErr } = await supabase.from("fotos_inspecao").insert({
    organizacao_id: item.organizacao_id,
    inspecao_id: item.inspecao_id,
    tipo_foto: item.tipo_foto as never,
    storage_path: path,
  });
  if (insErr) {
    // tenta limpar o objeto enviado para não deixar órfão
    await supabase.storage.from("inspection-photos").remove([path]).catch(() => undefined);
    throw insErr;
  }
}

export function scheduleProcess(delay = 0) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void processQueue();
  }, delay);
}

export async function processQueue() {
  if (processing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  processing = true;
  emit();
  try {
    while (true) {
      const now = Date.now();
      const next = await offlineDB.pendingPhotos
        .where("status")
        .equals("pendente")
        .and((p) => p.next_attempt_at <= now)
        .first();
      if (!next) break;

      await offlineDB.pendingPhotos.update(next.id, { status: "enviando", last_error: undefined });
      try {
        await uploadOne(next);
        await offlineDB.pendingPhotos.delete(next.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha no envio";
        const attempts = next.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await offlineDB.pendingPhotos.update(next.id, {
            status: "erro",
            attempts,
            last_error: msg,
            next_attempt_at: Date.now(),
          });
        } else {
          const wait = BACKOFFS[Math.min(attempts - 1, BACKOFFS.length - 1)];
          await offlineDB.pendingPhotos.update(next.id, {
            status: "pendente",
            attempts,
            last_error: msg,
            next_attempt_at: Date.now() + wait,
          });
          // se ficou sem nada elegível agora, agenda o próximo retry
          scheduleProcess(wait + 100);
          break;
        }
      }
    }
  } finally {
    processing = false;
    emit();
    // se ainda há itens pendentes futuros, agenda
    const upcoming = await offlineDB.pendingPhotos
      .where("status")
      .equals("pendente")
      .first();
    if (upcoming && upcoming.next_attempt_at > Date.now()) {
      scheduleProcess(Math.max(500, upcoming.next_attempt_at - Date.now()));
    }
  }
}

export interface SyncResult {
  enviados: number;
  falhas: number;
  restantes: number;
}

/**
 * Força sincronização imediata (ignora backoff) e retorna o resultado agregado.
 * Útil para o botão "Sincronizar agora" com feedback ao usuário.
 */
export async function syncNow(): Promise<SyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Sem conexão com a internet");
  }
  // espera processamento atual terminar
  while (processing) {
    await new Promise((r) => setTimeout(r, 100));
  }
  // reagenda todos os pendentes para agora (ignora backoff)
  const all = await offlineDB.pendingPhotos.where("status").notEqual("enviando").toArray();
  await offlineDB.pendingPhotos.bulkPut(
    all.map((p) => ({
      ...p,
      status: "pendente" as const,
      next_attempt_at: Date.now(),
      last_error: undefined,
    })),
  );

  let enviados = 0;
  let falhas = 0;
  processing = true;
  emit();
  try {
    while (true) {
      const next = await offlineDB.pendingPhotos.where("status").equals("pendente").first();
      if (!next) break;
      await offlineDB.pendingPhotos.update(next.id, { status: "enviando", last_error: undefined });
      try {
        await uploadOne(next);
        await offlineDB.pendingPhotos.delete(next.id);
        enviados++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha no envio";
        const attempts = next.attempts + 1;
        await offlineDB.pendingPhotos.update(next.id, {
          status: attempts >= MAX_ATTEMPTS ? "erro" : "pendente",
          attempts,
          last_error: msg,
          next_attempt_at:
            attempts >= MAX_ATTEMPTS
              ? Date.now()
              : Date.now() + BACKOFFS[Math.min(attempts - 1, BACKOFFS.length - 1)],
        });
        falhas++;
      }
    }
  } finally {
    processing = false;
    emit();
  }
  const restantes = await offlineDB.pendingPhotos.count();
  return { enviados, falhas, restantes };
}

let initialized = false;
export function initSyncQueue() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("online", () => {
    scheduleProcess(200);
  });
  // retry leves enquanto a aba estiver aberta
  setInterval(() => {
    if (navigator.onLine) scheduleProcess(0);
  }, 30_000);
  // dispara já no boot
  scheduleProcess(500);
}
