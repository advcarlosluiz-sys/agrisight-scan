import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { StatusProcessoBadge, type StatusProcesso } from "@/components/status-processo-badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoPage,
});

type Filtro = "todos" | StatusProcesso;

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "analisando", label: "Analisando" },
  { id: "concluida", label: "Concluídas" },
  { id: "cancelada", label: "Canceladas" },
];

function HistoricoPage() {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const { data } = useQuery({
    queryKey: ["historico"],
    queryFn: async () =>
      (
        await supabase
          .from("inspecoes")
          .select(
            "id, data_inspecao, status_geral, status_processo, setor:setor_id(codigo), canteiro:canteiro_id(nome)",
          )
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  const lista = (data ?? []).filter((i) =>
    filtro === "todos" ? true : (i as { status_processo?: string }).status_processo === filtro,
  );

  const contar = (f: Filtro) =>
    f === "todos"
      ? data?.length ?? 0
      : (data ?? []).filter((i) => (i as { status_processo?: string }).status_processo === f).length;

  return (
    <AppShell title="Histórico" back="/">
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
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
                {contar(f.id)}
              </span>
            </button>
          );
        })}
      </div>

      {lista.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma inspeção neste filtro.</p>
      )}
      <div className="space-y-2">
        {lista.map((i) => {
          const insp = i as {
            id: string;
            data_inspecao: string;
            status_geral: "normal" | "atencao" | "critico" | null;
            status_processo: StatusProcesso | null;
            setor?: { codigo?: string } | null;
            canteiro?: { nome?: string } | null;
          };
          return (
            <Link
              key={insp.id}
              to="/inspecao/$id/resultado"
              params={{ id: insp.id }}
              className="block rounded-2xl border bg-card p-4 shadow-card active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">Setor {insp.setor?.codigo ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {insp.canteiro?.nome ?? "—"} ·{" "}
                    {new Date(insp.data_inspecao).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <StatusPill status={insp.status_geral ?? undefined} />
              </div>
              <div className="mt-2">
                <StatusProcessoBadge status={insp.status_processo} />
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
