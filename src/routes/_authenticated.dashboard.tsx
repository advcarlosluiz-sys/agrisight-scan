import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusPill, STATUS_DOT } from "@/components/status-pill";
import { StatusProcessoBadge, type StatusProcesso } from "@/components/status-processo-badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Filtro = "todos" | StatusProcesso;
const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todas" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "analisando", label: "Analisando" },
  { id: "concluida", label: "Concluídas" },
  { id: "cancelada", label: "Canceladas" },
];

function Dashboard() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
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

      <h3 className="mt-5 mb-2 text-sm font-semibold">Últimas inspeções</h3>
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map((f) => {
          const ativo = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                ativo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground active:bg-muted",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 text-[10px]",
                  ativo ? "bg-primary-foreground/20" : "bg-muted text-foreground",
                )}
              >
                {cntProc(f.id)}
              </span>
            </button>
          );
        })}
      </div>
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
function Legend({ dot, label }: { dot: string; label: string }) {
  return <span className="flex items-center gap-1"><span className={`h-3 w-3 rounded-sm ${dot}`} />{label}</span>;
}
