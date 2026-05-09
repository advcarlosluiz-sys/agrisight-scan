## Trocar modelo de IA para `openai/gpt-5-mini`

Alteração pontual na edge function `analisar-inspecao` para usar o modelo `openai/gpt-5-mini` (multimodal) via Lovable AI Gateway, no lugar do atual `google/gemini-2.5-flash`.

### Mudanças

**`supabase/functions/analisar-inspecao/index.ts`**
- No corpo da chamada `fetch` para `ai.gateway.lovable.dev`: trocar `model: "google/gemini-2.5-flash"` → `model: "openai/gpt-5-mini"`.
- No `insert` em `analises_ia`: atualizar `modelo_ia: "google/gemini-2.5-flash"` → `modelo_ia: "openai/gpt-5-mini"` para refletir corretamente o modelo usado.

Nenhuma outra alteração é necessária — o formato de mensagens (texto + `image_url`) e `response_format: { type: "json_object" }` são compatíveis com o gpt-5-mini via gateway.

### Observações

- A chave `LOVABLE_API_KEY` segue válida (mesmo gateway).
- Custo por requisição é maior que Gemini Flash, mas a precisão em visão tende a ser melhor.
- Após implementar, faço deploy da função e podemos testar pela tela de Observações.
