import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { CopyFilterLinkButton } from "@/components/copy-filter-link-button";
import { StatusPill } from "@/components/status-pill";
import { StatusProcessoBadge, type StatusProcesso } from "@/components/status-processo-badge";
import { supabase } from "@/integrations/supabase/client";
import { usePersistedFilter } from "@/hooks/use-persisted-filter";
import { cn } from "@/lib/utils";

type Filtro = "todos" | StatusProcesso;

const historicoSearchSchema = z.object({
  filtro: fallback(
    z.enum(["todos", "em_andamento", "analisando", "concluida", "cancelada"]),
    "todos",
  ).default("todos"),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/historico")({
  validateSearch: zodValidator(historicoSearchSchema),
  component: HistoricoPage,
});

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "analisando", label: "Analisando" },
  { id: "concluida", label: "Concluídas" },
  { id: "cancelada", label: "Canceladas" },
];

function HistoricoPage() {
  const { filtro, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/historico" });
  usePersistedFilter("historico:filtro", filtro, "todos", "/historico");
  const setFiltro = (f: Filtro) =>
    navigate({ search: (prev: { filtro: Filtro; q: string }) => ({ ...prev, filtro: f }), replace: true });
  const setQ = (v: string) =>
    navigate({ search: (prev: { filtro: Filtro; q: string }) => ({ ...prev, q: v }), replace: true });

  const PAGE_SIZE = 20;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["historico"],
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const from = (pageParam as number) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data } = await supabase
          .from("inspecoes")
          .select(
            "id, data_inspecao, status_geral, status_processo, setor:setor_id(codigo), canteiro:canteiro_id(nome), propriedade:propriedade_id(nome, produtor:produtor_id(nome))",
          )
          .order("created_at", { ascending: false })
          .range(from, to);
        return data ?? [];
      },
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < PAGE_SIZE ? undefined : allPages.length,
    });
  const inspecoesAll = (data?.pages ?? []).flat();

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

  const baseFiltrada = inspecoesAll.filter(matchBusca);
  const lista = baseFiltrada.filter((i) =>
    filtro === "todos" ? true : (i as { status_processo?: string }).status_processo === filtro,
  );

  const contar = (f: Filtro) =>
    f === "todos"
      ? baseFiltrada.length
      : baseFiltrada.filter((i) => (i as { status_processo?: string }).status_processo === f).length;

  return (
    <AppShell title="Histórico" back="/">
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

      <div className="mt-4 flex justify-center">
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
          !isLoading && inspecoesAll.length > 0 && (
            <p className="text-xs text-muted-foreground">Fim da lista</p>
          )
        )}
      </div>
    </AppShell>
  );
}
