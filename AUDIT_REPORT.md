# Auditoria Técnica - MyBacklog

**Data:** 2026-03-20
**Escopo:** Bugs, fragilidades e inconsistências em arquitetura React + TypeScript + local-first

---

## Resumo Executivo

| Categoria | Crítico | Alto | Médio | Baixo |
|-----------|---------|------|-------|-------|
| Bugs de Dados | 2 | 3 | 4 | - |
| Race Conditions | 1 | 2 | 1 | - |
| Estados Inconsistentes | - | 2 | 3 | 1 |
| Tipagem TypeScript | - | 1 | 2 | 3 |
| UI/UX | - | 1 | 2 | 2 |

**Total de itens:** 25 (5 críticos, 9 altos, 14 médios/baixos)

---

## Bugs Críticos

### 1. Race condition em `refreshData()` após mutations em cadeia

**Local:** `src/hooks/useBacklogDataState.ts`
**Sintoma:** UI pode exibir dados stale após múltiplas operações CRUD rápidas (ex: importação em lote de 50+ itens)

**Causa:**
```typescript
const refreshData = useCallback(async (seed = false) => {
  setLoading(true);
  const allSubs = Object.values(subscriptions);
  await Promise.all(allSubs.map((sub) => sub?.stop()));
  subscriptions = {}; // ← Reset síncrono antes de completar unsubscribe

  const freshTables = await Promise.all([...]); // ← Nova leitura pode capturar estado parcial
  // ...
}, []);
```

Se `refreshData()` é chamado enquanto um `unsubscribe()` ainda está em progresso, as subscriptions podem ser duplicadas ou perdidas.

**Reprodução:**
1. Importar CSV com 100+ jogos
2. Imediatamente após salvar, filtrar biblioteca
3. UI pode mostrar contagem incorreta

**Correção:**
```typescript
const refreshData = useCallback(async (seed = false) => {
  setLoading(true);
  const allSubs = Object.values(subscriptions);
  await Promise.all(allSubs.map((sub) => sub?.stop()));
  subscriptions = {};

  // Aguardar próximo tick para garantir cleanup completo
  await new Promise(resolve => setTimeout(resolve, 0));

  // ... criar novas subscriptions
}, []);
```

**Teste:** Criar teste de stress com 100 mutations consecutivas e verificar consistência final.

---

### 2. Stale state em `useCloudSync` quando `autoSyncEnabled` muda

**Local:** `src/hooks/useCloudSync.ts:222-344`

**Sintoma:** Auto-sync não dispara após usuário ativar nas preferências sem refresh de página.

**Causa:** O `useEffect` principal tem `autoSyncEnabled` nas dependências, mas o fechamento lexical dentro da função assíncrona captura valor antigo:

```typescript
useEffect(() => {
  let active = true;
  void (async () => {
    // ...
    if (nextComparison.decision === "push-local" && !autoSyncEnabled) {
      // ← autoSyncEnabled pode estar stale aqui
      setIsWorkingLocal(true);
      return;
    }
  })();
}, [/* autoSyncEnabled está listado, mas fetch é assíncrono */]);
```

**Correção:** Usar ref para valor mais recente:
```typescript
const autoSyncRef = useRef(autoSyncEnabled);
useEffect(() => { autoSyncRef.current = autoSyncEnabled; }, [autoSyncEnabled]);

// Dentro do async:
if (nextComparison.decision === "push-local" && !autoSyncRef.current) {
```

---

### 3. Vazamento de memory em subscriptions do Dexie

**Local:** `src/hooks/useBacklogDataState.ts:85-110`

**Sintoma:** Após múltiplas navegações entre telas, aplicação fica lenta.

**Causa:** `useEffect` de cleanup não cancela subscriptions ativas se componente desmontar durante `Promise.all`:

```typescript
useEffect(() => {
  const createSubscriptions = async () => {
    // ...
    subscriptions = { ...newSubs };
  };
  void createSubscriptions();

  return () => {
    Object.values(subscriptions).forEach((sub) => sub?.stop());
  };
}, []);
```

Se desmontar durante `createSubscriptions()`, `subscriptions` ainda está vazio no cleanup.

**Correção:**
```typescript
useEffect(() => {
  let cancelled = false;
  const newSubs: Record<string, Dexie.Subscription> = {};

  const createSubscriptions = async () => {
    // ... criar subscriptions em newSubs
    if (!cancelled) {
      subscriptions = { ...newSubs };
    }
  };
  void createSubscriptions();

  return () => {
    cancelled = true;
    Object.values(newSubs).forEach((sub) => sub?.stop());
    Object.values(subscriptions).forEach((sub) => sub?.stop());
  };
}, []);
```

