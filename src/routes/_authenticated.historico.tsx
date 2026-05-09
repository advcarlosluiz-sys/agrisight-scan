import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const { data } = useQuery({
    queryKey: ["historico"],
    queryFn: async () =>
      (
        await supabase
          .from("inspecoes")
          .select("id, data_inspecao, status_geral, setor:setor_id(codigo), canteiro:canteiro_id(nome)")
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  return (
    <AppShell title="Histórico" back="/">
      {data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma inspeção ainda.</p>}
      <div className="space-y-2">
        {data?.map((i: any) => (
          <Link
            key={i.id}
            to="/inspecao/$id/resultado"
            params={{ id: i.id }}
            className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-card active:scale-[0.99]"
          >
            <div>
              <p className="font-semibold">Setor {i.setor?.codigo ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {i.canteiro?.nome ?? "—"} · {new Date(i.data_inspecao).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <StatusPill status={i.status_geral} />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
