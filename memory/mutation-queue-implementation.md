---
name: Mutation Queue Implementation
description: Fila local de mutações pendentes para sync incremental (Phase 3 Task 10)
type: project
---

**Implementation Date:** 2026-03-21

**What was built:**
- `src/lib/mutationQueue.ts` - 12 funções para gerenciar fila de mutações pendentes
- `src/core/types.ts` - Tipos `MutationType`, `EntityType`, `PendingMutation`
- `src/core/db.ts` - Tabela `pendingMutations` (versão 8 do schema)
- Test suite: `src/lib/mutationQueue.test.ts` (17 testes)

**Schema Design:**
```typescript
this.version(8).stores({
  pendingMutations: "++id, uuid, [uuid+entityType], syncedAt, createdAt, retryCount",
});
```
- `id`: Auto-increment primary key
- `uuid`: UUID da entidade mutada (não único - mesma entidade pode ter múltiplas mutações)
- `[uuid+entityType]`: Índice composto para queries por entidade
- `syncedAt`: Timestamp de sincronização (null = pendente)
- `retryCount`: Contador de retentativas para fallback

**Entity Types Supported:**
- Core: `game`, `libraryEntry`, `playSession`, `review`
- Relations: `libraryEntryStore`, `libraryEntryList`, `gameTag`, `gamePlatform`
- Lookup: `store`, `platform`, `list`, `tag`
- Other: `goal`, `savedView`, `importJob`

**Key Functions:**
- `enqueueMutation()` - Adiciona mutação à fila
- `getPendingMutations()` - Retorna mutações não sincronizadas (ordenadas por createdAt)
- `getPendingMutationsByUuid()` / `getPendingMutationsByType()` - Filtros
- `markMutationSynced()` / `markMutationsSynced()` - Marca como sincronizada
- `incrementMutationRetry()` - Incrementa retry count
- `purgeSyncedMutations()` - Remove mutações antigas sincronizadas (cleanup)
- `cancelPendingMutations()` - Cancela mutações pendentes (rollback/conflito)
- `getNextPendingMutation()` - Próxima mutação FIFO

**Integration Points:**
1. `useBacklogActions.ts` - Chamar `enqueueMutation()` após cada mutação local
2. Sync engine - Processar fila e chamar `markMutationSynced()` após sucesso
3. `incrementalSync.ts` - Usar fila como fonte de verdade para push incremental

**Why:**
Fila de mutações é essencial para sync incremental robusto. Em vez de reenviar snapshot completo, apenas operações pendentes são sincronizadas. Suporta offline-first, retry com backoff, e resolução de conflitos granular.

**How to apply:**
Ao criar/atualizar/deletar entidades em `useBacklogActions.ts`:
1. Executar operação no IndexedDB
2. Chamar `enqueueMutation(uuid, entityType, mutationType, payload)`
3. Sync engine processa fila periodicamente
4. Sucesso: `markMutationsSynced(ids)`
5. Erro: `incrementMutationRetry(id)` com backoff exponencial
