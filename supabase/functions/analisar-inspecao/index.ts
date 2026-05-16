// Edge function: analisar-inspecao
// Recebe inspecao_id, busca dados/fotos, chama Lovable AI Gateway
// e persiste a análise estruturada em analises_ia + tarefas_recomendadas.
// Implementa tratamento robusto de erros: timeouts, falhas de assinatura de fotos,
// falhas/parsing da IA, normalização de campos e fallback heurístico.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const AI_TIMEOUT_MS = 55_000;
// Modelo da IA configurável via secret AI_MODEL (fallback seguro caso ausente).
// Permite trocar de modelo sem alterar código — basta atualizar o secret e reimplantar.
const MODELO_IA = (Deno.env.get("AI_MODEL") ?? "").trim() || "openai/gpt-5-mini";
// Incrementar a cada mudança significativa nos prompts (system/user) abaixo.
const PROMPT_VERSAO = "v1.1.0";

type StatusGeral = "normal" | "atencao" | "critico";
type RiscoNivel = "baixo" | "medio" | "alto";
type Prioridade = "baixa" | "media" | "alta" | "urgente";

interface AnalysisResult {
  status_geral: StatusGeral;
  risco: RiscoNivel;
  confianca: number;
  problemas_detectados: string[];
  hipoteses_agronomicas: string[];
  acoes_recomendadas: string[];
  justificativa: string;
  necessidade_agronomo: boolean;
  prioridade: Prioridade;
}

