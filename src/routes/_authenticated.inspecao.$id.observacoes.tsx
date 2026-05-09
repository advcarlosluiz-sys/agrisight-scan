import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

const OBS = [
  ["mato_alto", "Mato alto"],
  ["plastico_rasgado", "Plástico rasgado/danificado"],
  ["poucos_frutos", "Poucos frutos"],
  ["plantas_fracas", "Plantas fracas"],
  ["frutos_maduros", "Frutos maduros"],
  ["pragas_visiveis", "Pragas visíveis"],
  ["folhas_manchadas", "Folhas manchadas"],
  ["solo_seco", "Solo seco"],
  ["solo_encharcado", "Solo encharcado"],
] as const;

export const Route = createFileRoute("/_authenticated/inspecao/$id/observacoes")({
  component: ObsPage,
});

function ObsPage() {
  const { id } = useParams({ from: "/_authenticated/inspecao/$id/observacoes" });
  const navigate = useNavigate();
  const [marcado, setMarcado] = useState<Record<string, boolean>>({});
  const [nota, setNota] = useState("");
  const [outros, setOutros] = useState(false);
  const [busy, setBusy] = useState(false);

  const analisar = async () => {
    setBusy(true);
    try {
      const updates: Record<string, boolean | string | null> = { observacao_manual: nota };
      OBS.forEach(([k]) => (updates[k] = !!marcado[k]));
      const { error: uErr } = await supabase
        .from("inspecoes")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updates as any)
        .eq("id", id);
      if (uErr) throw uErr;

      navigate({ to: "/inspecao/$id/analisando", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
      setBusy(false);
    }
  };

  return (
    <AppShell title="Observações" back={true}>
      <div className="space-y-2 rounded-2xl border bg-card p-4">
        {OBS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-3 rounded-lg p-2 active:bg-muted">
            <Checkbox
              checked={!!marcado[k]}
              onCheckedChange={(v) => setMarcado((prev) => ({ ...prev, [k]: !!v }))}
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
        <label className="flex items-center gap-3 rounded-lg p-2 active:bg-muted">
          <Checkbox checked={outros} onCheckedChange={(v) => setOutros(!!v)} />
          <span className="text-sm">Outros</span>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        <Label>Observação livre</Label>
        <Textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={4}
          placeholder="Descreva detalhes adicionais..."
        />
      </div>

      <Button className="mt-6 h-12 w-full text-base" onClick={analisar} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Salvar e Analisar com IA
      </Button>
    </AppShell>
  );
}