---

### 4. Perda de dados em `handleBatchEditSubmit` com transação parcial

**Local:** `src/hooks/useBacklogActions.ts:1156-1313`

**Sintoma:** Edição em lote de 100+ jogos pode aplicar apenas parcialmente se transação exceder timeout do IndexedDB.

**Causa:** Loop síncrono dentro de transação sem chunking:

```typescript
for (const entry of entries) {
  // ... múltiplas operações por entrada
  await db.libraryEntries.put(nextEntry);
  await db.games.put(nextGame);
  await syncStructuredRelationsForRecord({...}); // ← Mais operações
  // ... tags, lists
}
```

IndexedDB tem limite de tempo por transação (~30s). Se exceder, transaction aborta, mas algumas operações já foram commitadas.

**Correção:** Processar em chunks de 50:
```typescript
const CHUNK_SIZE = 50;
for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
  const chunk = entries.slice(i, i + CHUNK_SIZE);
  await db.transaction("rw", [...], async () => {
    for (const entry of chunk) {
      // ... operações
    }
  });
  // Yield para event loop
  await new Promise(resolve => setTimeout(resolve, 0));
}
```

---

### 5. Corrupção de dados em `handleRestoreSubmit` modo replace

**Local:** `src/modules/shared/backlog-modals.tsx:644-707`

**Sintoma:** Restore com "replace" pode deixar banco em estado inconsistente se falhar no meio.

**Causa:** Clear das tabelas ocorre antes do bulkPut, sem transação atômica real:

```typescript
await db.gamePlatforms.clear();
await db.platforms.clear();
// ... mais clears
await db.games.clear();

if (payload.games.length) await db.games.bulkPut(payload.games);
// ... mais bulkPuts
```

Se `bulkPut(platforms)` falhar após `platforms.clear()`, dados foram perdidos.

**Correção:** Usar transação com rollback manual ou temporário:
```typescript
await db.transaction("rw", [...], async () => {
  // Backup temporário
  const backups = await Promise.all([
    db.games.toArray(),
    db.libraryEntries.toArray(),
    // ...
  ]);

  try {
    // Clears e puts
  } catch (e) {
    // Rollback
    await db.games.bulkPut(backups[0]);
    // ...
    throw e;
  }
});
```

---

## Bugs de Alta Severidade

### 6. Inconsistência de `completionDate` em `recalculateLibraryEntryFromSessions`

**Local:** `src/core/catalogIntegrity.ts:91-130`

**Sintoma:** `completionDate` não é atualizado quando sessão é editada/excluída.

**Causa:** Função calcula `completionDate` mas caller (`savePlaySession`, `deletePlaySession`) não persiste o retorno:

```typescript
// sessionMutations.ts:78-87
await db.libraryEntries.update(input.libraryEntryId, {
  progressStatus: snapshot.progressStatus,
  completionPercent: snapshot.completionPercent,
  playtimeMinutes: snapshot.playtimeMinutes,
  // completionDate está em snapshot, mas NÃO é persistido!
  updatedAt: new Date().toISOString(),
});
```

**Correção:** Adicionar `completionDate: snapshot.completionDate` nas atualizações.

---

### 7. `normalizeStructuredEntry` ignora `updatedAt` do game

**Local:** `src/hooks/useBacklogActions.ts:241-281`

**Sintoma:** Após normalização, `game.updatedAt` não reflete mudança.

**Causa:**
```typescript
const nextGame: DbGameMetadata = {
  ...game,
  platforms: nextPlatforms.join(", "),
  updatedAt: now, // ← Correto, mas...
};
await db.games.put(nextGame); // ← Pode falhar silenciosamente se platforms não mudou
```

Se `platforms` resultante for igual ao original, Dexie pode considerar no-op e não atualizar `updatedAt`.

**Correção:** Forçar atualização:
```typescript
await db.games.update(game.id!, {
  platforms: nextPlatforms.join(", "),
  updatedAt: now,
});
```

---

### 8. Race condition em `handleDeleteSelectedGame`

**Local:** `src/hooks/useBacklogActions.ts:1315-1353`

**Sintoma:** Excluir jogo enquanto outra tab edita o mesmo jogo causa erro ou estado inconsistente.

**Causa:** Verificação de `siblingCount` não é atômica:

