## Objetivo

Mostrar na tela de Resultado da IA (`/inspecao/$id/resultado`) a lista de tarefas recomendadas geradas pela análise (`tarefas_recomendadas` filtradas por `inspecao_id`), com checkbox para alternar o status entre `pendente` e `concluida`.

## Mudanças

### `src/routes/_authenticated.inspecao.$id.resultado.tsx`

1. Adicionar `useQuery` para `tarefas_recomendadas` da inspeção:
   - `select id, titulo, descricao, prioridade, status, prazo`
   - `where inspecao_id = id`
   - ordenado por `prioridade` (alta → baixa) e `created_at`.
   - `queryKey: ["tarefas-inspecao", id]`.

2. Adicionar `useMutation` `toggleTarefa({ id, concluida })`:
   - `update tarefas_recomendadas set status = 'concluida' | 'pendente' where id = ?`.
   - `onMutate`: optimistic update no cache.
   - `onError`: rollback + toast.error.
   - `onSettled`: `queryClient.invalidateQueries(["tarefas-inspecao", id])`.

3. Nova `<Section icon={ListChecks} title="Tarefas recomendadas">` colocada entre "Ações recomendadas" e "Necessidade de agrônomo". Conteúdo:
   - Se `loading`: skeleton simples (3 linhas).
   - Se vazio: `<Empty>Nenhuma tarefa gerada para esta inspeção.</Empty>`.
   - Caso contrário: lista de cards, cada um com:
     - `<Checkbox>` controlado por `status === "concluida"`, disabled durante mutação.
     - Título (`line-through` + `text-muted-foreground` quando concluída).
     - Linha secundária com badge de prioridade (cor por nível: alta=destructive, media=yellow, baixa=muted) e prazo formatado (se houver).
     - Descrição em texto pequeno quando presente.
   - Rodapé da seção: contador "X de Y concluídas".

4. Não altera `acoes_recomendadas` (texto livre da IA) — permanece como hoje. Tarefas são entidades persistidas separadamente.

## Fora de escopo

- Não cria novas tarefas a partir desta tela (só conclui/reabre as geradas pela IA).
- Não altera schema do banco — `tarefas_recomendadas` e seu enum `status_tarefa` (`pendente | em_andamento | concluida | cancelada`) já suportam o que é preciso. RLS já garante escopo por organização.
- Status `em_andamento` e `cancelada` continuam acessíveis apenas via outros fluxos (tela futura de Tarefas), aqui o toggle é binário pendente/concluída.

## Pergunta opcional

Se preferir um modelo de tarefas/Kanban completo (com `em_andamento`, edição, criação manual), me avise — esta entrega é só a lista por inspeção com toggle de conclusão.
