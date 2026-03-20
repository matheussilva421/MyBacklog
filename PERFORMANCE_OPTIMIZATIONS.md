# Otimizações de Performance Implementadas

**Data:** 2026-03-20
**Projeto:** MyBacklog (Arsenal Gamer)

---

## Resumo das Mudanças

Foram implementadas 4 otimizações críticas de performance para reduzir re-renderizações e melhorar o tempo de resposta da aplicação:

---

## 1. React.memo em Componentes de UI

**Arquivo:** `src/components/cyberpunk-ui.tsx`

**Mudança:** Adicionado `React.memo` em 9 componentes puros:

- `Panel`
- `Tag`
- `Pill`
- `NotchButton`
- `SidebarItem`
- `ProgressBar` (com useMemo para style)
- `SectionHeader`
- `MetricCard`
- `EmptyState`

**Impacto:** Previne re-renderizações desnecessárias quando props não mudam.

**Código:**
```typescript
// Antes
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cx("cp-panel", className)}>{children}</section>;
}

// Depois
export const Panel = React.memo(function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cx("cp-panel", className)}>{children}</section>;
});
```

---

## 2. LibraryCard como Componente Memoizado

**Arquivo:** `src/modules/library/components/LibraryCard.tsx` (novo)

**Mudança:** Extraído `renderLibraryCard` do `LibraryScreen.tsx` para um componente separado com `React.memo`.

**Impacto:**
- Previne re-renderização de todos os cards quando apenas um muda
- Reduz alocação de memória ao evitar recriação da função de renderização
- Melhora performance da lista com bibliotecas grandes (100+ jogos)

**Código:**
```typescript
export const LibraryCard = React.memo(function LibraryCard({
  game,
  isSelected,
  isActive,
  onSelectGame,
  onToggleSelection,
}: LibraryCardProps) {
  // ... renderização do card
});
```

**Arquivo atualizado:** `src/modules/library/components/LibraryScreen.tsx`

---

## 3. Otimização do useLibraryState useMemo Chain

**Arquivo:** `src/modules/library/hooks/useLibraryState.ts`

**Mudança:** Reduzido de 8 useMemo independentes para 4 useMemo combinados:

### Antes:
1. `tagNamesByEntryId` - Map de nomes de tags
2. `listIdsByEntryId` - Map de IDs de listas
3. `listNamesByEntryId` - Map de nomes de listas (depende de #2)
4. `listCountsById` - Map de contagens (depende de #2)
5. `listOptions` - Array de opções (depende de #4)
6. `searchedGames` - Filter por busca (depende de #1, #3)
7. `libraryGames` - Filter por status/lista (depende de #6)
8. `sortedLibraryGames` - Sort (depende de #7)
9. `groupedLibraryGames` - Group (depende de #8)

### Depois:
1. `derivedMaps` - Combina #1-4 em um único useMemo
2. `listOptions` - Mantido, mas depende do Map combinado
3. `filteredAndSearchedGames` - Combina #6-7 em um único filter
4. `sortedAndGroupedGames` - Combina #8-9 em um único useMemo

**Impacto:**
- Reduz recálculos em cascata quando dados mudam
- Diminui alocação de memória intermediária
- Simplifica dependências do useMemo

**Código:**
```typescript
// Combinar todos os maps derivados em um único useMemo
const derivedMaps = useMemo(() => {
  const tagNamesMap = new Map<number, string>();
  const listIdsMap = new Map<number, number[]>();
  const listCountsMap = new Map<number, number>();

  // Processar tags
  for (const relation of gameTagRows) {
    // ...
  }

  // Processar listas (single-pass)
  for (const relation of libraryEntryListRows) {
    // Atualiza listIdsMap E listCountsMap no mesmo loop
  }

  // Processar nomes das listas
  const listNamesMap = new Map<number, string>();
  for (const [entryId, listIds] of listIdsMap.entries()) {
    // ...
  }

  return { tagNamesMap, listIdsMap, listNamesMap, listCountsMap };
}, [gameTagRows, libraryEntryListRows, tagById, listById]);

// Combinar search e filter em um único useMemo
const filteredAndSearchedGames = useMemo(() => {
  return games.filter((game) => {
    // Search
    if (hasSearchQuery) { /* ... */ }
    // Status filter
    if (hasStatusFilter && game.status !== filter) return false;
    // List filter
    if (hasListFilter && !listIdsMap.get(game.id)?.includes(selectedListFilter)) return false;
    return true;
  });
}, [games, searchQuery, filter, selectedListFilter, tagNamesMap, listNamesMap, listIdsMap]);

// Combinar sort e group em um único useMemo
const sortedAndGroupedGames = useMemo(() => {
  const sorted = sortLibraryGames(filteredAndSearchedGames, recordsByEntryId, sortBy, sortDirection);
  const grouped = groupLibraryGames(sorted, recordsByEntryId, groupBy);
  return { sorted, grouped };
}, [filteredAndSearchedGames, recordsByEntryId, sortBy, sortDirection, groupBy]);
```

---

## 4. useBacklogApp - Remoção de Hooks de Feature

**Arquivo:** `src/hooks/useBacklogApp.ts`

**Mudança:** Removidos hooks de feature que eram executados para todas as telas:

- `useLibraryState` - Movido para `LibraryScreen`
- `useDashboardInsights` - Movido para `DashboardScreen`
- `usePlannerInsights` - Movido para `PlannerScreen`
- `useSelectedGamePage` - Movido para `GamePageScreen`
- `useBuildSessionInsights` - Movido para `SessionsScreen`

**Impacto:**
- Previne cálculos desnecessários para telas não visíveis
- Reduz memória alocada com dados derivados não utilizados
- Permite que cada tela gerencie seu próprio ciclo de vida de dados

**Nota:** Esta mudança requer atualizações nos componentes de tela para usar os hooks diretamente. Os arquivos afetados são:
- `src/components/AppShellScreenContent.tsx`
- `src/modules/dashboard/components/DashboardScreen.tsx`
- `src/modules/library/components/LibraryScreen.tsx`
- `src/modules/planner/components/PlannerScreen.tsx`
- `src/modules/game-page/components/GamePageScreen.tsx`
- `src/modules/sessions/components/SessionsScreen.tsx`

---

## Métricas de Performance Esperadas

| Métrica | Antes (Est.) | Depois (Est.) | Melhoria |
|---------|--------------|---------------|----------|
| Re-renders por navegação | ~50+ | < 20 | 60% |
| Memória (biblioteca média) | ~100 MB | < 70 MB | 30% |
| FCP | ~1.5s | < 1.0s | 33% |
| TTI | ~2.5s | < 1.8s | 28% |

---

## Próximos Passos Recomendados

1. **Implementar Dexie.liveQuery** para subscrições incrementais (substituir `useBacklogDataState.refreshData`)
2. **Web Worker para badges e monthly recap** (`buildPersonalBadges`, `buildMonthlyRecap`)
3. **Virtualização de listas grandes** para bibliotecas com 500+ jogos
4. **Paginação de dados IndexedDB** para carga sob demanda
5. **Service Worker** para cache de assets e code-splitting mais granular

---

## Como Verificar

Execute o React DevTools Profiler durante:
1. Navegação entre telas
2. Filtro/busca na biblioteca
3. Abertura de modal de edição

Compare o número de commits e o tempo de renderização antes/depois.

---

*Documentação gerada em 2026-03-20*
