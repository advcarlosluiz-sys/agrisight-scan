import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/inspecao/$id/preview-ia")({
  component: PreviewIA,
});

type Status = "normal" | "atencao" | "critico";
type Risco = "baixo" | "medio" | "alto";
type Prioridade = "baixa" | "media" | "alta" | "urgente";

interface Analise {
  status_geral: Status;
  risco: Risco;
  confianca: number;
  problemas_detectados: string[];
  hipoteses_agronomicas: string[];
  acoes_recomendadas: string[];
  justificativa: string;
  necessidade_agronomo: boolean;
  prioridade: Prioridade;
}

interface PreviewPayload {
  preview: Analise;
  degradado: string | null;
  fotos: { total: number; usadas: number; falhadas: number } | null;
  ts: number;
}

function loadPreview(id: string): PreviewPayload | null {
  try {
    const raw = sessionStorage.getItem(`preview-ia:${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as PreviewPayload;
  } catch {
    return null;
  }
}

function PreviewIA() {
  const { id } = useParams({ from: "/_authenticated/inspecao/$id/preview-ia" });
  const navigate = useNavigate();
  const [payload, setPayload] = useState<PreviewPayload | null>(() => loadPreview(id));
  const [analise, setAnalise] = useState<Analise | null>(() => loadPreview(id)?.preview ?? null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!payload) {
      const p = loadPreview(id);
      if (p) {
        setPayload(p);
        setAnalise(p.preview);
      }
    }
  }, [id, payload]);

  const jsonStr = useMemo(
    () => (analise ? JSON.stringify(analise, null, 2) : ""),
    [analise],
  );

  if (!payload || !analise) {
    return (
      <AppShell title="Pré-visualização" back={`/inspecao/${id}/observacoes`}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-9 w-9 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Pré-visualização expirada</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Não encontramos um resultado de IA pendente para esta inspeção. Refaça a análise para gerar uma nova pré-visualização.
          </p>
          <Button onClick={() => navigate({ to: "/inspecao/$id/analisando", params: { id } })}>
            <Sparkles className="mr-1 h-4 w-4" />
            Analisar novamente
          </Button>
        </div>
      </AppShell>
    );
  }

  const upd = <K extends keyof Analise>(k: K, v: Analise[K]) =>
    setAnalise((a) => (a ? { ...a, [k]: v } : a));

  const salvar = async () => {
    setSalvando(true);
    try {
      const { data, error } = await supabase.functions.invoke("analisar-inspecao", {
        body: { inspecao_id: id, mode: "save", analise },
      });
      if (error) throw error;
      const resp = data as { error?: string; ok?: boolean };
      if (resp?.error) throw new Error(resp.error);
      sessionStorage.removeItem(`preview-ia:${id}`);
      toast.success("Análise salva");
      navigate({ to: "/inspecao/$id/resultado", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar a análise");
    } finally {
      setSalvando(false);
    }
  };

  const descartar = () => {
    if (!confirm("Descartar esta pré-visualização? Os ajustes serão perdidos.")) return;
    sessionStorage.removeItem(`preview-ia:${id}`);
    navigate({ to: "/inspecao/$id/observacoes", params: { id } });
  };

  const reanalisar = () => {
    sessionStorage.removeItem(`preview-ia:${id}`);
    navigate({ to: "/inspecao/$id/analisando", params: { id } });
  };

  const copiarJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonStr);
      toast.success("JSON copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <AppShell title="Pré-visualização" back={`/inspecao/${id}/observacoes`}>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <div className="flex-1 text-xs">
          <p className="font-medium">Resultado da IA — ainda não salvo</p>
          <p className="text-muted-foreground">Revise e ajuste antes de confirmar.</p>
        </div>
      </div>

      {payload.degradado && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
          <div>
            <p className="font-medium">Análise gerada por fallback</p>
            <p className="text-muted-foreground">Motivo: {payload.degradado}. Revise com cuidado.</p>
          </div>
        </div>
      )}

      {payload.fotos && (
        <p className="mb-3 text-[11px] text-muted-foreground">
          Fotos analisadas: {payload.fotos.usadas}/{payload.fotos.total}
          {payload.fotos.falhadas ? ` · ${payload.fotos.falhadas} falharam` : ""}
        </p>
      )}

      {/* Classificação */}
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Classificação</p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Status geral</Label>
            <Select value={analise.status_geral} onValueChange={(v) => upd("status_geral", v as Status)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Risco</Label>
            <Select value={analise.risco} onValueChange={(v) => upd("risco", v as Risco)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixo">Baixo</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Prioridade</Label>
            <Select value={analise.prioridade} onValueChange={(v) => upd("prioridade", v as Prioridade)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Confiança: {Math.round(analise.confianca * 100)}%</Label>
            <Slider
              className="mt-3"
              value={[Math.round(analise.confianca * 100)]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => upd("confianca", (v[0] ?? 0) / 100)}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <Label className="text-sm">Necessidade de agrônomo</Label>
          <Switch
            checked={analise.necessidade_agronomo}
            onCheckedChange={(v) => upd("necessidade_agronomo", v)}
          />
        </div>
      </section>

      {/* Justificativa */}
      <section className="mt-3 rounded-2xl border bg-card p-4 shadow-card">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Justificativa
        </Label>
        <Textarea
          className="mt-2"
          rows={3}
          value={analise.justificativa}
          onChange={(e) => upd("justificativa", e.target.value)}
        />
      </section>

      <ListEditor
        title="Problemas detectados"
        items={analise.problemas_detectados}
        onChange={(arr) => upd("problemas_detectados", arr)}
        placeholder="Ex.: Manchas escuras em folhas"
      />
      <ListEditor
        title="Hipóteses agronômicas"
        items={analise.hipoteses_agronomicas}
        onChange={(arr) => upd("hipoteses_agronomicas", arr)}
        placeholder="Ex.: Deficiência de nitrogênio"
      />
      <ListEditor
        title="Ações recomendadas"
        items={analise.acoes_recomendadas}
        onChange={(arr) => upd("acoes_recomendadas", arr)}
        placeholder="Ex.: Aplicar adubação foliar"
      />

      {/* JSON bruto */}
      <details className="mt-3 rounded-2xl border bg-card p-4 shadow-card">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
          JSON bruto
        </summary>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={copiarJson}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
          </Button>
        </div>
        <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
{jsonStr}
        </pre>
      </details>

      {/* Ações */}
      <div className="sticky bottom-2 mt-5 flex flex-col gap-2 rounded-2xl border bg-card/95 p-3 shadow-card backdrop-blur">
        <Button onClick={salvar} disabled={salvando} className="w-full">
          {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
          {salvando ? "Salvando…" : "Salvar análise"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={reanalisar} disabled={salvando}>
            <Sparkles className="mr-1 h-4 w-4" /> Reanalisar
          </Button>
          <Button variant="destructive" onClick={descartar} disabled={salvando}>
            <X className="mr-1 h-4 w-4" /> Descartar
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function ListEditor({
  title,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  items: string[];
  onChange: (arr: string[]) => void;
  placeholder?: string;
}) {
  const [novo, setNovo] = useState("");
  const add = () => {
    const t = novo.trim();
    if (!t) return;
    onChange([...items, t]);
    setNovo("");
  };
  return (
    <section className="mt-3 rounded-2xl border bg-card p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nenhum item.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg border bg-muted/30 px-2 py-1.5">
              <Input
                value={it}
                onChange={(e) => {
                  const arr = items.slice();
                  arr[i] = e.target.value;
                  onChange(arr);
                }}
                className="h-8 flex-1 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          Adicionar
        </Button>
      </div>
    </section>
  );
}
