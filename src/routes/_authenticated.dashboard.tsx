import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { CopyFilterLinkButton } from "@/components/copy-filter-link-button";
import { StatusPill, STATUS_DOT } from "@/components/status-pill";
import { StatusProcessoBadge, type StatusProcesso } from "@/components/status-processo-badge";
import { AcoesPorStatus } from "@/components/acoes-por-status";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedFilter } from "@/hooks/use-persisted-filter";
import { cn } from "@/lib/utils";

type Filtro = "todos" | StatusProcesso;

const dashboardSearchSchema = z.object({
  filtro: fallback(
    z.enum(["todos", "em_andamento", "analisando", "concluida", "cancelada"]),
    "todos",
  ).default("todos"),
  q: fallback(z.string(), "").default(""),
  ordem: fallback(
    z.enum(["recentes", "antigos", "criadas"]),
    "recentes",
  ).default("recentes"),
});

type Ordem = "recentes" | "antigos" | "criadas";
const ORDEM_CONFIG: Record<Ordem, { coluna: "data_inspecao" | "created_at"; ascending: boolean; label: string }> = {
  recentes: { coluna: "data_inspecao", ascending: false, label: "Mais recentes" },
  antigos: { coluna: "data_inspecao", ascending: true, label: "Mais antigas" },
  criadas: { coluna: "created_at", ascending: false, label: "Criadas recentemente" },
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: zodValidator(dashboardSearchSchema),
  component: Dashboard,
});
const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todas" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "analisando", label: "Analisando" },
  { id: "concluida", label: "Concluídas" },
  { id: "cancelada", label: "Canceladas" },
];