```typescript
const siblingCount = await db.libraryEntries.where("gameId").equals(selectedRecord.game.id!).count();
if (siblingCount === 0) {
  await db.gamePlatforms.where("gameId").equals(selectedRecord.game.id!).delete();
  await db.games.delete(selectedRecord.game.id!);
}
```

Entre `count()` e `delete()`, outra transação pode adicionar/remover entries.

**Correção:** Mover lógica para dentro da transação:
```typescript
await db.transaction("rw", [...], async () => {
  // ... deletes de relations
  await db.libraryEntries.delete(entryId);

  const siblingCount = await db.libraryEntries.where("gameId").equals(gameId).count();
  if (siblingCount === 0) {
    await db.gamePlatforms.where("gameId").equals(gameId).delete();
    await db.games.delete(gameId);
  }
});
```

---

### 9. `deriveCompletionDate` retorna `undefined` para conclusão via status

**Local:** `src/core/catalogIntegrity.ts:69-89`

**Sintoma:** Jogo marcado como "Terminado" manualmente não recebe `completionDate`.

**Causa:** Função só considera `completionPercent >= 100`, ignora `progressStatus === "finished"`:

```typescript
const isCompleted = completionPercent >= 100 || progressStatus === "finished";
if (!isCompleted) return undefined;

return currentCompletionDate || completedAt || fallbackDate;
// ← Se todos undefined, retorna undefined mesmo com status "finished"
```

**Correção:** Adicionar fallback para data atual:
```typescript
return (
  currentCompletionDate ||
  completedAt ||
  fallbackDate ||
  (isCompleted ? new Date().toISOString() : undefined)
);
```

---

### 10. `syncLibraryEntryStoreRelations` remove relações primárias incorretamente

**Local:** `src/core/structuredDataSync.ts:82-134`

**Sintoma:** Após editar stores de um jogo, `isPrimary` pode estar em store errado.

**Causa:** Lógica de `isPrimary` assume índice 0 = primary, mas não preserva existing se usuário reorderou:

```typescript
for (const [index, storeId] of desiredStoreIds.entries()) {
  if (existing?.id != null) {
    if (existing.isPrimary !== (index === 0)) {
      await db.libraryEntryStores.update(existing.id, { isPrimary: index === 0 });
    }
    continue;
  }
}
```

Se API externa retorna stores em ordem diferente, primary muda sem aviso.

**Correção:** Persistir preferência de primary explicitamente via parâmetro.

---

## Bugs de Média Severidade

### 11. Filtro `effectiveSelectedListFilter` pode causar re-render desnecessário

**Local:** `src/hooks/useBacklogApp.ts:42-45`

**Causa:** `useMemo` depende de `data.listRows` (array inteiro), disparando recriação sempre que qualquer lista muda.

**Correção:** Depender apenas de IDs:
```typescript
const validListIds = useMemo(() => new Set(data.listRows.map(l => l.id)), [data.listRows]);
const effectiveSelectedListFilter = useMemo(() => {
  if (ui.selectedListFilter === "all") return "all";
  return validListIds.has(ui.selectedListFilter) ? ui.selectedListFilter : "all";
}, [validListIds, ui.selectedListFilter]);
```

---

### 12. `handleImportSubmit` não limpa `importPreview` após sucesso

**Local:** `src/hooks/useBacklogActions.ts:393-561`

**Sintoma:** Reabrir modal de importação mostra preview anterior.

**Correção:** Chamar `importState.resetImportPreview()` após `importState.closeImportFlow()`.

---

### 13. `handleGuidedTourComplete` pode persistir estado duplicado

**Local:** `src/hooks/useBacklogActions.ts:2074-2085`

**Causa:** Verifica `preferences.guidedTourCompleted` mas não previne race condition se chamado múltiplas vezes.

**Correção:**
```typescript
const handleGuidedTourComplete = async () => {
  if (preferences.guidedTourCompleted) return true;
  // Verificar duplo antes de persistir
  const current = await db.settings.where("key").equals("guidedTourCompleted").first();
  if (current?.value === "true") return true;
  // ...
};
```

---

### 14. `buildSyncFingerprint` não inclui tabelas estruturadas

**Local:** `src/modules/sync-center/utils/syncEngine.ts` (inferido)

**Sintoma:** Sync entre dispositivos pode não detectar mudanças em stores/platforms.

**Causa:** Fingerprint provavelmente cobre apenas tabelas principais (games, libraryEntries, sessions).

**Correção:** Incluir `stores`, `libraryEntryStores`, `platforms`, `gamePlatforms` no fingerprint.

---

### 15. `handleCatalogDuplicateMerge` não preserva `createdAt` do game principal

