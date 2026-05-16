import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  PlayCircle,
  History,
  CloudUpload,
  Settings,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { syncNow, cancelSync } from "@/lib/sync-queue";
import { usePendingPhotos, useSyncQueueState } from "@/lib/use-sync-queue";
import { AppShell } from "@/components/app-shell";
import { ConnectionBanner } from "@/components/connection-banner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useConnection } from "@/lib/use-online";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

function HomePage() {
  const pendentesFila = usePendingPhotos();
  const { status } = useConnection();
  const offline = status === "offline";
  const { data: pendente } = useQuery({
    queryKey: ["pendente"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspecoes")
        .select("id, data_inspecao, setor_id, status_processo, status_geral, setor:setor_id(codigo)")
        .is("status_geral", null)
        .neq("status_processo", "cancelada")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
    enabled: !offline,
  });

  // Restaura o passo correto da inspeção pendente
  const continuar = (() => {
    if (!pendente) return null;
    const p = pendente as {
      id: string;
      setor_id: string | null;
      status_processo: string | null;
    };
    if (p.status_processo === "analisando") {
      return { to: "/inspecao/$id/analisando" as const, params: { id: p.id }, etapa: "Análise em andamento" };
    }
    if (p.status_processo === "concluida") {
      return { to: "/inspecao/$id/resultado" as const, params: { id: p.id }, etapa: "Ver resultado" };
    }
    if (!p.setor_id) {
      return { to: "/inspecao/$id/qr" as const, params: { id: p.id }, etapa: "Escanear setor" };
    }
    return {
      to: "/inspecao/$id/setor/$sid" as const,
      params: { id: p.id, sid: p.setor_id },
      etapa: "Coleta de fotos",
    };
  })();

  const items = [
    {
      to: "/inspecao/nova",
      params: undefined,
      icon: PlayCircle,
      label: "Nova Inspeção",
      primary: true,
      sub: offline ? "Disponível offline" : undefined,
      disabled: false,
    },
    {
      to: continuar?.to ?? "/historico",
      params: continuar?.params,
      icon: ClipboardList,
      label: "Continuar Inspeção",
      disabled: !continuar,
      sub: continuar
        ? `Setor ${(pendente as any)?.setor?.codigo ?? "—"} · ${continuar.etapa}`
        : "Nenhuma pendente",
    },
    {
      to: "/historico",
      params: undefined,
      icon: History,
      label: "Histórico",
      sub: offline ? "Requer conexão" : undefined,
      disabled: offline,
    },
    {
      to: "/dashboard",
      params: undefined,
      icon: LayoutDashboard,
      label: "Dashboard",
      sub: offline ? "Requer conexão" : undefined,
      disabled: offline,
    },
    {
      to: "/configuracoes",
      params: undefined,
      icon: Settings,
      label: "Configurações",
      sub: undefined as string | undefined,
      disabled: false,
    },
  ];

  return (
    <AppShell title="Agrobotic Scout AI">
      <ConnectionBanner />
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-elevated">
        <p className="text-xs uppercase tracking-wider opacity-80">Bem-vindo</p>
        <h2 className="text-xl font-semibold">Pronto para inspecionar o campo?</h2>
        <p className="mt-1 text-sm opacity-90">Toque em "Nova Inspeção" para começar.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((it) => (
          <Link
            key={it.label}
            to={it.to as any}
            params={it.params as any}
            className={`group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card transition active:scale-[0.99] ${(it as any).disabled ? "pointer-events-none opacity-60" : ""} ${(it as any).primary ? "border-primary/30 ring-2 ring-primary/15" : ""}`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${(it as any).primary ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
              <it.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{it.label}</div>
              {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
            </div>
          </Link>
        ))}
        <SyncCard offline={offline} pendentes={pendentesFila.length} />
      </div>
    </AppShell>
  );
}

function SyncCard({ offline, pendentes }: { offline: boolean; pendentes: number }) {
  const [running, setRunning] = useState(false);
  const { cancelling } = useSyncQueueState();

  const handleCancel = () => {
    const ok = cancelSync();
    if (ok) toast.message("Cancelando sincronização…", { description: "O envio atual será concluído e a fila parará." });
  };

  const handleSync = async () => {
    if (offline) {
      toast.error("Você está offline", {
        description: "Reconecte-se para enviar os dados pendentes.",
      });
      return;
    }
    if (pendentes === 0) {
      toast.info("Nada para sincronizar", { description: "Tudo já está enviado." });
      return;
    }
    setRunning(true);
    const p = syncNow();
    toast.promise(p, {
      loading: `Enviando ${pendentes} item${pendentes > 1 ? "s" : ""}…`,
      success: (r) => {
        if (r.cancelado) {
          return `Cancelado — ${r.enviados} enviado${r.enviados !== 1 ? "s" : ""}, ${r.restantes} na fila`;
        }
        if (r.falhas === 0 && r.restantes === 0) {
          return `${r.enviados} item${r.enviados !== 1 ? "s" : ""} sincronizado${r.enviados !== 1 ? "s" : ""}`;
        }
        const partes: string[] = [];
        if (r.enviados) partes.push(`${r.enviados} enviado${r.enviados !== 1 ? "s" : ""}`);
        if (r.falhas) partes.push(`${r.falhas} com falha`);
        if (r.restantes) partes.push(`${r.restantes} na fila`);
        return partes.join(" · ") || "Sincronização concluída";
      },
      error: (e: unknown) => (e instanceof Error ? e.message : "Falha ao sincronizar"),
    });
    try {
      await p;
    } catch {
      /* erro já mostrado no toast */
    } finally {
      setRunning(false);
    }
  };

  const temPendentes = pendentes > 0;
  const destacar = temPendentes;
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 shadow-card ${
        destacar ? "border-primary/40 bg-primary/5 ring-2 ring-primary/15" : "bg-card"
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          destacar ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"
        }`}
      >
        {running ? <Loader2 className="h-6 w-6 animate-spin" /> : <CloudUpload className="h-6 w-6" />}
      </div>
      <div className="flex-1 text-left">
        <div className="font-semibold">Sincronizar Dados</div>
        <div className="text-xs text-muted-foreground">
          {cancelling
            ? "Cancelando…"
            : temPendentes
              ? `${pendentes} pendente${pendentes > 1 ? "s" : ""}${offline ? " · aguardando conexão" : " · pronto pra enviar"}`
              : "Tudo enviado"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {running ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground disabled:opacity-50"
          >
            {cancelling ? "Cancelando…" : "Cancelar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSync}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Sincronizar
          </button>
        )}
        <Link to="/sincronizacao" className="text-[11px] text-muted-foreground underline underline-offset-2">
          Ver fila
        </Link>
      </div>
    </div>
  );
}