function Dashboard() {
  const { filtro, q, ordem } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard" });
  usePersistedFilter("dashboard:filtro", filtro, "todos", "/dashboard");
  type DashSearch = { filtro: Filtro; q: string; ordem: Ordem };
  const setFiltro = (f: Filtro) =>
    navigate({ search: (prev: DashSearch) => ({ ...prev, filtro: f }), replace: true });
  const setQ = (v: string) =>
    navigate({ search: (prev: DashSearch) => ({ ...prev, q: v }), replace: true });
  const setOrdem = (o: Ordem) =>
    navigate({ search: (prev: DashSearch) => ({ ...prev, ordem: o }), replace: true });
  const PAGE_SIZE = 10;
  const ordemCfg = ORDEM_CONFIG[ordem as Ordem];
  const {
    data: inspecoesPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingInspecoes,
  } = useInfiniteQuery({
    queryKey: ["dash-inspecoes", ordem],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data } = await supabase
        .from("inspecoes")
        .select(
          "id, status_geral, status_processo, data_inspecao, setor:setor_id(codigo), canteiro:canteiro_id(nome), propriedade:propriedade_id(nome, produtor:produtor_id(nome))",
        )
        .order(ordemCfg.coluna, { ascending: ordemCfg.ascending })
        .range(from, to);
      return data ?? [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
  });
  const inspecoes = (inspecoesPages?.pages ?? []).flat();
  // Contagem agregada por status_processo considerando TODAS as inspeções
  // da organização (RLS já restringe), não apenas as últimas 20.
  const { data: statusTotais } = useQuery({
    queryKey: ["dash-inspecoes-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspecoes")
        .select("status_processo");
      return (data ?? []) as { status_processo: StatusProcesso }[];
    },
  });
  const { data: setores } = useQuery({
    queryKey: ["dash-setores"],
    queryFn: async () =>
      (await supabase.from("setores").select("id, codigo, status_atual, canteiro:canteiro_id(nome)").order("codigo")).data ?? [],
  });
  const { data: tarefas } = useQuery({
    queryKey: ["dash-tarefas"],
    queryFn: async () =>
      (await supabase.from("tarefas_recomendadas").select("id, titulo, prioridade, status, inspecao_id, inspecao:inspecao_id(status_processo)").eq("status", "pendente")).data ?? [],
  });
  const tarefasFiltradas = (tarefas ?? []).filter((t: any) =>
    filtro === "todos" ? true : t.inspecao?.status_processo === filtro,
  ).slice(0, 5);

  const total = inspecoes?.length ?? 0;
  const cnt = (s: string) => inspecoes?.filter((i: any) => i.status_geral === s).length ?? 0;
  const cntProc = (f: Filtro) =>
    f === "todos"
      ? statusTotais?.length ?? 0
      : (statusTotais ?? []).filter((i) => i.status_processo === f).length;
  const termo = q.trim().toLowerCase();
  const matchBusca = (i: any) => {
    if (!termo) return true;
    const alvo = [
      i.canteiro?.nome,
      i.propriedade?.nome,
      i.propriedade?.produtor?.nome,
      i.setor?.codigo,
    ].filter(Boolean).join(" ").toLowerCase();
    return alvo.includes(termo);
  };
  const inspecoesBusca = (inspecoes ?? []).filter(matchBusca);
  const inspecoesFiltradas =
    filtro === "todos" ? inspecoesBusca : inspecoesBusca.filter((i: any) => i.status_processo === filtro);

  return (
    <AppShell title="Dashboard" back="/">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar por produtor, propriedade ou canteiro"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <CopyFilterLinkButton />
      </div>
      <div className="mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Status do processo
        </h3>
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <KpiProc label="Todos" value={cntProc("todos")} ativo={filtro === "todos"} onClick={() => setFiltro("todos")} tone="neutral" />
        <KpiProc label="Em andamento" value={cntProc("em_andamento")} ativo={filtro === "em_andamento"} onClick={() => setFiltro("em_andamento")} tone="muted" />
        <KpiProc label="Analisando" value={cntProc("analisando")} ativo={filtro === "analisando"} onClick={() => setFiltro("analisando")} tone="primary" />
        <KpiProc label="Concluídas" value={cntProc("concluida")} ativo={filtro === "concluida"} onClick={() => setFiltro("concluida")} tone="success" />
        <KpiProc label="Canceladas" value={cntProc("cancelada")} ativo={filtro === "cancelada"} onClick={() => setFiltro("cancelada")} tone="destructive" />
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Diagnóstico
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Total de inspeções" value={total} tone="primary" />
        <Kpi label="Críticos" value={cnt("critico")} tone="destructive" />
        <Kpi label="Em atenção" value={cnt("atencao")} tone="warning" />
        <Kpi label="Normais" value={cnt("normal")} tone="success" />
      </div>

      <h3 className="mt-5 mb-2 text-sm font-semibold">Mapa do canteiro</h3>
      <div className="rounded-2xl border bg-card p-3 shadow-card">
        <div className="grid grid-cols-5 gap-1.5">
          {setores?.slice(0, 25).map((s: any) => (
            <div key={s.id} className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold text-white ${STATUS_DOT[s.status_atual] ?? "bg-muted text-muted-foreground"}`}>
              {s.codigo}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <Legend dot="bg-success" label="Normal" />
          <Legend dot="bg-warning" label="Atenção" />
          <Legend dot="bg-destructive" label="Crítico" />
          <Legend dot="bg-muted" label="Não vistoriado" />
        </div>
      </div>

      <div className="mt-5 mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Últimas inspeções{filtro !== "todos" ? ` · ${FILTROS.find((f) => f.id === filtro)?.label}` : ""}
        </h3>
        <select
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as Ordem)}
          aria-label="Ordenar por"
          className="h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
        >
          {(Object.keys(ORDEM_CONFIG) as Ordem[]).map((o) => (
            <option key={o} value={o}>{ORDEM_CONFIG[o].label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {inspecoesFiltradas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma inspeção neste filtro.</p>
        )}
        {inspecoesFiltradas.map((i: any) => (
          <div key={i.id} className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm">Setor {i.setor?.codigo ?? "—"} · {new Date(i.data_inspecao).toLocaleDateString("pt-BR")}</p>
                <div className="mt-1">
                  <StatusProcessoBadge status={i.status_processo} />
                </div>
              </div>
              <StatusPill status={i.status_geral} />
            </div>
            <div className="mt-2 flex justify-end">
              <AcoesPorStatus status={i.status_processo} inspecaoId={i.id} />
            </div>
          </div>
        ))}
      </div>
      <div ref={sentinelaRef} className="mt-3 flex justify-center">
        {hasNextPage ? (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-card active:scale-[0.98] disabled:opacity-60"
          >
            {isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </button>
        ) : (
          !isLoadingInspecoes && inspecoes.length > 0 && (
            <p className="text-xs text-muted-foreground">Fim da lista</p>
          )
        )}
      </div>

      {tarefasFiltradas.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-semibold">
            Tarefas recomendadas{filtro !== "todos" ? ` · ${FILTROS.find((f) => f.id === filtro)?.label}` : ""}
          </h3>
          <div className="space-y-2">
            {tarefasFiltradas.map((t: any) => (
              <div key={t.id} className="rounded-xl border bg-card p-3 text-sm">
                <p className="font-medium">{t.titulo}</p>
                <p className="text-xs capitalize text-muted-foreground">Prioridade: {t.prioridade}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "primary" | "destructive" | "warning" | "success" }) {
  const cls = { primary: "bg-primary text-primary-foreground", destructive: "bg-destructive/10 text-destructive", warning: "bg-warning/15 text-warning-foreground", success: "bg-success/15 text-success" }[tone];
  return (
    <div className={`rounded-2xl p-4 shadow-card ${cls}`}>
      <p className="text-xs uppercase opacity-90">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

type KpiTone = "neutral" | "muted" | "primary" | "success" | "destructive";
function KpiProc({
  label,
  value,
  ativo,
  onClick,
  tone,
}: {
  label: string;
  value: number;
  ativo: boolean;
  onClick: () => void;
  tone: KpiTone;
}) {
  const tones: Record<KpiTone, { idle: string; ativo: string; valor: string }> = {
    neutral: {
      idle: "bg-card",
      ativo: "bg-foreground text-background border-foreground",
      valor: "text-foreground",
    },
    muted: {
      idle: "bg-card",
      ativo: "bg-muted border-foreground/30",
      valor: "text-foreground",
    },
    primary: {
      idle: "bg-card",
      ativo: "bg-primary/15 border-primary",
      valor: "text-primary",
    },
    success: {
      idle: "bg-card",
      ativo: "bg-emerald-500/15 border-emerald-500",
      valor: "text-emerald-600 dark:text-emerald-400",
    },
    destructive: {
      idle: "bg-card",
      ativo: "bg-destructive/15 border-destructive",
      valor: "text-destructive",
    },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      className={`flex min-w-[7.5rem] shrink-0 flex-col items-start gap-0.5 rounded-2xl border p-3 text-left shadow-card transition active:scale-[0.98] ${
        ativo ? t.ativo : `${t.idle} border-border`
      }`}
    >
      <span className={`text-2xl font-bold ${ativo ? "" : t.valor}`}>{value}</span>
      <span className="text-[11px] uppercase tracking-wide opacity-80">{label}</span>
    </button>
  );
}
function Legend({ dot, label }: { dot: string; label: string }) {
  return <span className="flex items-center gap-1"><span className={`h-3 w-3 rounded-sm ${dot}`} />{label}</span>;
}
