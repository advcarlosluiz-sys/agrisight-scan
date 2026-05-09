// Edge function: analisar-inspecao
// Recebe inspecao_id, busca dados/fotos, chama Lovable AI Gateway (Gemini multimodal)
// e persiste a análise estruturada em analises_ia + tarefas_recomendadas.
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

interface AnalysisResult {
  status_geral: "normal" | "atencao" | "critico";
  risco: "baixo" | "medio" | "alto";
  confianca: number;
  problemas_detectados: string[];
  hipoteses_agronomicas: string[];
  acoes_recomendadas: string[];
  justificativa: string;
  necessidade_agronomo: boolean;
  prioridade: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing_auth" }, 401);
    }

    const { inspecao_id } = await req.json();
    if (!inspecao_id) return json({ error: "inspecao_id obrigatório" }, 400);

    // Cliente do usuário (RLS aplica)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: inspecao, error: inspErr } = await supabase
      .from("inspecoes")
      .select("*, setor:setor_id(codigo), canteiro:canteiro_id(nome,variedade,cultura)")
      .eq("id", inspecao_id)
      .single();

    if (inspErr || !inspecao) return json({ error: "inspecao não encontrada" }, 404);

    const { data: fotos } = await supabase
      .from("fotos_inspecao")
      .select("tipo_foto, storage_path")
      .eq("inspecao_id", inspecao_id);

    // Gerar signed URLs das fotos
    const imageContents: { type: string; image_url: { url: string } }[] = [];
    for (const f of fotos ?? []) {
      const { data: signed } = await admin.storage
        .from("inspection-photos")
        .createSignedUrl(f.storage_path, 600);
      if (signed?.signedUrl) {
        imageContents.push({ type: "image_url", image_url: { url: signed.signedUrl } });
      }
    }

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
      .filter(([k]) => (inspecao as any)[k])
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
}`;

    const userText = `Inspeção em canteiro de morango.
Setor: ${inspecao.setor?.codigo ?? "—"}
Canteiro: ${inspecao.canteiro?.nome ?? "—"} (variedade: ${inspecao.canteiro?.variedade ?? "—"})
Data: ${inspecao.data_inspecao}
Temperatura: ${inspecao.temperatura ?? "—"} °C
Umidade: ${inspecao.umidade ?? "—"} %
Luminosidade: ${inspecao.luminosidade ?? "—"} lux
Observações marcadas: ${checkboxes.length ? checkboxes.join(", ") : "nenhuma"}
Observação manual: ${inspecao.observacao_manual ?? "—"}
${imageContents.length ? `${imageContents.length} foto(s) anexada(s).` : "Sem fotos."}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
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

    if (aiResp.status === 429) return json({ error: "Limite de uso atingido. Tente novamente em instantes." }, 429);
    if (aiResp.status === 402) return json({ error: "Créditos esgotados. Adicione créditos em Configurações > Workspace." }, 402);
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI error", aiResp.status, txt);
      return json({ error: "Falha na IA: " + txt }, 500);
    }

    const aiJson = await aiResp.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: AnalysisResult;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      parsed = {
        status_geral: "atencao",
        risco: "medio",
        confianca: 0.4,
        problemas_detectados: ["Resposta IA não estruturada"],
        hipoteses_agronomicas: [],
        acoes_recomendadas: ["Reavaliar manualmente"],
        justificativa: String(raw).slice(0, 200),
        necessidade_agronomo: true,
        prioridade: "media",
      };
    }

    // Persistir análise (admin client para evitar problemas de policy de SELECT pós-INSERT)
    const { data: analise, error: aErr } = await admin
      .from("analises_ia")
      .insert({
        organizacao_id: inspecao.organizacao_id,
        inspecao_id,
        modelo_ia: "openai/gpt-5-mini",
        status_geral: parsed.status_geral,
        risco: parsed.risco,
        confianca: parsed.confianca,
        problemas_detectados: parsed.problemas_detectados,
        hipoteses_agronomicas: parsed.hipoteses_agronomicas,
        acoes_recomendadas: parsed.acoes_recomendadas,
        justificativa: parsed.justificativa,
        necessidade_agronomo: parsed.necessidade_agronomo,
        prioridade: parsed.prioridade,
        resposta_completa: parsed,
      })
      .select()
      .single();

    if (aErr) console.error("insert analise", aErr);

    // Atualizar inspeção e setor com status
    await admin
      .from("inspecoes")
      .update({ status_geral: parsed.status_geral, risco: parsed.risco, status_processo: "concluida" })
      .eq("id", inspecao_id);

    if (inspecao.setor_id) {
      await admin
        .from("setores")
        .update({ status_atual: parsed.status_geral })
        .eq("id", inspecao.setor_id);
    }

    // Criar tarefas a partir das ações recomendadas
    if (parsed.acoes_recomendadas?.length) {
      const prio = (["urgente", "alta", "media", "baixa"].includes(parsed.prioridade)
        ? parsed.prioridade
        : "media") as "urgente" | "alta" | "media" | "baixa";
      await admin.from("tarefas_recomendadas").insert(
        parsed.acoes_recomendadas.slice(0, 5).map((titulo) => ({
          organizacao_id: inspecao.organizacao_id,
          inspecao_id,
          setor_id: inspecao.setor_id,
          titulo,
          descricao: parsed.justificativa,
          prioridade: prio,
          status: "pendente" as const,
        })),
      );
    }

    return json({ ok: true, analise });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
