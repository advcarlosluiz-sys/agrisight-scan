import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Check, Loader2, RefreshCw, Trash2 } from "lucide-react";

const TIPOS = [
  { key: "geral", label: "Geral" },
  { key: "plantas", label: "Plantas" },
  { key: "folhas", label: "Folhas" },
  { key: "frutos", label: "Frutos" },
  { key: "solo", label: "Solo" },
  { key: "plastico", label: "Plástico/Túnel" },
] as const;

type FotoRow = { id: string; tipo_foto: string; storage_path: string };

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
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: setor } = useQuery({
    queryKey: ["setor", sid],
    queryFn: async () => (await supabase.from("setores").select("codigo").eq("id", sid).single()).data,
  });

  const { data: fotos, refetch: refetchFotos } = useQuery({
    queryKey: ["fotos", id],
    queryFn: async (): Promise<FotoRow[]> =>
      ((await supabase
        .from("fotos_inspecao")
        .select("id, tipo_foto, storage_path")
        .eq("inspecao_id", id)).data ?? []) as FotoRow[],
  });

  // Gera signed URLs para preview de cada foto presente
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const novos: Record<string, string> = {};
      for (const f of fotos ?? []) {
        const { data } = await supabase.storage
          .from("inspection-photos")
          .createSignedUrl(f.storage_path, 600);
        if (data?.signedUrl) novos[f.tipo_foto] = data.signedUrl;
      }
      if (!cancelled) setPreviews(novos);
    })();
    return () => {
      cancelled = true;
    };
  }, [fotos]);

  const fotoPorTipo = new Map((fotos ?? []).map((f) => [f.tipo_foto, f]));

  const upload = async (tipo: string, file: File) => {
    setUploadingTipo(tipo);
    try {
      const orgRes = await supabase.rpc("current_org_id");
      const path = `${orgRes.data}/${id}/${tipo}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("inspection-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;

      // Se já existe foto deste tipo, remove a anterior (substituição)
      const existente = fotoPorTipo.get(tipo);
      if (existente) {
        await supabase.storage.from("inspection-photos").remove([existente.storage_path]);
        await supabase.from("fotos_inspecao").delete().eq("id", existente.id);
      }

      await supabase.from("fotos_inspecao").insert({
        organizacao_id: orgRes.data!,
        inspecao_id: id,
        tipo_foto: tipo as (typeof TIPOS)[number]["key"],
        storage_path: path,
      });
      toast.success(existente ? `Foto "${tipo}" substituída` : `Foto "${tipo}" enviada`);
      refetchFotos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setUploadingTipo(null);
    }
  };

  const remover = async (tipo: string) => {
    const existente = fotoPorTipo.get(tipo);
    if (!existente) return;
    try {
      await supabase.storage.from("inspection-photos").remove([existente.storage_path]);
      const { error } = await supabase.from("fotos_inspecao").delete().eq("id", existente.id);
      if (error) throw error;
      toast.success(`Foto "${tipo}" removida`);
      refetchFotos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  const triggerInput = (tipo: string) => inputRefs.current[tipo]?.click();

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
      <div className="mb-5 grid grid-cols-2 gap-2">
        {TIPOS.map((t) => {
          const sent = fotoPorTipo.has(t.key);
          const previewUrl = previews[t.key];
          const isUploading = uploadingTipo === t.key;

          return (
            <div
              key={t.key}
              className={`relative flex aspect-square flex-col overflow-hidden rounded-2xl border-2 ${
                sent ? "border-success" : "border-dashed border-border"
              } bg-card`}
            >
              {sent && previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt={`Foto ${t.label}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[11px] font-medium text-success-foreground">
                    <Check className="h-3 w-3" /> {t.label}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 flex-1 px-2 text-xs"
                      disabled={isUploading}
                      onClick={() => triggerInput(t.key)}
                    >
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Trocar
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-8 px-2"
                      disabled={isUploading}
                      onClick={() => remover(t.key)}
                      aria-label={`Remover foto ${t.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerInput(t.key)}
                  disabled={isUploading}
                  className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-sm transition hover:bg-muted/40 disabled:opacity-60"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <Camera className="h-6 w-6 text-primary" />
                  )}
                  <span className="font-medium">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {isUploading ? "Enviando..." : "Toque para capturar"}
                  </span>
                </button>
              )}

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
