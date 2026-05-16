## Objetivo

Inserir uma etapa de **pré-visualização** entre a chamada da IA e a gravação no banco. Hoje a edge function `analisar-inspecao` faz tudo de uma vez: chama a IA, grava `analises_ia`, atualiza `inspecoes.status_geral`/`risco`/`status_processo`, atualiza `setores.status_atual` e cria `tarefas_recomendadas`. Vamos quebrar isso em **dois passos** controlados pelo usuário, com possibilidade de revisar/editar antes de confirmar.

## Fluxo novo

```text
observacoes → analisando (chama IA em modo "preview")
            ↓
       preview-ia (mostra JSON + permite editar status/risco/prioridade/confiança)
            ├── "Salvar análise" → chama edge em modo "save" → resultado
            └── "Descartar / Reanalisar" → volta para analisando
```

## Mudanças

### 1. Edge function `supabase/functions/analisar-inspecao/index.ts`

Adicionar parâmetro `mode` no body:

- `mode: "preview"` (padrão se não vier `analise`): executa passos 1–6 (busca inspeção, fotos, chama IA, normaliza, aplica fallback) e **retorna** `{ ok, preview, degradado, fotos }` **sem gravar nada**. Não muda `status_processo`.
- `mode: "save"`: recebe `{ inspecao_id, analise }` (o JSON revisado pelo usuário, mesmo schema do `AnalysisResult`), normaliza/valida novamente, grava `analises_ia`, atualiza `inspecoes` (status_geral, risco, status_processo=`concluida`), atualiza `setores.status_atual` e cria `tarefas_recomendadas`. Não chama a IA.

Validação reaproveita a função `normalizar()` existente. Se `mode: "save"` vier sem `analise` válida, retorna 400.

### 2. Tela `src/routes/_authenticated.inspecao.$id.analisando.tsx`

- Invocar `analisar-inspecao` com `{ inspecao_id, mode: "preview" }`.
- Em vez de navegar para `/inspecao/$id/resultado`, navegar para `/inspecao/$id/preview-ia` passando o `preview` via `navigate({ state: { preview, degradado, fotos } })` ou armazenando em um `sessionStorage` chaveado por `inspecao_id` (mais robusto a reloads).

### 3. Nova tela `src/routes/_authenticated.inspecao.$id.preview-ia.tsx`

Conteúdo:

- **Cabeçalho** com badge "Pré-visualização" + aviso "Esta análise ainda não foi salva".
- **Campos editáveis** (controlados em estado local):
  - `status_geral` — Select (`normal` / `atencao` / `critico`).
  - `risco` — Select (`baixo` / `medio` / `alto`).
  - `prioridade` — Select (`baixa` / `media` / `alta` / `urgente`).
  - `confianca` — Slider 0–100%.
  - `necessidade_agronomo` — Switch.
  - `justificativa` — Textarea.
  - Listas (`problemas_detectados`, `hipoteses_agronomicas`, `acoes_recomendadas`) — editor simples de chips/itens (adicionar/remover linha).
- **Bloco "JSON bruto"** colapsável (`<details>`), exibindo o JSON formatado e botão "Copiar JSON".
- Se `degradado` veio do preview, mostra alerta amarelo ("Análise gerada por fallback — revise com cuidado").
- Rodapé fixo com:
  - **Descartar** → confirma e volta para `/inspecao/$id/observacoes` (sem gravar).
  - **Reanalisar** → volta para `/inspecao/$id/analisando` (refaz preview).
  - **Salvar análise** (primário) → chama `analisar-inspecao` com `{ inspecao_id, mode: "save", analise: <estado editado> }`, mostra toast e navega para `/inspecao/$id/resultado`.

Se o usuário entrar direto na URL sem `preview` no estado/sessionStorage, mostra mensagem "Pré-visualização expirada" e botão para reanalisar.

### 4. Tela de resultado (`_authenticated.inspecao.$id.resultado.tsx`)

Sem mudanças funcionais. Só continua lendo a análise mais recente — agora será a versão revisada pelo usuário.

## Pontos técnicos

- **Schema do payload de preview/save** é o mesmo `AnalysisResult` da edge: `status_geral`, `risco`, `confianca`, `problemas_detectados`, `hipoteses_agronomicas`, `acoes_recomendadas`, `justificativa`, `necessidade_agronomo`, `prioridade`.
- **Persistência intermediária**: `sessionStorage` (chave `preview-ia:<inspecao_id>`) para sobreviver a refresh acidental; limpa após `mode: "save"` bem-sucedido ou após "Descartar".
- **Status da inspeção**: durante a pré-visualização, `status_processo` permanece `em_andamento` (a edge não altera no modo preview); só vira `concluida` depois do save. Isso mantém a tela inicial mostrando "Continuar Inspeção" corretamente caso o usuário saia.
- **Idempotência**: cada save insere uma nova linha em `analises_ia` (igual hoje) — a tela de resultado já lê só a mais recente, então re-saves continuam funcionando.
- **Sem mudanças de schema do banco**.
- A rota nova precisa entrar antes do build (`src/routes/_authenticated.inspecao.$id.preview-ia.tsx`) — o plugin do TanStack regenera `routeTree.gen.ts` automaticamente.
