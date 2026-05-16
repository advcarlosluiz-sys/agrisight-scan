import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Check,
  Upload,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusProcessoBadge, useStatusProcesso, useSyncStatusRoute } from "@/components/status-processo-badge";

type FotoStatus = "pendente" | "carregada" | "enviada";
type FotoItem = { id: string; legenda: string | null; url: string | null; status: FotoStatus };

type ErroDetalhado = {
  mensagem: string;
  status?: number;
  codigo?: string;
  contexto?: string;
  bruto?: string;
};

async function extrairErroEdge(e: unknown): Promise<ErroDetalhado> {
  const base: ErroDetalhado = {
    mensagem: e instanceof Error ? e.message : "Erro desconhecido na análise",
  };
  // supabase.functions.invoke retorna FunctionsHttpError com `context: Response`
  const ctx = (e as { context?: Response } | null)?.context;
  if (ctx && typeof ctx === "object" && "status" in ctx) {
    base.status = ctx.status;
    try {
      const texto = await ctx.clone().text();
      base.bruto = texto;
      try {
        const json = JSON.parse(texto) as {
          error?: string;
          message?: string;
          code?: string;
          details?: unknown;
        };
        base.mensagem = json.error || json.message || base.mensagem;
        base.codigo = json.code;
        if (json.details) {
          base.contexto =
            typeof json.details === "string"
              ? json.details
              : JSON.stringify(json.details, null, 2);
        }
      } catch {
        // resposta não-JSON — mantém texto bruto
      }
    } catch {
      // ignora falha de leitura do corpo
    }
  }
  return base;
}

export const Route = createFileRoute("/_authenticated/inspecao/$id/analisando")({
  component: AnalisandoPage,
});

const ETAPAS = [
  "Carregando dados da inspeção...",
  "Buscando fotos no armazenamento...",
  "Enviando imagens para a IA...",
  "Analisando padrões agronômicos...",
  "Preparando pré-visualização...",
];

