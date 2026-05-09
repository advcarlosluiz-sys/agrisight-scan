import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { StatusPill, STATUS_DOT } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorio/$id")({
  component: Relatorio,
});

function Relatorio() {
  const { id } = useParams({ from: "/_authenticated/relatorio/$id" });
  const { data: insp } = useQuery({
    queryKey: ["rel-insp", id],
    queryFn: async () =>
      (await supabase.from("inspecoes").select("*, propriedade:propriedade_id(nome, produtor:produtor_id(nome)), canteiro:canteiro_id(nome,variedade), setor:setor_id(codigo)").eq("id", id).single()).data,
  });
  const { data: analise } = useQuery({
    queryKey: ["rel-analise", id],
    queryFn: async () =>
      (await supabase.from("analises_ia").select("*").eq("inspecao_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const { data: setores } = useQuery({
    queryKey: ["rel-setores", (insp as any)?.canteiro_id],
    enabled: !!(insp as any)?.canteiro_id,
    queryFn: async () =>
      (await supabase.from("setores").select("codigo, status_atual").eq("canteiro_id", (insp as any).canteiro_id).order("codigo")).data ?? [],
  });

  if (!insp) return <AppShell title="Relatório" back="/"><p>Carregando...</p></AppShell>;

  const cnt = (s: string) => setores?.filter((x: any) => x.status_atual === s).length ?? 0;
  const chart = [
    { name: "Normal", value: cnt("normal"), c: "#16a34a" },
    { name: "Atenção", value: cnt("atencao"), c: "#eab308" },
    { name: "Crítico", value: cnt("critico"), c: "#dc2626" },
    { name: "Não vistoriado", value: setores?.filter((x: any) => !x.status_atual).length ?? 0, c: "#9ca3af" },
  ].filter((c) => c.value > 0);

  const exportPdf = async () => {
    try {
      const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório de Inspeção", 14, 20);
      doc.setFontSize(10);
      doc.text(`Produtor: ${(insp as any).propriedade?.produtor?.nome ?? "-"}`, 14, 32);
      doc.text(`Propriedade: ${(insp as any).propriedade?.nome ?? "-"}`, 14, 38);
      doc.text(`Canteiro: ${(insp as any).canteiro?.nome ?? "-"}`, 14, 44);
      doc.text(`Setor: ${(insp as any).setor?.codigo ?? "-"}`, 14, 50);
      doc.text(`Data: ${new Date((insp as any).data_inspecao).toLocaleDateString("pt-BR")}`, 14, 56);
      doc.text(`Status geral: ${(insp as any).status_geral ?? "-"}`, 14, 66);
      doc.text(`Risco: ${(insp as any).risco ?? "-"}`, 14, 72);
      if (analise) {
        const a = analise as any;
        doc.setFontSize(12); doc.text("Diagnóstico IA", 14, 86);
        doc.setFontSize(10);
        doc.text(`Confiança: ${Math.round((a.confianca ?? 0) * 100)}%`, 14, 94);
        doc.text("Problemas: " + (a.problemas_detectados ?? []).join("; "), 14, 102, { maxWidth: 180 });
        doc.text("Recomendações: " + (a.acoes_recomendadas ?? []).join("; "), 14, 120, { maxWidth: 180 });
        if (a.justificativa) doc.text(a.justificativa, 14, 145, { maxWidth: 180 });
      }
      doc.save(`relatorio-${(insp as any).setor?.codigo ?? id}.pdf`);
      toast.success("PDF gerado");
    } catch (e) {
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <AppShell title="Relatório" back="/">
      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-xs uppercase text-muted-foreground">Inspeção</p>
        <h2 className="text-lg font-semibold">{(insp as any).canteiro?.nome} · Setor {(insp as any).setor?.codigo}</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Produtor:</span> {(insp as any).propriedade?.produtor?.nome}</div>
          <div><span className="text-muted-foreground">Propriedade:</span> {(insp as any).propriedade?.nome}</div>
          <div><span className="text-muted-foreground">Variedade:</span> {(insp as any).canteiro?.variedade}</div>
          <div><span className="text-muted-foreground">Data:</span> {new Date((insp as any).data_inspecao).toLocaleDateString("pt-BR")}</div>
        </div>
        <div className="mt-3"><StatusPill status={(insp as any).status_geral} /></div>
      </div>

      {chart.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Condições por setor</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chart} dataKey="value" nameKey="name" outerRadius={70} label>
                  {chart.map((c, i) => <Cell key={i} fill={c.c} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Mapa do canteiro</h3>
        <div className="grid grid-cols-5 gap-1.5">
          {setores?.map((s: any) => (
            <div key={s.codigo} className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold text-white ${STATUS_DOT[s.status_atual] ?? "bg-muted text-muted-foreground"}`}>
              {s.codigo}
            </div>
          ))}
        </div>
      </div>

      {analise && (
        <div className="mt-4 rounded-2xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Diagnóstico da IA</h3>
          <p className="text-sm">{(analise as any).justificativa}</p>
          {(analise as any).acoes_recomendadas?.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Recomendações</p>
              <ul className="ml-5 list-disc text-sm">
                {(analise as any).acoes_recomendadas.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <Button className="mt-6 h-12 w-full text-base" onClick={exportPdf}>
        <FileDown className="mr-2 h-5 w-5" /> Gerar PDF
      </Button>
    </AppShell>
  );
}
