import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Camera, AlertTriangle, Info, XCircle } from "lucide-react";
import { StatusProcessoBadge, useStatusProcesso, useRedirectIfAnalisando } from "@/components/status-processo-badge";
import { useInspecaoFotos } from "@/lib/use-inspecao-fotos";
import { useOnlineStatus } from "@/lib/use-online";

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
  const [canceladaEm, setCanceladaEm] = useState<Date | null>(null);
  const lockRef = useRef(false);
  const statusProcesso = useStatusProcesso(id);
  useRedirectIfAnalisando(id);
  const online = useOnlineStatus();
  const fotosInfo = useInspecaoFotos(id);
  const validacao = fotosInfo.validar(online);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`analise-cancelada:${id}`);
      if (v) {
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) setCanceladaEm(d);
      }
    } catch {
      // ignora
    }
  }, [id]);

  const dispensarAviso = () => {
    try {
      localStorage.removeItem(`analise-cancelada:${id}`);
    } catch {
      // ignora
    }
    setCanceladaEm(null);
  };

  const analisar = async () => {
    if (lockRef.current || busy) return;
    // Revalida no momento do clique
    await fotosInfo.refetch();
    const v = fotosInfo.validar(online);
    if (!v.ok) {
      toast.error(v.mensagem ?? "Não é possível analisar agora");
      return;
    }
    lockRef.current = true;
    setBusy(true);
    try {
      const updates: Record<string, boolean | string | null> = { observacao_manual: nota };
      OBS.forEach(([k]) => (updates[k] = !!marcado[k]));
      const { error: uErr } = await supabase
        .from("inspecoes")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ ...updates, status_processo: "analisando" } as any)
        .eq("id", id);
      if (uErr) throw uErr;

      try {
        localStorage.removeItem(`analise-cancelada:${id}`);
      } catch {
        // ignora
      }
      navigate({ to: "/inspecao/$id/analisando", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
      lockRef.current = false;
      setBusy(false);
    }
  };

  return (
    <AppShell title="Observações" back={true}>
      <div className="mb-3 flex items-center justify-between rounded-xl border bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">Status da inspeção</span>
        <StatusProcessoBadge status={statusProcesso} />
      </div>
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

      {/* Card de status de fotos */}
      <div
        className={`mt-4 rounded-2xl border p-4 ${
          validacao.nivel === "bloqueio"
            ? "border-destructive/40 bg-destructive/10"
            : validacao.nivel === "aviso"
            ? "border-yellow-500/40 bg-yellow-500/10"
            : "border-border bg-card"
        }`}
      >
        <div className="flex items-start gap-2">
          {validacao.nivel === "bloqueio" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          ) : validacao.nivel === "aviso" ? (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          ) : (
            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex-1 space-y-1 text-sm">
            <div className="font-medium">
              Fotos: {fotosInfo.total} enviada{fotosInfo.total === 1 ? "" : "s"} ·{" "}
              {fotosInfo.tiposDistintos} tipo{fotosInfo.tiposDistintos === 1 ? "" : "s"}
              {fotosInfo.pendentes > 0 ? ` · ${fotosInfo.pendentes} pendente${fotosInfo.pendentes > 1 ? "s" : ""}` : ""}
            </div>
            {validacao.mensagem ? (
              <p className="text-xs text-muted-foreground">{validacao.mensagem}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Tudo certo para a análise multimodal.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.history.back()}
              >
                <Camera className="mr-1 h-3 w-3" /> Voltar e adicionar fotos
              </Button>
              {validacao.acao === "sincronizar" ? (
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/sincronizacao" })}>
                  Ir para Sincronização
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Button
        className="mt-4 h-12 w-full text-base"
        onClick={analisar}
        disabled={busy || fotosInfo.loading || !validacao.ok}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Salvar e Analisar com IA
      </Button>
    </AppShell>
  );
}
