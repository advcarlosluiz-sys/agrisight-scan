import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCircle2, ExternalLink, ListChecks, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

type Solic = {
  id: string;
  inspecao_id: string;
  prioridade: "alta" | "media" | "baixa";
  status: "pendente" | "visualizada" | "atendida" | "cancelada";
  observacao: string | null;
  agronomo_nome: string | null;
  problemas: string[];
  acoes: string[];
  created_at: string;
  atendida_em: string | null;
  lida: boolean;
};

const PRIO_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

export const Route = createFileRoute("/_authenticated/solicitacoes")({
  component: SolicitacoesPage,
});

function SolicitacoesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["solicitacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes_agronomo")
        .select(
          "id, inspecao_id, prioridade, status, observacao, agronomo_nome, problemas, acoes, created_at, atendida_em, lida",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Solic[];
    },
  });

  // Marca todas como lidas ao abrir a tela
  useEffect(() => {
    if (!data) return;
    const ids = data.filter((s) => !s.lida).map((s) => s.id);
    if (ids.length === 0) return;
    supabase
      .from("solicitacoes_agronomo")
      .update({ lida: true })
      .in("id", ids)
      .then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: ["solic-pendentes"] });
      });
  }, [data, qc]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("solic-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes_agronomo" },
        () => qc.invalidateQueries({ queryKey: ["solicitacoes"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Solic["status"] }) => {
      const patch =
        status === "atendida"
          ? { status, atendida_em: new Date().toISOString() }
          : { status };
      const { error } = await supabase
        .from("solicitacoes_agronomo")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["solic-pendentes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const ordered = useMemo(() => {
    if (!data) return [] as Solic[];
    const open = data.filter((s) => s.status === "pendente" || s.status === "visualizada");
    const closed = data.filter((s) => s.status === "atendida" || s.status === "cancelada");
    open.sort((a, b) => {
      const pa = PRIO_ORDER[a.prioridade] ?? 9;
      const pb = PRIO_ORDER[b.prioridade] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.created_at.localeCompare(a.created_at);
    });
    return [...open, ...closed];
  }, [data]);

  return (
    <AppShell title="Solicitações de agrônomo" back="/">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Bell className="h-3.5 w-3.5" />
        <span>Pedidos abertos a partir das análises de IA.</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-center">
          <UserCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Nenhuma solicitação ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Abra uma análise de IA e clique em <b>Solicitar agrônomo</b> para registrar um pedido.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordered.map((s) => {
            const aberto = s.status === "pendente" || s.status === "visualizada";
            return (
              <div
                key={s.id}
                className={`rounded-2xl border bg-card p-4 shadow-card ${aberto ? "" : "opacity-70"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PrioBadge prioridade={s.prioridade} />
                    <StatusBadge status={s.status} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>

                {s.agronomo_nome ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Direcionado para <span className="font-medium text-foreground">{s.agronomo_nome}</span>
                  </p>
                ) : null}

                {(s.problemas?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Problemas detectados
                    </p>
                    <ul className="ml-4 mt-1 list-disc text-sm">
                      {s.problemas.slice(0, 4).map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(s.acoes?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground">
                      <ListChecks className="h-3 w-3" /> Tarefas recomendadas
                    </p>
                    <ul className="ml-4 mt-1 list-disc text-sm">
                      {s.acoes.slice(0, 5).map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {s.observacao ? (
                  <p className="mt-3 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                    {s.observacao}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/inspecao/$id/resultado" params={{ id: s.inspecao_id }}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Ver inspeção
                    </Link>
                  </Button>
                  {aberto && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setStatus.mutate({ id: s.id, status: "atendida" })}
                        disabled={setStatus.isPending}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Marcar como atendida
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus.mutate({ id: s.id, status: "cancelada" })}
                        disabled={setStatus.isPending}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function PrioBadge({ prioridade }: { prioridade: Solic["prioridade"] }) {
  const cls =
    prioridade === "alta"
      ? "bg-destructive/15 text-destructive"
      : prioridade === "media"
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
      {prioridade}
    </span>
  );
}

function StatusBadge({ status }: { status: Solic["status"] }) {
  const map: Record<Solic["status"], string> = {
    pendente: "bg-primary/15 text-primary",
    visualizada: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    atendida: "bg-success/15 text-success",
    cancelada: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status]}`}>
      {status}
    </span>
  );
}