const STATUS_VALIDOS: StatusGeral[] = ["normal", "atencao", "critico"];
const RISCO_VALIDOS: RiscoNivel[] = ["baixo", "medio", "alto"];
const PRIO_VALIDAS: Prioridade[] = ["baixa", "media", "alta", "urgente"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY ausente no ambiente");
      return json({ error: "Configuração de IA indisponível. Contate o suporte." }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    let body: {
      inspecao_id?: string;
      mode?: "preview" | "save";
      analise?: unknown;
      degradado?: string | null;
      degradado_codigo?: string | null;
      degradado_detalhe?: string | null;
      fotos_falhadas?: number;
    };
    try {
      body = await req.json();
    } catch {
      return json({ error: "JSON inválido no corpo da requisição" }, 400);
    }
    const inspecao_id = body?.inspecao_id;
    const mode: "preview" | "save" = body?.mode === "save" ? "save" : "preview";
    if (!inspecao_id || typeof inspecao_id !== "string") {
      return json({ error: "inspecao_id obrigatório" }, 400);
    }
    if (mode === "save" && (!body.analise || typeof body.analise !== "object")) {
      return json({ error: "analise obrigatória no modo save" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar inspeção
    const { data: inspecao, error: inspErr } = await supabase
      .from("inspecoes")
      .select("*, setor:setor_id(codigo), canteiro:canteiro_id(nome,variedade,cultura)")
      .eq("id", inspecao_id)
      .maybeSingle();

    if (inspErr) {
      console.error("Erro ao buscar inspeção:", inspErr);
      return json({ error: "Falha ao acessar a inspeção" }, 500);
    }
    if (!inspecao) return json({ error: "inspecao não encontrada" }, 404);

    // 2. Buscar fotos (não bloqueia se falhar)
    const { data: fotos, error: fotosErr } = await supabase
      .from("fotos_inspecao")
      .select("tipo_foto, storage_path, ordem, created_at")
      .eq("inspecao_id", inspecao_id)
      .order("tipo_foto", { ascending: true })
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });

    if (fotosErr) console.error("Erro ao listar fotos (seguindo sem):", fotosErr);

    // 3. Gerar signed URLs (tolera falhas individuais)
    const imageContents: { type: string; image_url: { url: string } }[] = [];
    let fotosFalhadas = 0;
    for (const f of fotos ?? []) {
      try {
        const { data: signed, error: sErr } = await admin.storage
          .from("inspection-photos")
          .createSignedUrl(f.storage_path, 600);
        if (sErr || !signed?.signedUrl) {
          fotosFalhadas++;
          console.error("Falha ao assinar foto", f.storage_path, sErr);
          continue;
        }
        imageContents.push({ type: "image_url", image_url: { url: signed.signedUrl } });
      } catch (e) {
        fotosFalhadas++;
        console.error("Exceção ao assinar foto", f.storage_path, e);
      }
    }
    const totalFotos = fotos?.length ?? 0;
    const semFotos = imageContents.length === 0;

    // 4. Construir prompt
    const checkboxes = [
      ["mato_alto", "Mato alto"],
      ["plastico_rasgado", "Plástico rasgado/danificado"],
      ["poucos_frutos", "Poucos frutos"],
      ["plantas_fracas", "Plantas fracas"],
      ["frutos_maduros", "Frutos maduros"],
      ["pragas_visiveis", "Pragas visíveis"],
      ["folhas_manchadas", "Folhas manchadas"],
      ["solo_seco", "Solo seco"],
      ["solo_encharcado", "Solo encharcado"],
    ]
      .filter(([k]) => (inspecao as Record<string, unknown>)[k as string])
      .map(([, label]) => label);

    const systemPrompt = `Você é um agrônomo especialista em cultura de morango. Analise os dados da inspeção e retorne SEMPRE um JSON válido no seguinte formato exato (sem texto extra, sem markdown):
{
  "status_geral": "normal" | "atencao" | "critico",
  "risco": "baixo" | "medio" | "alto",
  "confianca": número entre 0 e 1,
  "problemas_detectados": [strings],
  "hipoteses_agronomicas": [strings],
  "acoes_recomendadas": [strings],
  "justificativa": string curta,
  "necessidade_agronomo": true | false,
  "prioridade": "baixa" | "media" | "alta" | "urgente"
}
${semFotos ? "ATENÇÃO: nenhuma foto disponível — baseie-se apenas nos dados textuais e seja mais conservador na confiança (<= 0.6)." : ""}`;

    const userText = `Inspeção em canteiro de morango.
Setor: ${inspecao.setor?.codigo ?? "—"}
Canteiro: ${inspecao.canteiro?.nome ?? "—"} (variedade: ${inspecao.canteiro?.variedade ?? "—"})
Data: ${inspecao.data_inspecao}
Temperatura: ${inspecao.temperatura ?? "—"} °C
Umidade: ${inspecao.umidade ?? "—"} %
Luminosidade: ${inspecao.luminosidade ?? "—"} lux
Observações marcadas: ${checkboxes.length ? checkboxes.join(", ") : "nenhuma"}
Observação manual: ${inspecao.observacao_manual ?? "—"}
Fotos: ${totalFotos === 0 ? "nenhuma fornecida" : `${imageContents.length}/${totalFotos} disponíveis${fotosFalhadas ? ` (${fotosFalhadas} falharam ao carregar)` : ""}`}.`;

    // 5. Chamar IA com timeout (somente em modo preview)
    // aiDegradado: rótulo curto exibido na UI.
    // aiDegradadoCodigo: categoria estável para diagnóstico/telemetria
    //   (timeout | rede | http_4xx | http_5xx | resposta_vazia | json_invalido | sem_api_key | erro_desconhecido).
    // aiDegradadoDetalhe: mensagem/snippet do erro original (até 1000 chars).
    let parsed: AnalysisResult | null = null;
    let aiDegradado: string | null = null;
    let aiDegradadoCodigo: string | null = null;
    let aiDegradadoDetalhe: string | null = null;

    if (mode === "preview") {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), AI_TIMEOUT_MS);
      // Propaga o cancelamento do cliente (fechamento da conexão) para a chamada da IA.
      const onClientAbort = () => ctrl.abort(new DOMException("client cancelled", "ClientAbortError"));
      if (req.signal.aborted) onClientAbort();
      else req.signal.addEventListener("abort", onClientAbort, { once: true });

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: MODELO_IA,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [{ type: "text", text: userText }, ...imageContents],
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (aiResp.status === 429) {
          return json({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }, 429);
        }
        if (aiResp.status === 402) {
          return json(
            { error: "Créditos da IA esgotados. Adicione créditos em Configurações > Workspace." },
            402,
          );
        }
        if (!aiResp.ok) {
          const txt = await safeText(aiResp);
          console.error("AI error", aiResp.status, txt);
          aiDegradado = `IA retornou ${aiResp.status}`;
          aiDegradadoCodigo = aiResp.status >= 500 ? "http_5xx" : "http_4xx";
          aiDegradadoDetalhe = `HTTP ${aiResp.status} — ${txt.slice(0, 800)}`;
        } else {
          const aiJson = await aiResp.json().catch((e) => {
            console.error("Falha ao parsear JSON da resposta IA:", e);
            return null;
          });
          const raw = aiJson?.choices?.[0]?.message?.content;
          if (!raw) {
            aiDegradado = "Resposta da IA vazia";
            aiDegradadoCodigo = "resposta_vazia";
            aiDegradadoDetalhe = "Resposta sem choices[0].message.content";
          } else {
            try {
              const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
              parsed = normalizar(obj);
            } catch (e) {
              console.error("Falha ao parsear conteúdo IA:", e, "raw:", String(raw).slice(0, 500));
              aiDegradado = "Resposta da IA não é JSON válido";
              aiDegradadoCodigo = "json_invalido";
              aiDegradadoDetalhe = `${(e as Error)?.message ?? "erro de parse"} — trecho: ${String(raw).slice(0, 500)}`;
            }
          }
        }
      } catch (e) {
        const name = (e as Error)?.name;
        const msg = (e as Error)?.message ?? String(e);
        const clientAborted = req.signal.aborted || name === "ClientAbortError";
        const timedOut = name === "TimeoutError";
        if (clientAborted) {
          console.warn("Análise cancelada pelo cliente — chamada à IA abortada");
          // Cliente já desconectou; resposta não chega, mas mantemos contrato.
          return json({ error: "Análise cancelada pelo cliente", cancelado: true }, 499);
        }
        console.error(timedOut ? "Timeout da IA" : "Erro de rede com IA:", e);
        aiDegradado = timedOut ? "Tempo limite da IA excedido" : "Falha de rede com a IA";
        aiDegradadoCodigo = timedOut ? "timeout" : "rede";
        aiDegradadoDetalhe = `${name ?? "Error"}: ${msg.slice(0, 800)}`;
      } finally {
        clearTimeout(timer);
        req.signal.removeEventListener("abort", onClientAbort);
      }

      // 6. Fallback heurístico se IA falhou
      if (!parsed) {
        parsed = fallbackHeuristico(checkboxes, semFotos, aiDegradado ?? "IA indisponível");
        if (!aiDegradadoCodigo) aiDegradadoCodigo = "erro_desconhecido";
      }

      // 6b. Retorna preview SEM persistir nada (status_processo permanece em_andamento).
      return json({
        ok: true,
        preview: parsed,
        degradado: aiDegradado,
        degradado_codigo: aiDegradadoCodigo,
        degradado_detalhe: aiDegradadoDetalhe,
        fotos: { total: totalFotos, usadas: imageContents.length, falhadas: fotosFalhadas },
      });
    }

    // === Modo SAVE: normaliza o JSON revisado pelo usuário e persiste ===
    parsed = normalizar(body.analise);

    // Em SAVE, a chamada à IA já ocorreu em preview; recebemos os metadados
    // de fallback do cliente para preservá-los junto da análise.
    const saveDegradado = typeof body.degradado === "string" ? body.degradado : null;
    const saveDegradadoCodigo = typeof body.degradado_codigo === "string" ? body.degradado_codigo : null;
    const saveDegradadoDetalhe = typeof body.degradado_detalhe === "string" ? body.degradado_detalhe : null;
    const saveFotosFalhadas = typeof body.fotos_falhadas === "number" ? body.fotos_falhadas : fotosFalhadas;

    // 7. Persistir análise
    const { data: analise, error: aErr } = await admin
      .from("analises_ia")
      .insert({
        organizacao_id: inspecao.organizacao_id,
        inspecao_id,
        modelo_ia: saveDegradado ? `${MODELO_IA} (fallback)` : MODELO_IA,
        prompt_versao: PROMPT_VERSAO,
        prompt_system: systemPrompt,
        prompt_user: userText,
        status_geral: parsed.status_geral,
        risco: parsed.risco,
        confianca: parsed.confianca,
        problemas_detectados: parsed.problemas_detectados,
        hipoteses_agronomicas: parsed.hipoteses_agronomicas,
        acoes_recomendadas: parsed.acoes_recomendadas,
        justificativa: parsed.justificativa,
        necessidade_agronomo: parsed.necessidade_agronomo,
        prioridade: parsed.prioridade,
        resposta_completa: {
          ...parsed,
          _degradado: saveDegradado,
          _degradado_codigo: saveDegradadoCodigo,
          _degradado_detalhe: saveDegradadoDetalhe,
          _fotos_falhadas: saveFotosFalhadas,
        },
      })
      .select()
      .single();

    if (aErr) {
      console.error("insert analise falhou:", aErr);
      await marcarFalha(admin, inspecao_id);
      return json(
        { error: "Falha ao salvar a análise no banco. Tente novamente.", detalhe: aErr.message },
        500,
      );
    }

    // 8. Atualizar inspeção e setor (não-críticos)
    const { error: updErr } = await admin
      .from("inspecoes")
      .update({
        status_geral: parsed.status_geral,
        risco: parsed.risco,
        status_processo: "concluida",
      })
      .eq("id", inspecao_id);
    if (updErr) console.error("update inspeção falhou:", updErr);

    if (inspecao.setor_id) {
      const { error: setorErr } = await admin
        .from("setores")
        .update({ status_atual: parsed.status_geral })
        .eq("id", inspecao.setor_id);
      if (setorErr) console.error("update setor falhou:", setorErr);
    }

    // 9. Criar tarefas (não-crítico)
    if (parsed.acoes_recomendadas.length) {
      const prio: Prioridade = PRIO_VALIDAS.includes(parsed.prioridade) ? parsed.prioridade : "media";
      const { error: tErr } = await admin.from("tarefas_recomendadas").insert(
        parsed.acoes_recomendadas.slice(0, 5).map((titulo) => ({
          organizacao_id: inspecao.organizacao_id,
          inspecao_id,
          setor_id: inspecao.setor_id,
          titulo,
          descricao: parsed!.justificativa,
          prioridade: prio,
          status: "pendente" as const,
        })),
      );
      if (tErr) console.error("insert tarefas falhou:", tErr);
    }

    return json({
      ok: true,
      analise,
      degradado: saveDegradado,
      degradado_codigo: saveDegradadoCodigo,
      degradado_detalhe: saveDegradadoDetalhe,
      fotos: { total: totalFotos, usadas: imageContents.length, falhadas: saveFotosFalhadas },
    });
  } catch (e) {
    console.error("Erro inesperado na edge function:", e);
    return json({ error: "Erro interno inesperado", detalhe: String(e) }, 500);
  }
});