function AnalisandoPage() {
  const { id } = useParams({ from: "/_authenticated/inspecao/$id/analisando" });
  const navigate = useNavigate();
  const [progresso, setProgresso] = useState(8);
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState<ErroDetalhado | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const ranRef = useRef(false);
  const executandoRef = useRef(false);
  const canceladoRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const statusProcesso = useStatusProcesso(id);

  const marcarStatus = (fotoId: string, status: FotoStatus) =>
    setFotos((prev) => prev.map((f) => (f.id === fotoId ? { ...f, status } : f)));

  const executar = useCallback(async () => {
    if (executandoRef.current) return;
    executandoRef.current = true;
    canceladoRef.current = false;
    setErro(null);
    setMostrarDetalhes(false);
    setProgresso(8);
    setEtapa(0);
    setFotos([]);

    const tickProg = setInterval(() => {
      setProgresso((p) => (p < 92 ? p + Math.max(1, Math.round((95 - p) / 18)) : p));
    }, 400);
    const tickEtapa = setInterval(() => {
      setEtapa((e) => (e < ETAPAS.length - 1 ? e + 1 : e));
    }, 1800);

    try {
      // Se a análise já foi concluída (ex.: outra aba), pula direto p/ resultado.
      const { data: insp } = await supabase
        .from("inspecoes")
        .select("status_processo")
        .eq("id", id)
        .maybeSingle();
      if (canceladoRef.current) return;
      const sp = insp?.status_processo as string | undefined;
      if (sp === "concluida") {
        navigate({ to: "/inspecao/$id/resultado", params: { id }, replace: true });
        return;
      }
      if (sp === "cancelada") {
        navigate({ to: "/inspecao/$id/observacoes", params: { id }, replace: true });
        return;
      }
      // Garante o marcador "analisando" (útil quando entramos via reload direto).
      if (sp !== "analisando") {
        await supabase
          .from("inspecoes")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ status_processo: "analisando" } as any)
          .eq("id", id);
      }

      // Carrega lista de fotos da inspeção e gera URLs assinadas em paralelo,
      // marcando cada uma como "carregada" assim que sua URL fica disponível.
      const { data: fotosRows, error: fotosErr } = await supabase
        .from("fotos_inspecao")
        .select("id, legenda, storage_path, created_at")
        .eq("inspecao_id", id)
        .order("created_at", { ascending: true });
      if (fotosErr) throw fotosErr;
      if (!fotosRows || fotosRows.length < 1) {
        await supabase
          .from("inspecoes")
          .update({ status_processo: "em_andamento" })
          .eq("id", id);
        throw new Error("Inspeção sem fotos. Volte e adicione ao menos 1 foto antes de analisar.");
      }

      const lista: FotoItem[] = fotosRows.map((r) => ({
        id: r.id as string,
        legenda: (r.legenda as string | null) ?? null,
        url: null,
        status: "pendente",
      }));
      setFotos(lista);

      await Promise.all(
        fotosRows.map(async (r) => {
          const { data: signed } = await supabase.storage
            .from("inspection-photos")
            .createSignedUrl(r.storage_path as string, 600);
          if (canceladoRef.current) return;
          setFotos((prev) =>
            prev.map((f) =>
              f.id === r.id
                ? { ...f, url: signed?.signedUrl ?? null, status: "carregada" }
                : f,
            ),
          );
        }),
      );

      // Marcação progressiva de "enviada" enquanto a IA processa em lote.
      const passo = Math.max(450, Math.min(1400, Math.round(7000 / lista.length)));
      let idx = 0;
      const tickEnvio = setInterval(() => {
        if (canceladoRef.current || idx >= lista.length) {
          clearInterval(tickEnvio);
          return;
        }
        marcarStatus(lista[idx].id, "enviada");
        idx += 1;
      }, passo);

      type RespIA = { error?: string; preview?: unknown; degradado?: string | null; fotos?: unknown };
      let resp: RespIA | null = null;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        // Usa fetch direto (em vez de supabase.functions.invoke) para podermos
        // abortar a conexão e propagar o cancelamento até a Edge Function,
        // que por sua vez aborta a chamada à IA via req.signal.
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const supaUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const r = await fetch(`${supaUrl}/functions/v1/analisar-inspecao`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${token ?? anonKey}`,
          },
          body: JSON.stringify({ inspecao_id: id, mode: "preview" }),
        });
        if (canceladoRef.current) return;
        const text = await r.text();
        let parsed: unknown = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = { error: text || `HTTP ${r.status}` };
        }
        if (!r.ok) {
          const err = new Error(
            (parsed as { error?: string })?.error || `HTTP ${r.status}`,
          ) as Error & { context?: Response };
          // Reanexa um Response para extrairErroEdge ler status/payload.
          err.context = new Response(text, {
            status: r.status,
            headers: r.headers,
          });
          throw err;
        }
        resp = parsed as RespIA;
      } finally {
        clearInterval(tickEnvio);
        abortRef.current = null;
      }

      if (resp?.error) throw new Error(resp.error);
      if (!resp?.preview) throw new Error("Resposta da IA sem preview");

      // Garante que todas aparecem como enviadas ao final.
      setFotos((prev) => prev.map((f) => ({ ...f, status: "enviada" })));
      setProgresso(100);
      setEtapa(ETAPAS.length - 1);
      try {
        sessionStorage.setItem(
          `preview-ia:${id}`,
          JSON.stringify({ preview: resp.preview, degradado: resp.degradado ?? null, fotos: resp.fotos ?? null, ts: Date.now() }),
        );
      } catch {
        // ignora — preview ainda pode ser exibida via state se disponível
      }
      if (canceladoRef.current) return;
      toast.success("Pré-visualização pronta — revise antes de salvar");
      setTimeout(() => {
        if (!canceladoRef.current) navigate({ to: "/inspecao/$id/preview-ia", params: { id } });
      }, 350);
    } catch (e) {
      if (canceladoRef.current) return;
      const detalhe = await extrairErroEdge(e);
      setErro(detalhe);
    } finally {
      clearInterval(tickProg);
      clearInterval(tickEtapa);
      executandoRef.current = false;
    }
  }, [id, navigate]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    void executar();
  }, [executar]);

  const cancelar = async () => {
    canceladoRef.current = true;
    // Aborta a requisição em andamento — o fechamento da conexão dispara
    // req.signal na Edge Function, que cancela a chamada à IA.
    abortRef.current?.abort();
    abortRef.current = null;
    try {
      await supabase
        .from("inspecoes")
        .update({ status_processo: "cancelada" })
        .eq("id", id);
    } catch {
      // ignora — segue cancelando localmente
    }
    try {
      localStorage.setItem(`analise-cancelada:${id}`, new Date().toISOString());
    } catch {
      // ignora
    }
    toast.info("Análise cancelada — chamada à IA interrompida");
    navigate({ to: "/inspecao/$id/observacoes", params: { id } });
  };

  return (
    <AppShell title="Analisando">
      <div className="mb-3 flex items-center justify-between rounded-xl border bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">Status da inspeção</span>
        <StatusProcessoBadge status={statusProcesso} />
      </div>
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-6 px-2 text-center">
        {!erro ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Analisando com IA</h2>
              <p className="text-sm text-muted-foreground">
                Isso pode levar alguns segundos.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <Progress value={progresso} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{ETAPAS[etapa]}</span>
              </div>
            </div>

            {fotos.length > 0 && (
              <div className="w-full max-w-sm space-y-2 text-left">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Fotos da inspeção</span>
                  <span>
                    {fotos.filter((f) => f.status === "enviada").length}/{fotos.length} enviadas à IA
                  </span>
                </div>
                <ul className="grid grid-cols-3 gap-2">
                  {fotos.map((f, i) => {
                    const enviada = f.status === "enviada";
                    const carregada = f.status === "carregada" || enviada;
                    return (
                      <li
                        key={f.id}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-lg border bg-muted",
                          enviada && "ring-2 ring-primary",
                        )}
                      >
                        {f.url ? (
                          <img
                            src={f.url}
                            alt={f.legenda ?? `Foto ${i + 1}`}
                            className={cn(
                              "h-full w-full object-cover transition-opacity",
                              !carregada && "opacity-40",
                            )}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                        <span
                          className={cn(
                            "absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] shadow",
                            enviada
                              ? "bg-primary text-primary-foreground"
                              : carregada
                                ? "bg-card text-foreground"
                                : "bg-muted text-muted-foreground",
                          )}
                          title={
                            enviada
                              ? "Enviada para a IA"
                              : carregada
                                ? "Carregada"
                                : "Aguardando"
                          }
                        >
                          {enviada ? (
                            <Check className="h-3 w-3" />
                          ) : carregada ? (
                            <Upload className="h-3 w-3" />
                          ) : (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </span>
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-1 py-0.5 text-[10px] text-white">
                          {enviada ? "Enviada" : carregada ? "Carregada" : "Aguardando"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setConfirmarCancelar(true)}
              className="mt-2 w-full max-w-sm"
            >
              Cancelar análise
            </Button>
          </>
        ) : (
          <>
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Falha na análise</h2>
              <p className="max-w-sm text-sm text-muted-foreground">{erro.mensagem}</p>
            </div>

            <div className="w-full max-w-sm rounded-xl border bg-card text-left">
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                {typeof erro.status === "number" && (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-medium text-destructive">
                    HTTP {erro.status}
                  </span>
                )}
                {erro.codigo && (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-muted-foreground">
                    {erro.codigo}
                  </span>
                )}
                <span className="ml-auto text-muted-foreground">Edge Function</span>
              </div>
              <button
                type="button"
                onClick={() => setMostrarDetalhes((v) => !v)}
                className="flex w-full items-center justify-between border-t px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                <span>{mostrarDetalhes ? "Ocultar detalhes" : "Ver detalhes do erro"}</span>
                {mostrarDetalhes ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {mostrarDetalhes && (
                <div className="space-y-2 border-t p-3">
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-[11px] leading-snug text-foreground">
                    {erro.contexto || erro.bruto || erro.mensagem}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={async () => {
                      const txt = [
                        `Mensagem: ${erro.mensagem}`,
                        erro.status ? `Status: ${erro.status}` : null,
                        erro.codigo ? `Código: ${erro.codigo}` : null,
                        erro.contexto ? `Detalhes:\n${erro.contexto}` : null,
                        erro.bruto ? `Resposta bruta:\n${erro.bruto}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n");
                      try {
                        await navigator.clipboard.writeText(txt);
                        toast.success("Detalhes copiados");
                      } catch {
                        toast.error("Não foi possível copiar");
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar detalhes
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/inspecao/$id/observacoes", params: { id } })}
              >
                Voltar
              </Button>
              <Button onClick={() => void executar()}>Tentar novamente</Button>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar análise em andamento?</AlertDialogTitle>
            <AlertDialogDescription>
              A análise será interrompida e você voltará para a tela de observações.
              As fotos e observações já registradas não serão perdidas — você pode
              iniciar a análise novamente quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar análise</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarCancelar(false);
                void cancelar();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
