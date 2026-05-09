import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inspecao/$id/analisando")({
  component: AnalisandoPage,
});

const ETAPAS = [
  "Carregando dados da inspeção...",
  "Buscando fotos no armazenamento...",
  "Enviando imagens para a IA...",
  "Analisando padrões agronômicos...",
  "Gerando diagnóstico e tarefas...",
];

function AnalisandoPage() {
  const { id } = useParams({ from: "/_authenticated/inspecao/$id/analisando" });
  const navigate = useNavigate();
  const [progresso, setProgresso] = useState(8);
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const tickProg = setInterval(() => {
      setProgresso((p) => (p < 92 ? p + Math.max(1, Math.round((95 - p) / 18)) : p));
    }, 400);
    const tickEtapa = setInterval(() => {
      setEtapa((e) => (e < ETAPAS.length - 1 ? e + 1 : e));
    }, 1800);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("analisar-inspecao", {
          body: { inspecao_id: id },
        });
        if (error) throw error;
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        setProgresso(100);
        setEtapa(ETAPAS.length - 1);
        toast.success("Análise concluída");
        setTimeout(() => navigate({ to: "/inspecao/$id/resultado", params: { id } }), 350);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro na análise");
      } finally {
        clearInterval(tickProg);
        clearInterval(tickEtapa);
      }
    })();

    return () => {
      clearInterval(tickProg);
      clearInterval(tickEtapa);
    };
  }, [id, navigate]);

  return (
    <AppShell title="Analisando" back={false}>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-2 text-center">
        {!erro ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Analisando com IA</h2>
              <p className="text-sm text-muted-foreground">
                Isso pode levar alguns segundos.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <Progress value={progresso} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{ETAPAS[etapa]}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Falha na análise</h2>
              <p className="max-w-sm text-sm text-muted-foreground">{erro}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/inspecao/$id/observacoes", params: { id } })}
              >
                Voltar
              </Button>
              <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
