---
name: Incremental Sync Structure (Firestore)
description: Estrutura de documentos por entidade no Firestore para sync incremental
type: project
---

**Fase 3 Task 9 Completa** - Implementado em 2026-03-21

## Implementação

Criada estrutura para sync incremental por entidade no Firestore, evoluindo do snapshot-based approach (que reescreve todo o backup a cada mudança) para um modelo onde cada entidade é sincronizada individualmente.

## Arquivo criado

### `src/lib/incrementalSync.ts` (novo)

Funções implementadas:

**Push de entidades:**
- `pushEntityToCloud(uid, tableName, entity)` - Push de uma única entidade usando setDoc com merge
- `batchPushEntitiesToCloud(uid, tableName, entities, concurrencyLimit)` - Push em lote com controle de concorrência

**Pull de entidades:**
- `pullEntitiesFromCloud(uid, tableName, since?)` - Pull de entidades modificadas desde um timestamp
- `pullAllEntitiesFromCloud(uid, tableName)` - Pull de todas as entidades de uma coleção

**Delete de entidades:**
- `deleteEntityInCloud(uid, tableName, uuid, deletedAt)` - Delete lógico (tombstone) no Firestore
- `hardDeleteEntityInCloud(uid, tableName, uuid)` - Delete permanente (apenas cleanup)

**Metadata de sync:**
- `getLastSyncTimestamp(uid, tableName)` - Obtém timestamp da última sincronização
- `updateLastSyncTimestamp(uid, tableName, timestamp)` - Atualiza timestamp de sync

## Estrutura de coleções Firestore

As entidades serão armazenadas em subcoleções por tipo:

```
users/{uid}/
  games/
    {uuid} → { game data }
  library-entries/
    {uuid} → { entry data }
  play-sessions/
    {uuid} → { session data }
  reviews/
    {uuid} → { review data }
  lists/
    {uuid} → { list data }
  tags/
    {uuid} → { tag data }
  stores/
    {uuid} → { store data }
  platforms/
    {uuid} → { platform data }
  goals/
    {uuid} → { goal data }
  saved-views/
    {uuid} → { view data }
  import-jobs/
    {uuid} → { job data }
  library-entry-stores/
    {uuid} → { relation data }
  library-entry-lists/
    {uuid} → { relation data }
  game-tags/
    {uuid} → { relation data }
  game-platforms/
    {uuid} → { relation data }
  _sync_metadata/
    {collectionName} → { lastSyncAt, updatedAt }
```

## Conversão de timestamps

Os timestamps são convertidos automaticamente entre:
- Local: ISO string (`2026-03-21T12:00:00.000Z`)
- Firestore: `Timestamp` object

## Controle de concorrência

`batchPushEntitiesToCloud` executa operações em lotes com limite de concorrência (default: 10) para evitar rate limiting do Firestore.

## Próximos passos

- Implementar `MutationQueue` local para filas de mutações pendentes (Phase 3 Task 10)
- Integrar `pushEntityToCloud` nas ações de mutação do `useBacklogActions`
- Implementar sync incremental baseado em `localRevision` + timestamps por coleção
- Adicionar retry com backoff nas operações (já existente em `src/lib/sync.ts`)

## Testes

9 testes passando em `src/lib/incrementalSync.test.ts`:
- pushEntityToCloud
- pullEntitiesFromCloud (com e sem filtro de tempo)
- deleteEntityInCloud (tombstone)
- hardDeleteEntityInCloud
- batchPushEntitiesToCloud
- getLastSyncTimestamp / updateLastSyncTimestamp
