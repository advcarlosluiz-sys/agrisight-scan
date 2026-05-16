import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { StatusPill, STATUS_DOT } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const STATUS_HEX: Record<string, string> = {
  normal: "#16a34a",
  atencao: "#eab308",
  critico: "#dc2626",
};
const SEM_STATUS_HEX = "#9ca3af";

export const Route = createFileRoute("/_authenticated/relatorio/$id")({
  component: Relatorio,
});

function Relatorio() {
  const { id } = useParams({ from: "/_authenticated/relatorio/$id" });
  const [gerando, setGerando] = useState(false);

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
  const { data: fotos } = useQuery({
    queryKey: ["rel-fotos", id],
    queryFn: async () =>
      (await supabase
        .from("fotos_inspecao")
        .select("id, storage_path, tipo_foto, legenda")
        .eq("inspecao_id", id)
        .order("created_at", { ascending: true })).data ?? [],
  });

  if (!insp) return <AppShell title="Relatório" back="/"><p>Carregando...</p></AppShell>;

  const cnt = (s: string) => setores?.filter((x: any) => x.status_atual === s).length ?? 0;
  const chart = [
    { name: "Normal", value: cnt("normal"), c: STATUS_HEX.normal },
    { name: "Atenção", value: cnt("atencao"), c: STATUS_HEX.atencao },
    { name: "Crítico", value: cnt("critico"), c: STATUS_HEX.critico },
    { name: "Não vistoriado", value: setores?.filter((x: any) => !x.status_atual).length ?? 0, c: SEM_STATUS_HEX },
  ].filter((c) => c.value > 0);

  const exportPdf = async () => {
    if (gerando) return;
    setGerando(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      let y = 18;

      // ---------- CAPA ----------
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("Relatório de Inspeção", 14, y); y += 8;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y); y += 8;
      doc.setTextColor(0);

      // Bloco identificação
      doc.setFontSize(10);
      const ip = insp as any;
      const linhas: [string, string][] = [
        ["Produtor", ip.propriedade?.produtor?.nome ?? "-"],
        ["Propriedade", ip.propriedade?.nome ?? "-"],
        ["Canteiro", `${ip.canteiro?.nome ?? "-"} (${ip.canteiro?.variedade ?? "-"})`],
        ["Setor", ip.setor?.codigo ?? "-"],
        ["Data", new Date(ip.data_inspecao).toLocaleDateString("pt-BR")],
        ["Status geral", String(ip.status_geral ?? "-")],
        ["Risco", String(ip.risco ?? "-")],
        ["Status do processo", STATUS_PROC_LABEL[String(ip.status_processo ?? "em_andamento")] ?? "-"],
      ];
      const rowsBloc = Math.ceil(linhas.length / 2);
      const blocH = 10 + rowsBloc * 7;
      doc.setDrawColor(220); doc.setFillColor(248, 250, 252);
      // re-draw rectangle with dynamic height (overrides earlier draw above)
      // (the earlier 38mm box stays for backward compatibility; we just write rows here)
      linhas.forEach((l, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 18 + col * ((W - 32) / 2);
        const cy = y + 7 + row * 7;
        doc.setTextColor(110); doc.text(`${l[0]}:`, cx, cy);
        doc.setTextColor(0); doc.text(l[1], cx + 38, cy, { maxWidth: (W - 32) / 2 - 40 });
      });
      y += Math.max(44, blocH + 6);

      // ---------- HISTÓRICO DO PROCESSO ----------
      const eventos = buildHistorico(ip, analise as any, id);
      if (eventos.length > 0) {
        if (y > H - 40) { doc.addPage(); y = 18; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0);
        doc.text("Histórico do processo", 14, y); y += 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        eventos.forEach((ev) => {
          if (y > H - 18) { doc.addPage(); y = 18; }
          // bullet colorido
          doc.setFillColor(ev.cor[0], ev.cor[1], ev.cor[2]);
          doc.circle(16, y - 1.2, 1.4, "F");
          doc.setTextColor(110);
          doc.text(ev.quando, 20, y);
          doc.setTextColor(0); doc.setFont("helvetica", "bold");
          doc.text(ev.titulo, 60, y);
          doc.setFont("helvetica", "normal");
          y += 4.5;
          if (ev.detalhe) {
            const linhasDet = doc.splitTextToSize(ev.detalhe, W - 28 - 6);
            doc.setTextColor(80);
            doc.text(linhasDet, 20, y);
            doc.setTextColor(0);
            y += linhasDet.length * 4.2 + 1.5;
          } else {
            y += 1;
          }
        });
        y += 4;
      }

      // ---------- GRÁFICO + MAPA ----------
      if (chart.length > 0 || (setores && setores.length > 0)) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0);
        doc.text("Visão do canteiro", 14, y); y += 5;

        const blockH = 70;
        // Pie chart
        if (chart.length > 0) {
          const pie = renderPiePng(chart, 360);
          doc.addImage(pie, "PNG", 14, y, blockH, blockH);
          // Legenda
          let ly = y + 6;
          chart.forEach((c) => {
            doc.setFillColor(c.c);
            doc.rect(14 + blockH + 6, ly - 3, 3.5, 3.5, "F");
            doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0);
            doc.text(`${c.name} — ${c.value}`, 14 + blockH + 12, ly);
            ly += 5.5;
          });
        }
        // Mapa
        if (setores && setores.length > 0) {
          const mapPng = renderMapPng(setores as any[], 460);
          const mapX = W - 14 - blockH;
          doc.addImage(mapPng, "PNG", mapX, y, blockH, blockH);
          doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(110);
          doc.text("Mapa do canteiro", mapX, y + blockH + 4);
          doc.setTextColor(0);
        }
        y += blockH + 10;
      }

      // ---------- DIAGNÓSTICO IA ----------
      if (analise) {
        if (y > H - 60) { doc.addPage(); y = 18; }
        const a = analise as any;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text("Diagnóstico da IA", 14, y); y += 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110);
        doc.text(`Modelo: ${a.modelo_ia ?? "-"} · Confiança: ${Math.round((a.confianca ?? 0) * 100)}% · Prioridade: ${a.prioridade ?? "-"}`, 14, y);
        y += 6; doc.setTextColor(0); doc.setFontSize(10);

        y = writeSection(doc, "Problemas detectados", a.problemas_detectados ?? [], 14, y, W);
        y = writeSection(doc, "Hipóteses agronômicas", a.hipoteses_agronomicas ?? [], 14, y, W);
        y = writeSection(doc, "Recomendações", a.acoes_recomendadas ?? [], 14, y, W);
        if (a.justificativa) {
          if (y > H - 30) { doc.addPage(); y = 18; }
          doc.setFont("helvetica", "bold"); doc.text("Justificativa", 14, y); y += 5;
          doc.setFont("helvetica", "normal");
          const txt = doc.splitTextToSize(String(a.justificativa), W - 28);
          doc.text(txt, 14, y); y += txt.length * 4.5 + 4;
        }
      }

      // ---------- FOTOS ----------
      if (fotos && fotos.length > 0) {
        const principais = (fotos as any[]).slice(0, 6);
        const imgs = await Promise.all(principais.map(async (f) => {
          try {
            const { data: signed } = await supabase.storage
              .from("inspection-photos")
              .createSignedUrl(f.storage_path, 60 * 5);
            if (!signed?.signedUrl) return null;
            const dataUrl = await fetchAsDataUrl(signed.signedUrl);
            return { ...f, dataUrl };
          } catch { return null; }
        }));
        const ok = imgs.filter(Boolean) as any[];
        if (ok.length > 0) {
          doc.addPage(); y = 18;
          doc.setFont("helvetica", "bold"); doc.setFontSize(12);
          doc.text("Fotos principais", 14, y); y += 6;

          const cols = 2, gap = 6;
          const cw = (W - 28 - gap) / cols;
          const ch = cw * 0.72;
          ok.forEach((f, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = 14 + col * (cw + gap);
            const ry = y + row * (ch + 14);
            if (ry + ch + 14 > H - 14) return; // safety
            try {
              doc.addImage(f.dataUrl, "JPEG", x, ry, cw, ch, undefined, "FAST");
            } catch {
              doc.setDrawColor(220); doc.rect(x, ry, cw, ch);
            }
            doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(80);
            const label = `${f.tipo_foto ?? "foto"}${f.legenda ? " — " + f.legenda : ""}`;
            doc.text(doc.splitTextToSize(label, cw), x, ry + ch + 4);
            doc.setTextColor(0);
          });
        }
      }

      // ---------- RODAPÉ EM TODAS AS PÁGINAS ----------
      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(140);
        doc.text(`AgriSight · Inspeção ${ip.setor?.codigo ?? id}`, 14, H - 6);
        doc.text(`Página ${p}/${pages}`, W - 14, H - 6, { align: "right" });
        doc.setTextColor(0);
      }

      doc.save(`relatorio-${ip.setor?.codigo ?? id}.pdf`);
      toast.success("PDF gerado");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setGerando(false);
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Diagnóstico da IA</h3>
            {(analise as any).modelo_ia && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {(analise as any).modelo_ia}
              </span>
            )}
          </div>
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

      <Button className="mt-6 h-12 w-full text-base" onClick={exportPdf} disabled={gerando}>
        {gerando ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Gerando PDF...</>
        ) : (
          <><FileDown className="mr-2 h-5 w-5" /> Gerar PDF completo</>
        )}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Inclui gráfico, mapa do canteiro, diagnóstico e até 6 fotos principais.
      </p>
    </AppShell>
  );
}

