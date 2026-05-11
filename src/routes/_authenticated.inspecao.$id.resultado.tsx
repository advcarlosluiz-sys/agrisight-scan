import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, FileText, RefreshCw, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/inspecao/$id/resultado")({
  component: ResultadoPage,
});

function ResultadoPage() {
  const { id } = useParams({ from: "/_authenticated/inspecao/$id/resultado" });
  const navigate = useNavigate();
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

      <Section icon={UserCheck} title="Necessidade de agrônomo">
        <p className="text-sm font-medium">{a.necessidade_agronomo ? "Sim — recomendamos visita técnica" : "Não — manejo padrão"}</p>
      </Section>

      {a.justificativa && (
        <div className="mt-4 rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {a.justificativa}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
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
