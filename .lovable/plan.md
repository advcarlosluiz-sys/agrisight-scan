# Agrobotic Scout AI — MVP Plan

Aplicativo mobile-first de inspeção agrícola para canteiros de morango, com QR Code, fotos, dados ambientais e análise por IA.

## Stack

- Frontend: React + TypeScript + TanStack Start (já configurado)
- Backend: Lovable Cloud (Supabase) — Auth, Postgres, Storage
- IA: Lovable AI Gateway (Google Gemini) via Edge Function — sem necessidade de chave OpenAI do usuário, já incluso
- QR Code: biblioteca `html5-qrcode`
- PDF: `jspdf` + `jspdf-autotable`
- Gráficos: `recharts` (já instalado via shadcn)

> Observação: vou usar **Lovable AI** (Gemini) em vez de OpenAI — assim você não precisa configurar/pagar chave separada. O contrato JSON da análise permanece idêntico ao especificado.

## Design System

- Verde escuro principal (oklch ~0.35 0.12 145), branco, acentos terra
- Tipografia: Inter (corpo) + display sutil
- Mobile-first: layout 100% otimizado pra telefone, com max-width container
- Indicador online/offline no topo
- Componentes shadcn customizados via tokens semânticos

## Estrutura de Rotas

```
/login                       Login (Supabase Auth: email/senha + Google)
/_authenticated/             Layout protegido
  /                          Tela inicial (5 botões + status)
  /inspecao/nova             Form: produtor/propriedade/canteiro/data
  /inspecao/$id/qr           Leitor QR Code do setor
  /inspecao/$id/setor/$sid   Coleta de fotos + dados ambientais
  /inspecao/$id/observacoes  Checkboxes + observação livre
  /inspecao/$id/resultado    Resultado da análise IA
  /historico                 Lista de inspeções anteriores
  /relatorio/$id             Relatório com gráficos + PDF
  /dashboard                 Dashboard com mapa visual
  /configuracoes             Perfil/organização
```

## Banco de Dados (migrations)

Tabelas: `organizacoes`, `perfis`, `produtores`, `propriedades`, `canteiros`, `setores`, `inspecoes`, `fotos_inspecao`, `analises_ia`, `tarefas_recomendadas`, `relatorios` — exatamente como especificado.

- `perfis.id` referencia `auth.users(id)`
- Trigger `on_auth_user_created` cria perfil + organização default no signup
- RLS em todas as tabelas: usuário só vê dados da sua `organizacao_id`
- Helper SQL `current_org_id()` (SECURITY DEFINER) para evitar recursão
- Enum types: `status_geral` (normal/atencao/critico), `risco` (baixo/medio/alto), `prioridade_tarefa`, `status_tarefa`

## Storage

- Bucket privado `inspection-photos` — path `{org_id}/{inspecao_id}/{tipo}-{timestamp}.jpg`
- Bucket privado `reports` — path `{org_id}/{relatorio_id}.pdf`
- RLS por prefixo `org_id`

## Edge Function: `analisar-inspecao`

Recebe `inspecao_id`, busca dados+fotos, gera signed URLs, chama Lovable AI Gateway (Gemini multimodal) com prompt estruturado, valida JSON de resposta, persiste em `analises_ia` e gera `tarefas_recomendadas` automaticamente. Trata erros 429/402.

## Telas (resumo)

1. **Home**: 5 botões grandes (Nova Inspeção, Continuar, Histórico, Sincronizar, Configurações), badge online/offline
2. **Nova Inspeção**: selects de produtor/propriedade/canteiro + datepicker
3. **Ler QR**: câmera via `html5-qrcode`, fallback manual de código
4. **Coleta**: 6 slots de foto (camera + preview), 3 inputs numéricos
5. **Observações**: 10 checkboxes + textarea + botão "Salvar e Analisar"
6. **Resultado IA**: cards coloridos por status, listas de problemas/hipóteses/ações
7. **Relatório**: resumo + gráfico pizza (recharts) + grid setores coloridos + botão Gerar PDF
8. **Dashboard**: KPIs, lista últimas inspeções, mapa de calor do canteiro (grid colorido), tarefas pendentes

## Dados de Demonstração

Seed via migration: 1 org demo, 2 produtores, 2 propriedades, 3 canteiros, setores A1–A10, ~5 inspeções variadas com análises IA mockadas. Vinculadas ao primeiro usuário que fizer signup (via função RPC `claim_demo_data`).

## Entregáveis desta etapa

1. Habilitar Lovable Cloud
2. Criar design system + layout base
3. Migrations: enums, tabelas, RLS, triggers, buckets, seeds
4. Auth (login/signup + rota protegida)
5. 8 telas listadas
6. Edge Function `analisar-inspecao`
7. Geração de PDF do relatório

Após sua aprovação, começo a implementação.
