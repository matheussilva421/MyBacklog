---
name: Soft Delete (Tombstones) Implementation
description: Implementação de soft delete com tombstones para todas as entidades syncáveis
type: project
---

**Fase 2 Task 7 Completa** - Implementado em 2026-03-21

## Implementação

Todas as deleções de entidades agora usam o pattern de soft delete (tombstone) em vez de remoção permanente. Entidades marcadas como deletadas recebem:
- `deletedAt`: timestamp ISO da deleção
- `version`: incrementada em 1
- `updatedAt`: timestamp da atualização
- `updatedByDeviceId`: ID do dispositivo que fez a deleção

## Arquivos criados/modificados

### `src/lib/softDelete.ts` (novo)
Utilitários para soft delete:
- `getDeviceId()` - obtém ou gera device ID persistente
- `isDeleted()` - check se entidade está deletada
- `filterDeleted()` - filtra entidades deletadas de um array
- `softDelete()` - marca entidade como deletada
- `hardDelete()` - remoção permanente (apenas para cleanup)
- `purgeDeletedEntities()` - remove em lote todos os tombstones

### Deleções convertidas para softDelete

**Hooks:**
- `useBacklogActions.ts` - handleDeleteSelectedGame, handleGoalDelete, handleListDelete, handleReviewSave, handleGameTagsSave, handleGameListsSave, handleBatchEditSubmit, handleCatalogDuplicateMerge, handleCatalogRepair, handleCatalogConsolidateAliasGroup, handleDeleteSavedView

**Core:**
- `src/core/structuredDataSync.ts` - syncLibraryEntryStoreRelations, syncGamePlatformRelations

**Modules:**
- `src/modules/sessions/utils/sessionMutations.ts` - deletePlaySession

## Testes

252 testes passando, incluindo 12 testes específicos para softDelete em `src/lib/softDelete.test.ts`.

## Como aplicar

Sempre que for deletar uma entidade syncável, use:
```typescript
const deviceId = await getDeviceId();
await softDelete("tableName", entityId, deviceId);
```

Para verificar se uma entidade está deletada:
```typescript
if (isDeleted(entity)) { /* está deletada */ }
```

Para filtrar entidades deletadas de um array:
```typescript
const activeEntities = filterDeleted(allEntities);
```

## Próximos passos

- Phase 3 Task 9: Criar estrutura de documentos por entidade no Firestore para sync incremental
- Implementar cleanup periódico de tombstones antigos com `purgeDeletedEntities()`
