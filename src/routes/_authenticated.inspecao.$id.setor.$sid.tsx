import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, Plus, Trash2, CheckCircle2, AlertCircle, X } from "lucide-react";

const TIPOS = [
  { key: "geral", label: "Geral" },
  { key: "plantas", label: "Plantas" },
  { key: "folhas", label: "Folhas" },
  { key: "frutos", label: "Frutos" },
  { key: "solo", label: "Solo" },
  { key: "plastico", label: "Plástico/Túnel" },
] as const;

type TipoKey = (typeof TIPOS)[number]["key"];
type FotoRow = { id: string; tipo_foto: TipoKey; storage_path: string };
type UploadStatus = "enviando" | "concluido" | "erro";
type UploadItem = {
  id: string;
  tipo: TipoKey;
  nome: string;
  status: UploadStatus;
  progresso: number;
  erro?: string;
};

export const Route = createFileRoute("/_authenticated/inspecao/$id/setor/$sid")({
  component: ColetaPage,
});

function ColetaPage() {
  const { id, sid } = useParams({ from: "/_authenticated/inspecao/$id/setor/$sid" });
  const navigate = useNavigate();
  const [temp, setTemp] = useState("");
  const [umid, setUmid] = useState("");
  const [lum, setLum] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateUpload = (uid: string, patch: Partial<UploadItem>) =>
    setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, ...patch } : u)));
  const removeUpload = (uid: string) =>
    setUploads((prev) => prev.filter((u) => u.id !== uid));

  const { data: setor } = useQuery({
    queryKey: ["setor", sid],
    queryFn: async () => (await supabase.from("setores").select("codigo").eq("id", sid).single()).data,
  });

  const { data: fotos, refetch: refetchFotos } = useQuery({
    queryKey: ["fotos", id],
    queryFn: async (): Promise<FotoRow[]> =>
      (((await supabase
        .from("fotos_inspecao")
        .select("id, tipo_foto, storage_path")
        .eq("inspecao_id", id)
        .order("created_at", { ascending: true })).data ?? []) as FotoRow[]),
  });

  // Signed URLs por foto.id
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const novos: Record<string, string> = {};
      for (const f of fotos ?? []) {
        const { data } = await supabase.storage
          .from("inspection-photos")
          .createSignedUrl(f.storage_path, 600);
        if (data?.signedUrl) novos[f.id] = data.signedUrl;
      }
      if (!cancelled) setPreviews(novos);
    })();
    return () => {
      cancelled = true;
    };
  }, [fotos]);

  const fotosPorTipo = (tipo: TipoKey) => (fotos ?? []).filter((f) => f.tipo_foto === tipo);

  const upload = async (tipo: TipoKey, file: File) => {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUploads((prev) => [
      ...prev,
      { id: uid, tipo, nome: file.name, status: "enviando", progresso: 10 },
    ]);
    try {
      const orgRes = await supabase.rpc("current_org_id");
      updateUpload(uid, { progresso: 30 });
      const path = `${orgRes.data}/${id}/${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage.from("inspection-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      updateUpload(uid, { progresso: 75 });
      const { error: insErr } = await supabase.from("fotos_inspecao").insert({
        organizacao_id: orgRes.data!,
        inspecao_id: id,
        tipo_foto: tipo,
        storage_path: path,
      });
      if (insErr) throw insErr;
      updateUpload(uid, { status: "concluido", progresso: 100 });
      refetchFotos();
      setTimeout(() => removeUpload(uid), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      updateUpload(uid, { status: "erro", progresso: 100, erro: msg });
      toast.error(msg);
    }
  };

  const remover = async (foto: FotoRow) => {
    try {
      await supabase.storage.from("inspection-photos").remove([foto.storage_path]);
      const { error } = await supabase.from("fotos_inspecao").delete().eq("id", foto.id);
      if (error) throw error;
      toast.success("Foto removida");
      refetchFotos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  const triggerInput = (tipo: TipoKey) => inputRefs.current[tipo]?.click();

  const salvar = async () => {
    setBusy(true);
    try {
      await supabase
        .from("inspecoes")
        .update({
          temperatura: temp ? Number(temp) : null,
          umidade: umid ? Number(umid) : null,
          luminosidade: lum ? Number(lum) : null,
        })
        .eq("id", id);
      navigate({ to: "/inspecao/$id/observacoes", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Coleta de Dados" back={`/inspecao/${id}/qr`}>
      <div className="mb-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-card">
        <p className="text-xs uppercase opacity-80">Setor atual</p>
        <p className="text-2xl font-bold">{setor?.codigo ?? "..."}</p>
      </div>

      <h3 className="mb-2 text-sm font-semibold">Fotos</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Você pode adicionar várias fotos para cada tipo.
      </p>

      <div className="mb-5 space-y-3">
        {TIPOS.map((t) => {
          const lista = fotosPorTipo(t.key);
          const isUploading = uploadingTipo === t.key;

          return (
            <div key={t.key} className="rounded-2xl border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {lista.length} {lista.length === 1 ? "foto" : "fotos"}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  disabled={isUploading}
                  onClick={() => triggerInput(t.key)}
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {lista.map((f) => {
                  const url = previews[f.id];
                  return (
                    <div
                      key={f.id}
                      className="relative aspect-square overflow-hidden rounded-xl border bg-muted"
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={`Foto ${t.label}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => remover(f)}
                        aria-label="Remover foto"
                        className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground shadow-sm hover:bg-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => triggerInput(t.key)}
                  disabled={isUploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-60"
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>{lista.length === 0 ? "Capturar" : "Mais"}</span>
                    </>
                  )}
                </button>
              </div>

              <input
                ref={(el) => {
                  inputRefs.current[t.key] = el;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(t.key, f);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>

      <h3 className="mb-2 text-sm font-semibold">Ambiente</h3>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Temp (°C)"><Input type="number" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} /></Field>
        <Field label="Umid (%)"><Input type="number" inputMode="decimal" value={umid} onChange={(e) => setUmid(e.target.value)} /></Field>
        <Field label="Luz (lux)"><Input type="number" inputMode="decimal" value={lum} onChange={(e) => setLum(e.target.value)} /></Field>
      </div>

      <Button className="mt-6 h-12 w-full text-base" onClick={salvar} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Setor"}
      </Button>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
