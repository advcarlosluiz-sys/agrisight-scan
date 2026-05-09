import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { StatusPill, STATUS_DOT } from "@/components/status-pill";
import { StatusProcessoBadge, type StatusProcesso } from "@/components/status-processo-badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Filtro = "todos" | StatusProcesso;

const dashboardSearchSchema = z.object({
  filtro: fallback(
    z.enum(["todos", "em_andamento", "analisando", "concluida", "cancelada"]),
    "todos",
  ).default("todos"),
});

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
  const { filtro } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard" });
  const setFiltro = (f: Filtro) =>
    navigate({ search: { filtro: f }, replace: true });
  const { data: inspecoes } = useQuery({
    queryKey: ["dash-inspecoes"],
    queryFn: async () =>
      (await supabase.from("inspecoes").select("id, status_geral, status_processo, data_inspecao, setor:setor_id(codigo)").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  const { data: setores } = useQuery({
    queryKey: ["dash-setores"],
    queryFn: async () =>
      (await supabase.from("setores").select("id, codigo, status_atual, canteiro:canteiro_id(nome)").order("codigo")).data ?? [],
  });
  const { data: tarefas } = useQuery({
    queryKey: ["dash-tarefas"],
    queryFn: async () =>
      (await supabase.from("tarefas_recomendadas").select("id, titulo, prioridade, status").eq("status", "pendente").limit(5)).data ?? [],
  });

  const total = inspecoes?.length ?? 0;
  const cnt = (s: string) => inspecoes?.filter((i: any) => i.status_geral === s).length ?? 0;
  const cntProc = (f: Filtro) =>
    f === "todos"
      ? inspecoes?.length ?? 0
      : (inspecoes ?? []).filter((i: any) => i.status_processo === f).length;
  const inspecoesFiltradas =
    filtro === "todos" ? inspecoes ?? [] : (inspecoes ?? []).filter((i: any) => i.status_processo === filtro);

  return (
    <AppShell title="Dashboard" back="/">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Status do processo
      </h3>
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

      <h3 className="mt-5 mb-2 text-sm font-semibold">
        Últimas inspeções{filtro !== "todos" ? ` · ${FILTROS.find((f) => f.id === filtro)?.label}` : ""}
      </h3>
      <div className="space-y-2">
        {inspecoesFiltradas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma inspeção neste filtro.</p>
        )}
        {inspecoesFiltradas.slice(0, 5).map((i: any) => (
          <Link key={i.id} to="/inspecao/$id/resultado" params={{ id: i.id }} className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3">
            <div className="min-w-0">
              <p className="truncate text-sm">Setor {i.setor?.codigo ?? "—"} · {new Date(i.data_inspecao).toLocaleDateString("pt-BR")}</p>
              <div className="mt-1">
                <StatusProcessoBadge status={i.status_processo} />
              </div>
            </div>
            <StatusPill status={i.status_geral} />
          </Link>
        ))}
      </div>

      {tarefas && tarefas.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-semibold">Tarefas recomendadas</h3>
          <div className="space-y-2">
            {tarefas.map((t: any) => (
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