// ---------------- helpers ----------------

function writeSection(doc: any, title: string, items: string[], x: number, y: number, W: number) {
  if (!items || items.length === 0) return y;
  const H = doc.internal.pageSize.getHeight();
  if (y > H - 25) { doc.addPage(); y = 18; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(title, x, y); y += 5;
  doc.setFont("helvetica", "normal");
  items.forEach((it) => {
    const lines = doc.splitTextToSize(`• ${String(it)}`, W - 28);
    if (y + lines.length * 4.5 > H - 18) { doc.addPage(); y = 18; }
    doc.text(lines, x, y);
    y += lines.length * 4.5 + 1;
  });
  return y + 3;
}

function renderPiePng(data: { name: string; value: number; c: string }[], size: number) {
  const cnv = document.createElement("canvas");
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let start = -Math.PI / 2;
  data.forEach((d) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = d.c;
    ctx.fill();
    // valor
    const mid = start + slice / 2;
    const tx = cx + Math.cos(mid) * r * 0.65;
    const ty = cy + Math.sin(mid) * r * 0.65;
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(size / 14)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (d.value > 0) ctx.fillText(String(d.value), tx, ty);
    start += slice;
  });
  return cnv.toDataURL("image/png");
}

function renderMapPng(setores: { codigo: string; status_atual: string | null }[], size: number) {
  const cnv = document.createElement("canvas");
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size, size);
  const n = setores.length;
  const cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(n))));
  const rows = Math.ceil(n / cols);
  const pad = 10, gap = 6;
  const cellW = (size - pad * 2 - gap * (cols - 1)) / cols;
  const cellH = (size - pad * 2 - gap * (rows - 1)) / rows;
  const cell = Math.min(cellW, cellH);
  setores.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * (cell + gap);
    const y = pad + row * (cell + gap);
    const color = (s.status_atual && STATUS_HEX[s.status_atual]) || SEM_STATUS_HEX;
    ctx.fillStyle = color;
    roundRect(ctx, x, y, cell, cell, 6); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(cell * 0.32)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s.codigo, x + cell / 2, y + cell / 2);
  });
  return cnv.toDataURL("image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