function normalizar(obj: unknown): AnalysisResult {
  const o = (obj ?? {}) as Record<string, unknown>;
  const arrStr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => String(x).slice(0, 500)) : [];
  const status = STATUS_VALIDOS.includes(o.status_geral as StatusGeral)
    ? (o.status_geral as StatusGeral)
    : "atencao";
  const risco = RISCO_VALIDOS.includes(o.risco as RiscoNivel) ? (o.risco as RiscoNivel) : "medio";
  const prio = PRIO_VALIDAS.includes(o.prioridade as Prioridade)
    ? (o.prioridade as Prioridade)
    : "media";
  const confRaw = typeof o.confianca === "number" ? o.confianca : Number(o.confianca);
  const confianca = Number.isFinite(confRaw) ? Math.min(1, Math.max(0, confRaw)) : 0.5;
  return {
    status_geral: status,
    risco,
    confianca,
    problemas_detectados: arrStr(o.problemas_detectados),
    hipoteses_agronomicas: arrStr(o.hipoteses_agronomicas),
    acoes_recomendadas: arrStr(o.acoes_recomendadas),
    justificativa: typeof o.justificativa === "string" ? o.justificativa.slice(0, 1000) : "",
    necessidade_agronomo: Boolean(o.necessidade_agronomo),
    prioridade: prio,
  };
}