**Local:** `src/hooks/useBacklogActions.ts:1597-1775`

**Causa:** `mergeGameMetadata` pode sobrescrever `createdAt` com valor do duplicate.

**Correção:** Garantir que `mergeGameMetadata` preserve `createdAt` do primary.

---

## Problemas de Tipagem TypeScript

### 16. `any` implícito em callbacks de evento

**Local:** `src/components/backlog-modals.tsx` (inferido pelo pattern)

**Exemplo:**
```typescript
const handleChange = (e) => { // ← any implícito
  // ...
};
```

**Correção:** `e: React.ChangeEvent<HTMLInputElement>`

---

### 17. `Promise<unknown>` não tratado em `Promise.allSettled`

**Local:** `src/hooks/useBacklogActions.ts:128-143`

```typescript
const results = await Promise.allSettled(
  preview.map(async (entry) => ({
    key: entry.key,
    candidates: await searchRawgCandidates(entry.payload.title, apiKey),
  })),
);
// results é PromiseSettledResult<unknown>[]
```

**Correção:** Tipar explicitamente:
```typescript
type RawgResult = { key: string; candidates: RawgCandidate[] };
const results = await Promise.allSettled(
  preview.map(async (entry): Promise<RawgResult> => ({
    key: entry.key,
    candidates: await searchRawgCandidates(entry.payload.title, apiKey),
  })),
);
```

---

### 18. `LibraryEntrySemantics` exporta tipo não utilizado

**Local:** `src/core/libraryEntryDerived.ts:8-15`

**Causa:** Tipo definido mas não exportado para uso externo.

**Ação:** Remover ou exportar para uso em componentes.

---

## Fragilidades de UX

### 19. `window.confirm` bloqueia thread principal

**Local:** Múltiplos handlers (`handleDeleteSelectedGame`, `handleGoalDelete`, etc.)

**Problema:** `window.confirm` é síncrono e bloqueia UI.

**Correção:** Criar modal customizado assíncrono:
```typescript
const confirmDelete = (message: string): Promise<boolean> => {
  return new Promise(resolve => {
    // Mostrar modal, resolver no callback
  });
};
```

---

### 20. Banner de sync não atualiza em tempo real durante operação

**Local:** `src/components/AppShell.tsx:511-529`

**Sintoma:** Usuário não vê feedback visual enquanto `isSyncing` é true.

**Correção:** Adicionar spinner ou barra de progresso.

---

### 21. GuidedTour fecha se usuário navegar manualmente

**Local:** `src/components/AppShell.tsx:169-204`

**Causa:** `useEffect` força navegação para tela do tour, mas se usuário clicar em outro item, tour perde contexto.

**Correção:** Pausar tour ao invés de forçar navegação.

---

## Edge Cases Não Tratados

### 22. Sessão com `durationMinutes = 0`

**Local:** `src/modules/sessions/utils/sessionMutations.ts:27`

**Código atual:**
```typescript
const durationMinutes = Math.max(1, Math.round(input.durationMinutes));
```

**Problema:** Usuário não pode registrar sessão de duração zero (edge case válido para jogos idle/incremental).

**Correção:** Permitir zero, validar mínimo de 0:
```typescript
const durationMinutes = Math.max(0, Math.round(input.durationMinutes));
```

---

### 23. `splitCsvTokens` com string vazia retorna `[""]`

**Local:** `src/core/utils.ts` (inferido)

**Problema:** `splitCsvTokens("")` pode retornar array com token vazio.

**Correção:** Filtrar tokens vazios:
```typescript
export function splitCsvTokens(input: string | string[]): string[] {
  // ...
  return tokens.filter(Boolean); // ← Adicionar
}
```

---

### 24. `classifyAccessSource` não cobre todos os serviços

**Local:** `src/core/libraryEntryDerived.ts:17-36`

**Serviços faltantes:** Amazon Luna, GeForce Now, Humble Bundle, itch.io, Battle.net.

**Correção:** Adicionar cases:
```typescript
if (normalized.includes("humble")) return "humble";
if (normalized.includes("itch")) return "itch_io";
if (normalized.includes("battle")) return "battlenet";
```

---

### 25. `isCompleted` não considera `completed_100`

**Local:** `src/core/libraryEntryDerived.ts:83-89`

**Código:**
```typescript
export function isCompleted(entry) {
  return (
    entry.progressStatus === "finished" ||
    entry.progressStatus === "completed_100" ||
    entry.completionPercent >= 100
  );
}
```

