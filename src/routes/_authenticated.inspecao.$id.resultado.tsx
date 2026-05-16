import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useRedirectIfAnalisando } from "@/components/status-processo-badge";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, BellPlus, CheckCircle2, Circle, FileText, ListChecks, RefreshCw, Sparkles, UserCheck } from "lucide-react";
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

type TipoFoto = "geral" | "plantas" | "folhas" | "frutos" | "solo" | "plastico";
const TIPOS_FOTO: { key: TipoFoto; label: string }[] = [
  { key: "geral", label: "Geral" },
  { key: "plantas", label: "Plantas" },
  { key: "folhas", label: "Folhas" },
  { key: "frutos", label: "Frutos" },
  { key: "solo", label: "Solo" },
  { key: "plastico", label: "Plástico/Túnel" },
];
const FOTOS_RECOMENDADO = 3;
const TIPOS_RECOMENDADO = 2;

export const Route = createFileRoute("/_authenticated/inspecao/$id/resultado")({
  component: ResultadoPage,
});

function ResultadoPage() {
  const { id } = useParams({ from: "/_authenticated/inspecao/$id/resultado" });
  useRedirectIfAnalisando(id);
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

  // Resumo das fotos enviadas para esta inspeção — usado para mostrar quantas
  // a IA analisou (total - falhadas) e quais tipos de cobertura ainda faltam.
  const { data: fotosResumo } = useQuery({
    queryKey: ["fotos-resumo", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fotos_inspecao")
        .select("tipo_foto")
        .eq("inspecao_id", id);
      const rows = (data ?? []) as { tipo_foto: TipoFoto }[];
      return {
        total: rows.length,
        tipos: new Set(rows.map((r) => r.tipo_foto)),
      };
    },
  });
  const totalFotos = fotosResumo?.total ?? 0;

  // Histórico de tentativas de análise (sucessos, falhas e fallbacks)
  // — usado para diagnosticar instabilidade da IA ao longo do tempo.
  const { data: tentativasIA } = useQuery({
    queryKey: ["tentativas-analise-ia", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tentativas_analise_ia")
        .select(
          "id, tentativa, sucesso, degradado, degradado_codigo, degradado_detalhe, http_status, duracao_ms, erro_mensagem, created_at",
        )
        .eq("inspecao_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
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
        {a.modelo_ia && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Analisado por <span className="font-mono font-medium text-foreground">{a.modelo_ia}</span>
            {a.created_at ? ` · ${new Date(a.created_at).toLocaleString("pt-BR")}` : ""}
          </p>
        )}
        {(() => {
          const rc = (a.resposta_completa ?? {}) as {
            _degradado?: string | null;
            _degradado_codigo?: string | null;
            _degradado_detalhe?: string | null;
            _fotos_falhadas?: number;
          };
          const degradado = rc._degradado ?? null;
          const degradadoCodigo = rc._degradado_codigo ?? null;
          const degradadoDetalhe = rc._degradado_detalhe ?? null;
          const falhadas = typeof rc._fotos_falhadas === "number" ? rc._fotos_falhadas : 0;
          const total = totalFotos ?? 0;
          const usadas = Math.max(0, total - falhadas);
          const precisaReanalisar = Boolean(degradado) || falhadas > 0;
          return (
            <>
              {degradado && (
                <div
                  role="status"
                  className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[12px] text-amber-900 dark:text-amber-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      Análise gerada com fallback
                      {degradadoCodigo && (
                        <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide">
                          {degradadoCodigo}
                        </span>
                      )}
                    </p>
                    <p className="opacity-80">Motivo: {degradado}. Recomenda-se reanalisar.</p>
                    {degradadoDetalhe && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] opacity-70 hover:opacity-100">
                          Detalhes técnicos
                        </summary>
                        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-amber-500/10 p-2 text-[10px] leading-snug">
{degradadoDetalhe}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
              {total > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Fotos analisadas: <span className="font-medium text-foreground">{usadas} de {total}</span>
                  {falhadas > 0 && (
                    <span className="text-destructive"> · {falhadas} {falhadas === 1 ? "falhou" : "falharam"}</span>
                  )}
                </p>
              )}
              {(() => {
                const tipos = fotosResumo?.tipos ?? new Set<TipoFoto>();
                const tiposDistintos = tipos.size;
                const faltamFotos = total < FOTOS_RECOMENDADO;
                const faltamTipos = tiposDistintos < TIPOS_RECOMENDADO;
                const insuficiente = faltamFotos || faltamTipos;
                if (!insuficiente) return null;
                return (
                  <div
                    role="status"
                    className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[12px] text-amber-900 dark:text-amber-200"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-medium">Cobertura de fotos insuficiente</p>
                        <p className="opacity-80">
                          Recomendamos pelo menos {FOTOS_RECOMENDADO} fotos cobrindo{" "}
                          {TIPOS_RECOMENDADO} tipos diferentes. A precisão da IA pode estar limitada.
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide opacity-70">
                      Tipos de foto
                    </p>
                    <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1" aria-label="Checklist de tipos de foto">
                      {TIPOS_FOTO.map((t) => {
                        const ok = tipos.has(t.key);
                        return (
                          <li
                            key={t.key}
                            className={`flex items-center gap-1.5 text-[12px] ${ok ? "" : "opacity-70"}`}
                          >
                            {ok ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            )}
                            <span className={ok ? "line-through opacity-70" : "font-medium"}>{t.label}</span>
                            <span className="sr-only">{ok ? " (enviado)" : " (faltando)"}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-[11px] opacity-80">
                      {faltamFotos && (
                        <>
                          Faltam{" "}
                          <span className="font-medium">
                            {Math.max(0, FOTOS_RECOMENDADO - total)} foto
                            {FOTOS_RECOMENDADO - total === 1 ? "" : "s"}
                          </span>
                          .{" "}
                        </>
                      )}
                      {faltamTipos && (
                        <>
                          Cobrir mais{" "}
                          <span className="font-medium">
                            {Math.max(0, TIPOS_RECOMENDADO - tiposDistintos)} tipo
                            {TIPOS_RECOMENDADO - tiposDistintos === 1 ? "" : "s"}
                          </span>{" "}
                          diferente{TIPOS_RECOMENDADO - tiposDistintos === 1 ? "" : "s"}.
                        </>
                      )}
                    </p>
                  </div>
                );
              })()}
              {precisaReanalisar && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={reanalisar}
                  disabled={reanalisando}
                  className="mt-3 w-full"
                  aria-label={
                    degradado
                      ? "Reanalisar inspeção com a IA — análise anterior gerada por fallback"
                      : `Reanalisar inspeção com a IA — ${falhadas} ${falhadas === 1 ? "foto falhou" : "fotos falharam"}`
                  }
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${reanalisando ? "animate-spin" : ""}`} aria-hidden="true" />
                  {reanalisando ? "Reiniciando…" : "Reanalisar com IA"}
                </Button>
              )}
            </>
          );
        })()}
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

      <SolicitacaoAgronomo inspecaoId={id} analise={a} />



      {a.justificativa && (
        <div className="mt-4 rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {a.justificativa}
        </div>
      )}

      <div className="mt-6 rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <RefreshCw className="h-4 w-4 text-primary" /> Reanalisar com IA
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Atualize o diagnóstico depois de adicionar novas fotos ou ajustar as observações.
        </p>
        <Button
          className="h-11 w-full"
          onClick={reanalisar}
          disabled={reanalisando}
        >
          <Sparkles className={`mr-2 h-4 w-4 ${reanalisando ? "animate-spin" : ""}`} />
          {reanalisando ? "Reiniciando..." : "Reanalisar agora (mesmas fotos)"}
        </Button>
        <Button
          asChild
          variant="outline"
          className="mt-2 h-11 w-full"
          disabled={reanalisando}
        >
          <Link to="/inspecao/$id/observacoes" params={{ id }}>
            Editar fotos e observações
          </Link>
        </Button>
      </div>

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

function SolicitacaoAgronomo({ inspecaoId, analise }: { inspecaoId: string; analise: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: perfil } = useQuery({
    queryKey: ["perfil-org-agronomo", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("perfis")
          .select("organizacao_id, organizacao:organizacao_id(id, agronomo_nome, agronomo_email, agronomo_telefone)")
          .eq("id", user!.id)
          .single()
      ).data as any,
  });
  const org = perfil?.organizacao;
  const orgId = perfil?.organizacao_id;

  const { data: existente } = useQuery({
    queryKey: ["solic-da-inspecao", inspecaoId],
    queryFn: async () =>
      (
        await supabase
          .from("solicitacoes_agronomo")
          .select("id, status, prioridade, created_at, agronomo_nome, atendida_em")
          .eq("inspecao_id", inspecaoId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data as any,
  });

  const [aberto, setAberto] = useState(false);
  const [prio, setPrio] = useState<"alta" | "media" | "baixa">(
    (analise?.prioridade as any) ?? (analise?.risco === "alto" ? "alta" : analise?.risco === "medio" ? "media" : "media"),
  );
  const [obs, setObs] = useState("");

  const criar = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Organização não carregada");
      const { data, error } = await supabase
        .from("solicitacoes_agronomo")
        .insert({
          organizacao_id: orgId,
          inspecao_id: inspecaoId,
          analise_id: analise?.id ?? null,
          prioridade: prio,
          observacao: obs.trim() || null,
          problemas: analise?.problemas_detectados ?? [],
          acoes: analise?.acoes_recomendadas ?? [],
          agronomo_nome: org?.agronomo_nome ?? null,
          agronomo_email: org?.agronomo_email ?? null,
          agronomo_telefone: org?.agronomo_telefone ?? null,
          criado_por: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(
        org?.agronomo_nome
          ? `Solicitação enviada para ${org.agronomo_nome}`
          : "Solicitação registrada",
      );
      setAberto(false);
      setObs("");
      qc.invalidateQueries({ queryKey: ["solic-da-inspecao", inspecaoId] });
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["solic-pendentes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao registrar"),
  });

  const necessidade = !!analise?.necessidade_agronomo;
  const jaAberta = existente && (existente.status === "pendente" || existente.status === "visualizada");

  return (
    <div className="mt-4 rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <UserCheck className="h-4 w-4 text-primary" /> Necessidade de agrônomo
      </div>
      <p className="text-sm">
        {necessidade ? "Sim — recomendamos visita técnica." : "Não há indicação automática, mas você pode solicitar."}
      </p>

      {existente && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
          <p className="font-medium">
            Última solicitação: <span className="capitalize">{existente.status}</span>{" "}
            <span className="rounded-full bg-background px-2 py-0.5 uppercase">{existente.prioridade}</span>
          </p>
          <p className="text-muted-foreground">
            {new Date(existente.created_at).toLocaleString("pt-BR")}
            {existente.agronomo_nome ? ` · para ${existente.agronomo_nome}` : ""}
          </p>
          <Link to="/solicitacoes" className="mt-1 inline-block text-primary underline">
            Ver na central de solicitações
          </Link>
        </div>
      )}

      {!org?.agronomo_nome && (
        <p className="mt-3 rounded-lg bg-yellow-500/10 p-2 text-[11px] text-yellow-800 dark:text-yellow-300">
          Cadastre o agrônomo padrão em <Link to="/configuracoes" className="underline">Configurações</Link> para
          direcionar automaticamente as solicitações.
        </p>
      )}

      {!aberto ? (
        <Button
          className="mt-3 w-full"
          variant={jaAberta ? "outline" : "default"}
          onClick={() => setAberto(true)}
        >
          {jaAberta ? (
            <><CheckCircle2 className="mr-2 h-4 w-4" /> Abrir nova solicitação</>
          ) : (
            <><BellPlus className="mr-2 h-4 w-4" /> Solicitar agrônomo</>
          )}
        </Button>
      ) : (
        <div className="mt-3 space-y-3 rounded-lg border bg-background/60 p-3">
          <div>
            <label className="text-xs font-medium">Prioridade</label>
            <Select value={prio} onValueChange={(v) => setPrio(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Observação (opcional)</label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Detalhes para o agrônomo..."
              rows={3}
              maxLength={500}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAberto(false)} disabled={criar.isPending}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={() => criar.mutate()} disabled={criar.isPending || !orgId}>
              {criar.isPending ? "Enviando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
