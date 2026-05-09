import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Check, Loader2 } from "lucide-react";

const TIPOS = [
  { key: "geral", label: "Geral" },
  { key: "plantas", label: "Plantas" },
  { key: "folhas", label: "Folhas" },
  { key: "frutos", label: "Frutos" },
  { key: "solo", label: "Solo" },
  { key: "plastico", label: "Plástico/Túnel" },
] as const;

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
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: setor } = useQuery({
    queryKey: ["setor", sid],
    queryFn: async () => (await supabase.from("setores").select("codigo").eq("id", sid).single()).data,
  });

  const { data: fotos, refetch: refetchFotos } = useQuery({
    queryKey: ["fotos", id],
    queryFn: async () =>
      (await supabase.from("fotos_inspecao").select("tipo_foto, storage_path").eq("inspecao_id", id)).data ?? [],
  });

  const upload = async (tipo: string, file: File) => {
    try {
      const orgRes = await supabase.rpc("current_org_id");
      const path = `${orgRes.data}/${id}/${tipo}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("inspection-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      await supabase.from("fotos_inspecao").insert({
        organizacao_id: orgRes.data!,
        inspecao_id: id,
        tipo_foto: tipo as any,
        storage_path: path,
      });
      toast.success(`Foto "${tipo}" enviada`);
      refetchFotos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

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

  const tiposComFoto = new Set((fotos ?? []).map((f) => f.tipo_foto));

  return (
    <AppShell title="Coleta de Dados" back={`/inspecao/${id}/qr`}>
      <div className="mb-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-card">
        <p className="text-xs uppercase opacity-80">Setor atual</p>
        <p className="text-2xl font-bold">{setor?.codigo ?? "..."}</p>
      </div>

      <h3 className="mb-2 text-sm font-semibold">Fotos</h3>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {TIPOS.map((t) => {
          const sent = tiposComFoto.has(t.key);
          return (
            <label
              key={t.key}
              className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-2 text-center text-sm transition ${sent ? "border-success bg-success/10" : "border-border bg-card hover:border-primary/40"}`}
            >
              {sent ? <Check className="h-6 w-6 text-success" /> : <Camera className="h-6 w-6 text-primary" />}
              <span className="font-medium">{t.label}</span>
              <input
                ref={(el) => { inputRefs.current[t.key] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(t.key, f);
                }}
              />
            </label>
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
