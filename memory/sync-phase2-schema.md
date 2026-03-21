---
name: Sync Architecture Phase 2 - Schema Changes Complete
description: Implementação dos campos SyncMetadata (uuid, version, deletedAt, updatedByDeviceId) em todas as entidades
type: project
---

**Fase 2 Task 6 Completa** - Implementado em 2026-03-21

## Mudanças no Schema

Todas as entidades syncáveis agora incluem os campos:
- `uuid: string` - Identificador único universal
- `version: number` - Versão do registro para controle de concorrência
- `deletedAt?: string | null` - Timestamp de deleção (tombstone)
- `updatedByDeviceId?: string` - ID do dispositivo que fez a última modificação

### Entidades atualizadas:
- Game, LibraryEntry, PlaySession, Review, List, Tag, Store, Platform, Goal, SavedView, ImportJob
- Entidades de relação: LibraryEntryStore, LibraryEntryList, GameTag, GamePlatform

## Arquivos modificados:
1. `src/core/types.ts` - Adicionado SyncMetadata em todas as interfaces
2. `src/core/db.ts` - Versão 7 do schema com índices para uuid e deletedAt
3. `src/core/utils.ts` - Adicionado `generateUuid()`
4. `src/core/syncEntity.ts` - Criado helpers comSyncMetadata e withUpdateMetadata
5. `src/core/structuredDataSync.ts` - Atualizado para gerar uuid/version
6. `src/core/structuredTables.ts` - Atualizado para gerar uuid/version
7. `src/hooks/useBacklogActions.ts` - Todas as mutações agora usam uuid/version
8. `src/modules/*/...` - Atualizado todos os arquivos que criam entidades

## Migração
A migração v7 no Dexie gera automaticamente uuids para registros existentes e inicializa a tabela localRevision.

**Como aplicar:** Entidades criadas sem uuid/version devem usar `generateUuid()` e `version: 1`. Entidades atualizadas devem incrementar `version` e atualizar `updatedAt`.