function fallbackHeuristico(
  checkboxes: string[],
  semFotos: boolean,
  motivo: string,
): AnalysisResult {
  const sinaisCriticos = ["Pragas visíveis", "Plantas fracas", "Folhas manchadas"];
  const sinaisAtencao = ["Mato alto", "Solo seco", "Solo encharcado", "Poucos frutos", "Plástico rasgado/danificado"];
  const temCritico = checkboxes.some((c) => sinaisCriticos.includes(c));
  const temAtencao = checkboxes.some((c) => sinaisAtencao.includes(c));
  const status: StatusGeral = temCritico ? "critico" : temAtencao ? "atencao" : "normal";
  const risco: RiscoNivel = temCritico ? "alto" : temAtencao ? "medio" : "baixo";
  const prioridade: Prioridade = temCritico ? "alta" : temAtencao ? "media" : "baixa";
  return {
    status_geral: status,
    risco,
    confianca: 0.3,
    problemas_detectados: checkboxes.length
      ? checkboxes.map((c) => `Indício relatado: ${c}`)
      : ["Sem sinais marcados pelo vistoriador"],
    hipoteses_agronomicas: temCritico
      ? ["Possível estresse biótico ou nutricional — requer inspeção presencial"]
      : [],
    acoes_recomendadas: [
      "Reavaliar manualmente a inspeção",
      semFotos ? "Capturar fotos das áreas afetadas e reanalisar" : "Reanalisar com a IA novamente",
      temCritico ? "Acionar agrônomo para visita técnica" : "Manter monitoramento",
    ],
    justificativa: `Análise gerada por fallback heurístico (motivo: ${motivo}). Confiança baixa — recomenda-se reanalisar.`,
    necessidade_agronomo: temCritico,
    prioridade,
  };
}

async function marcarFalha(
  admin: ReturnType<typeof createClient>,
  inspecao_id: string,
) {
  // Mantém a inspeção em "em_andamento" para permitir nova tentativa pelo usuário.
  try {
    await admin
      .from("inspecoes")
      .update({ status_processo: "em_andamento" })
      .eq("id", inspecao_id);
  } catch (e) {
    console.error("marcarFalha falhou:", e);
  }
}

async function safeText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return "<sem corpo>";
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