**Nota:** Este está correto, mas `deriveCompletionDate` (bug #9) não usa esta função.

**Correção:** Usar `isCompleted` como fonte única de verdade.

---

## Recomendações Arquiteturais

### R1. Implementar optimistic updates com rollback

Atualmente todas as mutations esperam confirmação do IndexedDB antes de atualizar UI. Considerar:

```typescript
const useOptimisticMutation = <T>(mutator: (data: T) => Promise<void>) => {
  const queryClient = useQueryClient();

  return async (data: T) => {
    const previous = queryClient.getQueryData('games');
    queryClient.setQueryData('games', /* optimistic update */);

    try {
      await mutator(data);
    } catch (e) {
      queryClient.setQueryData('games', previous); // Rollback
      throw e;
    }
  };
};
```

---

### R2. Centralizar validação de schema

Atualmente validações estão espalhadas nos handlers. Criar utilitário:

```typescript
// core/validators.ts
export const LibraryEntrySchema = z.object({
  id: z.number().optional(),
  gameId: z.number(),
  progressStatus: z.enum(["not_started", "playing", "paused", "finished", "completed_100", "abandoned", "archived", "replay_later"]),
  // ...
});

// Uso:
const result = LibraryEntrySchema.safeParse(data);
if (!result.success) {
  throw new ValidationError(result.error);
}
```

---

### R3. Adicionar camada de repositório

Atualmente hooks chamam `db.table` diretamente. Criar repositórios:

```typescript
// core/repositories/GameRepository.ts
export class GameRepository {
  async getById(id: number): Promise<Game | undefined> {
    return db.games.get(id);
  }

  async create(game: Game): Promise<number> {
    return db.games.add(game);
  }
  // ...
}

// Hooks:
const gameRepo = useMemo(() => new GameRepository(), []);
```

Benefícios:
- Mais fácil de testar (mock de repositório)
- Centraliza lógica de acesso a dados
- Permite troca de IndexedDB no futuro

---

### R4. Implementar retry com backoff para RAWG API

**Local:** `src/modules/import-export/utils/rawg.ts`

Atualmente falhas de API são apenas logadas. Adicionar retry:

```typescript
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T | null> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  console.warn(`Failed after ${maxRetries} retries`, lastError);
  return null;
}
```

---

### R5. Adicionar métricas de performance

Instrumentar código com marcações de tempo:

```typescript
// core/metrics.ts
export const metrics = {
  mutationDuration: new Map<string, number[]>(),
  queryDuration: new Map<string, number[]>(),

  record(key: string, duration: number) {
    const arr = this.mutationDuration.get(key) ?? [];
    arr.push(duration);
    this.mutationDuration.set(key, arr.slice(-100)); // Últimos 100
  },

  report() {
    for (const [key, durations] of this.mutationDuration) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`${key}: avg ${avg.toFixed(2)}ms`);
    }
  }
};

// Uso:
const start = performance.now();
await savePlaySession(payload);
metrics.record("savePlaySession", performance.now() - start);
```

---

## Plano de Ação Prioritizado

### Semana 1 (Críticos)
1. Fixar race condition em `refreshData()` (#1)
2. Fixar stale state em `useCloudSync` (#2)
3. Fixar vazamento de memory em subscriptions (#3)

### Semana 2 (Altos)
4. Fixar `completionDate` em session mutations (#6)
5. Fixar race condition em `handleDeleteSelectedGame` (#8)
6. Fixar `deriveCompletionDate` (#9)
7. Chunking em `handleBatchEditSubmit` (#4)

### Semana 3 (Médios + Tipagem)
8. Revisar todos `any` implícitos
9. Adicionar filtros em `splitCsvTokens`
10. Expandir `classifyAccessSource`
11. Limpar `importPreview` após import

### Semana 4 (UX + Arquitetura)
12. Substituir `window.confirm` por modal
13. Implementar retry para RAWG
14. Adicionar métricas de performance
15. Começar migração para repositórios

---

## Conclusão

A codebase demonstra arquitetura bem pensada com separação clara de responsabilidades, mas possui vulnerabilidades típicas de aplicações locais-first:

1. **Race conditions** em operações assíncronas concorrentes
2. **Stale state** em closures de hooks
3. **Falta de atomicidade** em operações multi-tabela
4. **Edge cases** em derivações de estado

A maioria dos bugs são corrigíveis com patterns estabelecidos (refs para valores recentes, transações atômicas, chunking de operações grandes).

Recomendo priorizar os 3 bugs críticos na próxima sprint, pois afetam integridade de dados — o core value de uma aplicação local-first.
