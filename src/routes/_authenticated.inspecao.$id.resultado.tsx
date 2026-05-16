import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, FileText, ListChecks, RefreshCw, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: "alta" | "media" | "baixa";
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
  prazo: string | null;
};

const PRIO_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

export const Route = createFileRoute("/_authenticated/inspecao/$id/resultado")({
  component: ResultadoPage,
});

function ResultadoPage() {
  const { id } = useParams({ from: "/_authenticated/inspecao/$id/resultado" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reanalisando, setReanalisando] = useState(false);

  const reanalisar = async () => {
    setReanalisando(true);
    try {
      const { error } = await supabase
        .from("inspecoes")
        .update({ status_processo: "em_andamento" })
        .eq("id", id);
      if (error) throw error;
      toast.info("Reanalisando inspeção...");
      navigate({ to: "/inspecao/$id/analisando", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar reanálise");
      setReanalisando(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["analise", id],
    queryFn: async () =>
      (
        await supabase
          .from("analises_ia")
          .select("*")
          .eq("inspecao_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data,
  });

  const tarefasQK = ["tarefas-inspecao", id] as const;
  const { data: tarefas, isLoading: tarefasLoading } = useQuery({
    queryKey: tarefasQK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas_recomendadas")
        .select("id, titulo, descricao, prioridade, status, prazo, created_at")
        .eq("inspecao_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as (Tarefa & { created_at: string })[];
      return rows.sort((a, b) => {
        const pa = PRIO_ORDER[a.prioridade] ?? 99;
        const pb = PRIO_ORDER[b.prioridade] ?? 99;
        if (pa !== pb) return pa - pb;
        return a.created_at.localeCompare(b.created_at);
      });
    },
  });

  const toggleTarefa = useMutation({
    mutationFn: async ({ id: tid, concluida }: { id: string; concluida: boolean }) => {
      const { error } = await supabase
        .from("tarefas_recomendadas")
        .update({ status: concluida ? "concluida" : "pendente" })
        .eq("id", tid);
      if (error) throw error;
    },
    onMutate: async ({ id: tid, concluida }) => {
      await queryClient.cancelQueries({ queryKey: tarefasQK });
      const prev = queryClient.getQueryData<Tarefa[]>(tarefasQK);
      queryClient.setQueryData<Tarefa[]>(tarefasQK, (old) =>
        (old ?? []).map((t) => (t.id === tid ? { ...t, status: concluida ? "concluida" : "pendente" } : t)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(tarefasQK, ctx.prev);
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar tarefa");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: tarefasQK }),
  });

  if (isLoading) return <AppShell title="Resultado IA" back="/"><p>Carregando...</p></AppShell>;
  if (!data) return <AppShell title="Resultado IA" back="/"><p className="text-muted-foreground">Sem análise disponível.</p></AppShell>;

  const a = data as any;
  return (
    <AppShell title="Resultado da IA" back="/">
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Status geral</p>
            <div className="mt-1"><StatusPill status={a.status_geral} /></div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted-foreground">Confiança</p>
            <p className="text-lg font-semibold">{Math.round((a.confianca ?? 0) * 100)}%</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Info label="Risco">{a.risco}</Info>
          <Info label="Prioridade">{a.prioridade}</Info>
        </div>
      </div>

      <Section icon={AlertTriangle} title="Problemas detectados">
        {(a.problemas_detectados ?? []).length === 0 ? (
          <Empty>Nenhum problema crítico</Empty>
        ) : (
          <ul className="ml-5 list-disc space-y-1 text-sm">
            {a.problemas_detectados.map((p: string, i: number) => <li key={i}>{p}</li>)}
          </ul>
        )}
      </Section>

      <Section icon={Sparkles} title="Hipóteses agronômicas">
        {(a.hipoteses_agronomicas ?? []).length === 0 ? <Empty>—</Empty> : (
          <ul className="ml-5 list-disc space-y-1 text-sm">
            {a.hipoteses_agronomicas.map((p: string, i: number) => <li key={i}>{p}</li>)}
          </ul>
        )}
      </Section>

      <Section icon={FileText} title="Ações recomendadas">
        {(a.acoes_recomendadas ?? []).length === 0 ? <Empty>—</Empty> : (
          <ul className="ml-5 list-disc space-y-1 text-sm">
            {a.acoes_recomendadas.map((p: string, i: number) => <li key={i}>{p}</li>)}
          </ul>
        )}
      </Section>

      <Section icon={ListChecks} title="Tarefas recomendadas">
        {tarefasLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        ) : !tarefas || tarefas.length === 0 ? (
          <Empty>Nenhuma tarefa gerada para esta inspeção.</Empty>
        ) : (
          <div className="space-y-2">
            {tarefas.map((t) => {
              const concluida = t.status === "concluida";
              return (
                <label
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg border bg-background/60 p-3 active:bg-muted"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={concluida}
                    disabled={toggleTarefa.isPending}
                    onCheckedChange={(v) => toggleTarefa.mutate({ id: t.id, concluida: !!v })}
                  />
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm font-medium ${concluida ? "text-muted-foreground line-through" : ""}`}>
                      {t.titulo}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          t.prioridade === "alta"
                            ? "bg-destructive/15 text-destructive"
                            : t.prioridade === "media"
                            ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t.prioridade}
                      </span>
                      {t.prazo ? (
                        <span className="text-muted-foreground">
                          prazo: {new Date(t.prazo).toLocaleDateString("pt-BR")}
                        </span>
                      ) : null}
                    </div>
                    {t.descricao ? (
                      <p className="text-xs text-muted-foreground">{t.descricao}</p>
                    ) : null}
                  </div>
                </label>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">
              {tarefas.filter((t) => t.status === "concluida").length} de {tarefas.length} concluídas
            </p>
          </div>
        )}
      </Section>

      <Section icon={UserCheck} title="Necessidade de agrônomo">
        <p className="text-sm font-medium">{a.necessidade_agronomo ? "Sim — recomendamos visita técnica" : "Não — manejo padrão"}</p>
      </Section>


      {a.justificativa && (
        <div className="mt-4 rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {a.justificativa}
        </div>
      )}

      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={reanalisar}
        disabled={reanalisando}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${reanalisando ? "animate-spin" : ""}`} />
        {reanalisando ? "Reiniciando..." : "Reanalisar com IA (reaproveita as fotos)"}
      </Button>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button asChild variant="secondary"><Link to="/">Início</Link></Button>
        <Button asChild><Link to="/relatorio/$id" params={{ id }}>Ver Relatório</Link></Button>
      </div>
    </AppShell>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {children}
    </div>
  );
}
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-lg bg-muted/40 p-2"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium capitalize">{children}</p></div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
