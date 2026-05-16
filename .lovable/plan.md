## Objetivo

Impedir que uma inspeção sem fotos (ou com fotos pendentes de upload) seja enviada para a análise multimodal, mostrando avisos compreensíveis em vez de deixar a IA falhar/degradar silenciosamente.

## Regras de validação (defaults propostos)

- **Mínimo obrigatório:** 1 foto persistida em `fotos_inspecao` para a inspeção. Sem isso, o botão "Salvar e Analisar com IA" fica desabilitado e a chamada da edge function é bloqueada.
- **Recomendado:** 3 fotos no total **e** pelo menos 2 tipos distintos (`tipo_foto`). Se faltar, permite seguir mas exibe aviso amarelo ("análise pode ficar degradada").
- **Fotos pendentes na fila offline** (`enqueuePhoto`/`usePendingPhotos`) NÃO contam como disponíveis. Se houver pendentes para a inspeção, bloqueia com mensagem "Sincronize X foto(s) pendente(s) antes de analisar" + atalho para `/sincronizacao`.
- **Offline + 0 fotos sincronizadas:** bloqueio total ("Você está offline e nenhuma foto foi sincronizada ainda").

## Mudanças

### 1. `src/lib/use-inspecao-fotos.ts` (novo)
Hook `useInspecaoFotos(id)` que retorna:
```
{ total, porTipo: Record<TipoKey, number>, tiposDistintos, pendentes, loading }
```
- Lê `fotos_inspecao` via `useQuery` (`select tipo_foto, id where inspecao_id = id`).
- Combina com `usePendingPhotos(id)` para contar pendentes.
- Expõe helper `validarParaAnalise({ online })` retornando `{ ok: boolean, nivel: "bloqueio"|"aviso"|null, mensagem?: string, acao?: "sincronizar" }`.

### 2. `src/routes/_authenticated.inspecao.$id.observacoes.tsx`
- Usa o hook acima.
- Renderiza um card de status de fotos acima do botão: contagem total, tipos cobertos, pendentes.
- Em caso de **bloqueio**: card vermelho com a mensagem, botão "Salvar e Analisar com IA" `disabled`, e (se for pendentes) link para Sincronização.
- Em caso de **aviso**: card amarelo ("Recomendado X fotos / Y tipos para melhor resultado") mas botão habilitado.
- `analisar()` revalida antes de chamar a edge function — se o estado mudou e virou bloqueio, exibe `toast.error` e aborta sem alterar `status_processo`.

### 3. `src/routes/_authenticated.inspecao.$id.setor.$sid.tsx`
- Acrescenta CTA visível "Adicionar fotos" reforçado quando `total === 0` (apenas reforço visual; sem nova lógica).
- (Opcional, baixo custo) chip mostrando "X fotos enviadas neste setor".

### 4. `src/routes/_authenticated.inspecao.$id.analisando.tsx`
- Antes de chamar `supabase.functions.invoke`, faz uma verificação rápida (`select count`) de `fotos_inspecao` para a inspeção. Se 0, define `erro = "Inspeção sem fotos. Volte e adicione ao menos 1 foto antes de analisar."` e não chama a edge function. Salvaguarda caso o usuário chegue por URL direta.
- Reverte `status_processo` para `em_andamento` nesse caso (já que `observacoes` marcou `analisando`).

### 5. Mensagens (todas em PT-BR, tom direto)
- Bloqueio sem fotos: **"Adicione ao menos 1 foto da área inspecionada para enviar à IA."**
- Bloqueio pendentes: **"Há {n} foto(s) ainda não sincronizada(s). Sincronize antes de analisar."** + botão "Ir para Sincronização".
- Bloqueio offline sem fotos: **"Você está offline e ainda não há fotos enviadas. Capture e sincronize ao menos 1 foto."**
- Aviso (poucas/pouco diversas): **"Recomendamos pelo menos 3 fotos cobrindo 2 tipos diferentes para uma análise mais precisa. Você pode continuar, mas o resultado pode vir degradado."**

## Fora de escopo

- Não muda a edge function `analisar-inspecao` (ela já degrada graciosamente quando não há fotos; a validação é client-side e UX).
- Não muda schema do banco.
- Não altera os limites mínimos por `tipo_foto` específico (geral/plantas/folhas/etc.) — apenas contagem total e diversidade.

## Pergunta opcional ao usuário

Os limites (`mínimo=1`, `recomendado=3` fotos, `2` tipos) são razoáveis para morango, mas posso ajustar se você preferir outros números — diga antes ou depois de implementar.
