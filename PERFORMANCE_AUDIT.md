# Relatório de Auditoria de Performance

**Data:** 2026-03-20
**Projeto:** MyBacklog (Arsenal Gamer)
**Stack:** React 18 + Vite + TypeScript + Dexie (IndexedDB) + Lucide Icons

---

## Sumário Executivo

| Severidade | Quantidade |
|------------|------------|
| Crítico    | 3          |
| Alto       | 8          |
| Médio      | 12         |
| Baixo      | 6          |

---

## Crítico - Impacto Significativo em Performance

### 1. Re-renderização em cascata no useBacklogApp

**Arquivo:** `src/hooks/useBacklogApp.ts`
**Linhas:** 62-78, 80-442

**Problema:** O hook `useBacklogApp` compõe TODOS os hooks de feature (useLibraryState, useDashboardInsights, usePlannerInsights, useSelectedGamePage, etc.) mesmo quando o usuário está em apenas uma tela. Isso causa:
- Cálculos desnecessários de dados derivados para telas não visíveis
- Re-renderizações mesmo quando apenas uma tela específica mudou
- Uso excessivo de memória com maps/arrays que não são usados

**Impacto Estimado:** Alto - Afeta todas as navegações e atualizações de estado

**Recomendação:**
```typescript
// Mover hooks de feature para dentro de cada componente de tela
// Ex: DashboardScreen chama useDashboardInsights diretamente
// LibraryScreen chama useLibraryState diretamente
```

---

### 2. useBacklogSelectors - useMemo em excesso sem dependências otimizadas

**Arquivo:** `src/hooks/useBacklogSelectors.ts`
**Linhas:** 64-105

**Problema:** Múltiplos useMemo criam maps e arrays complexos que dependem de `records` (que também é memoizado). A cadeia de dependências causa recálculos em cascata:
- `records` depende de `data.gameRows` e `data.libraryEntryRows`
- `recordsByEntryId`, `reviewByEntryId`, `tagById`, `listById` são maps criados a cada mudança
- `games` faz map sobre `records` com transformação complexa

**Impacto Estimado:** Alto - Executado sempre que dados brutos mudam

**Recomendação:**
```typescript
// Usar useMemo com dependências mais granulares
// Considerar useMemo com WeakMap para cache de objetos
// Avaliar uso de biblioteca como Reselect para memoization seletiva
```

---

### 3. Queries IndexedDB não paginadas

**Arquivo:** `src/services/backlogRepository.ts`
**Linhas:** 97-156

**Problema:** `readBacklogDataSnapshot` carrega TODOS os dados de todas as tabelas IndexedDB de uma vez. Com biblioteca grande (1000+ jogos), isso causa:
- Bloqueio da thread principal durante carregamento inicial
- Consumo excessivo de memória
- Lentidão em operações de seed

**Impacto Estimado:** Alto - Afeta inicialização do app

**Recomendação:**
```typescript
// Implementar paginação ou carga lazy por tabela
// Usar IndexedDB cursors para grandes coleções
// Considerar cache em camada superior com stale-while-revalidate
```

---

## Alto - Otimizações Importantes

### 4. Lucide React - Import de TODOS os ícones

**Arquivo:** Múltiplos componentes (21 arquivos)
**Exemplo:** `src/components/AppShell.tsx:11`, `src/modules/library/components/LibraryScreen.tsx:1`

**Problema:** Embora o vite.config.ts tenha code-splitting para `lucide-react` em chunk separado, cada componente importa ícones individualmente. Não há tree-shaking efetivo quando muitos ícones são usados.

**Impacto Estimado:** ~50-80KB no bundle de ícones

**Recomendação:**
```typescript
// Usar imports diretos específicos
import { Activity } from 'lucide-react/activity';
// OU criar um arquivo de ícones usados e importar de lá
```

---

### 5. useLibraryState - Múltiplos useMemo com dependências sobrepostas

**Arquivo:** `src/modules/library/hooks/useLibraryState.ts`
**Linhas:** 59-197

**Problema:** 8 useMemo interdependentes criam cascata de recálculos:
- `tagNamesByEntryId`, `listIdsByEntryId`, `listNamesByEntryId`, `listCountsById`
- `searchedGames`, `libraryGames`, `sortedLibraryGames`, `groupedLibraryGames`

Cada filter/map cria novo array, causando alocação de memória constante.

**Recomendação:**
```typescript
// Combinar useMemo relacionados
// Usar técnicas de memoization seletiva
// Avaliar virtualização para listas grandes
```

---

### 6. useDashboardInsights - Computações complexas sem memoization adequada

**Arquivo:** `src/modules/dashboard/hooks/useDashboardInsights.ts`
**Linhas:** 70-218

**Problema:**
- `stats` (linha 140-176) faz múltiplos filters e reduces sobre `games` e `sessionRows`
- `continuePlayingGames` (linha 188-218) faz filter + sort + slice com computação de score
- `sessionCadenceMap` é memoized mas recalculado sempre que `sessionRows` muda

**Recomendação:**
```typescript
// Memoizar resultados intermediários
// Usar Map para lookups ao invés de filter/find repetidos
// Considerar Web Worker para cálculos pesados de badges/recap
```

---

### 7. buildPersonalBadges e buildMonthlyRecap - Funções pesadas

**Arquivos:**
- `src/modules/dashboard/utils/personalBadges.ts`
- `src/modules/dashboard/utils/monthlyRecap.ts`

**Problema:** Estas funções são chamadas dentro de useMemo mas fazem iterações múltiplas sobre arrays grandes. Badges especialmente tem lógica complexa de verificação.

**Recomendação:**
```typescript
// Mover para Web Worker
// Cache com chave baseada em hash dos dados de entrada
// Early exits mais agressivos
```

---

### 8. syncStructuredRelationsForRecord - Transações IndexedDB síncronas

**Arquivo:** `src/core/structuredDataSync.ts`
**Linhas:** 212-226

**Problema:** Cada create/update de LibraryEntry dispara transação que:
- Carrega todas as stores existentes (`ensureStores`)
- Carrega todas as platforms existentes (`ensurePlatforms`)
- Faz múltiplas operações de leitura antes de escrever

**Impacto:** Lento para operações em lote

**Recomendação:**
```typescript
// Cache em memória de stores/platforms conhecidos
// Batch de múltiplas sincronizações
// Usar bulkPut ao invés de add/update individuais
```

---

### 9. AppShell - Renderização de todas as telas via lazy apenas

**Arquivo:** `src/components/AppShell.tsx`
**Linhas:** 84-200+

**Problema:** Embora use lazy() para componentes, o AppShell ainda compõe todos os providers e hooks de estado globalmente. Telas não visíveis ainda consomem memória.

**Recomendação:**
```typescript
// Mover hooks específicos para dentro de cada tela lazy-loaded
// Usar Suspense boundaries mais granulares
```

---

### 10. useBacklogDataState - Snapshot completo a cada refresh

**Arquivo:** `src/hooks/useBacklogDataState.ts`
**Linhas:** 15-23

**Problema:** `refreshData` sempre lê TODAS as tabelas. Não há:
- Carga incremental
- Detecção de mudanças por tabela
- Invalidação seletiva

**Recomendação:**
```typescript
// Implementar subscrição por tabela com Dexie.liveQuery
// Detectar mudanças específicas e atualizar apenas tabelas afetadas
```

---

## Médio - Melhorias de Performance

### 11. Componentes de UI sem React.memo

**Arquivo:** `src/components/cyberpunk-ui.tsx`

**Problema:** Componentes como `Panel`, `NotchButton`, `Pill`, `SectionHeader` são re-renderizados mesmo quando props não mudam.

**Recomendação:**
```typescript
export const Panel = React.memo(function Panel({ children, className, ... }) { ... });
```

---

### 12. LibraryScreen - renderLibraryCard dentro do componente

**Arquivo:** `src/modules/library/components/LibraryScreen.tsx`
**Linhas:** 110-189

**Problema:** `renderLibraryCard` é recriada a cada renderização do LibraryScreen, causando re-render de todos os cards.

**Recomendação:**
```typescript
// Extrair para componente separado com React.memo
const LibraryCard = React.memo(({ game, isSelected, ... }) => { ... });
```

---

### 13. Chaves de lista usando index ou valores não estáveis

**Arquivo:** Múltiplos

**Problema:** Alguns maps usam index como key ou valores derivados que podem mudar.

**Exemplo:** `src/modules/library/components/LibraryScreen.tsx:333`
```typescript
{savedViews.map((view) => {
  const savedViewId = view.id;
  return <div key={savedViewId ?? `${view.scope}-${view.name}`} ...>
```

**Recomendação:** Sempre usar IDs estáveis do banco de dados.

---

### 14. useBacklogActions - Handlers criados sem useCallback

**Arquivo:** `src/hooks/useBacklogActions.ts`

**Problema:** Muitos handlers não usam useCallback, causando re-criação a cada render.

**Recomendação:**
```typescript
// Envolver handlers em useCallback com dependências adequadas
```

---

### 15. Computation em tempo real no Planner

**Arquivo:** `src/modules/planner/utils/scoring.ts`
**Linhas:** 80-138

**Problema:** `computePlannerScore` é chamada para CADA jogo na fila, e cada chamada faz múltiplas verificações de preferências, cadência, goals.

**Recomendação:**
```typescript
// Memoizar scores por jogo+configuração
// Calcular scores apenas quando inputs mudarem
// Usar Web Worker para fila grande
```

---

### 16. Charts SVG - Renderização sem memoization

**Arquivo:** `src/charts.tsx`

**Problema:** Componentes de gráfico recalculam paths SVG a cada render, mesmo com mesmos dados.

**Recomendação:**
```typescript
export const TrendLineChart = React.memo(({ width, height, data }) => { ... });
```

---

### 17. Filtros em cascata no useLibraryState

**Arquivo:** `src/modules/library/hooks/useLibraryState.ts`
**Linhas:** 112-145

**Problema:**
- `searchedGames` filtra por query
- `libraryGames` filtra searchedGames por status/lista
- Se query mudar, ambos são recalculados

**Recomendação:**
```typescript
// Unir filtros em um único pass
// Usar índice para buscas textuais
```

---

### 18. Auto-sync watch key - JSON.stringify de objeto grande

**Arquivo:** `src/hooks/useBacklogSelectors.ts`
**Linhas:** 21-52

**Problema:** `createAutoSyncWatchKey` faz JSON.stringify de arrays grandes de dados para criar chave de sincronização.

**Recomendação:**
```typescript
// Usar hash mais eficiente (ex: MurmurHash)
// Calcular checksum apenas de timestamps/IDs
```

---

### 19. Session analytics - Múltiplas iterações

**Arquivo:** `src/modules/sessions/utils/sessionAnalytics.ts`
**Linhas:** 74-136

**Problema:** `buildSessionCadence` e `buildSessionCadenceMap` fazem múltiplas iterações sobre sessões para calcular estatísticas.

**Recomendação:**
```typescript
// Single-pass computation
// Acumular múltiplas métricas em um reduce
```

---

### 20. Game Page - Múltiplas operações de filter por seleção

**Arquivo:** `src/modules/game-page/hooks/useSelectedGamePage.ts`
**Linhas:** 43-51

**Problema:** Para cada game selecionado, faz filter em sessionRows, gameTagRows, libraryEntryListRows.

**Recomendação:**
```typescript
// Criar maps indexados por libraryEntryId uma vez
// Usar map.get() ao invés de filter()
```

---

### 21. Import/Export - Processamento síncrono grande

**Arquivo:** `src/services/importExportService.ts`
**Linhas:** 536-594

**Problema:** `prepareRestorePreview` cria múltiplos Maps grandes e itera sobre todos os dados do backup de uma vez.

**Recomendação:**
```typescript
// Processar em chunks
// Usar Web Worker para parsing grande
```

---

## Baixo - Micro-otimizações

### 22. Funções utilitárias criadas inline

**Arquivo:** Múltiplos

**Exemplo:** `src/modules/planner/utils/scoring.ts:13-15`
```typescript
function normalizeTokens(values: string[]): Set<string> { ... }
```

**Recomendação:** Mover para módulo utilitário e reutilizar.

---

### 23. String concatenation em loops

**Arquivo:** `src/modules/library/hooks/useLibraryState.ts:65`

**Problema:** Concatenação de strings em loop para tag names.

**Recomendação:**
```typescript
// Usar Array.join()
```

---

### 24. Date parsing repetido

**Arquivo:** Múltiplos

**Problema:** `parseDateInput` é chamada múltiplas vezes para mesma string.

**Recomendação:** Cache de parsing de datas.

---

### 25. TextDecoder em repairLegacyText

**Arquivo:** `src/core/utils.ts:5-17`

**Problema:** Cria novo TextDecoder a cada chamada.

**Recomendação:**
```typescript
const textDecoder = new TextDecoder("utf-8");
export function repairLegacyText(value: string | undefined): string | undefined { ... }
```

---

### 26. SplitCsvTokens - Set creation desnecessária

**Arquivo:** `src/core/utils.ts:23-32`

**Problema:** Cria Set apenas para remover duplicatas, depois converte para Array.

**Recomendação:** Manter como Set quando possível ou usar em operações de lookup.

---

### 27. toLocaleString em formatMonthLabel

**Arquivo:** `src/core/utils.ts:126-131`

**Problema:** `formatMonthLabel` é chamada repetidamente para mesmas datas.

**Recomendação:** Memoizar ou usar cache simples.

---

## Bundle Size Analysis

### Dependências Principais

| Pacote        | Versão      | Tamanho Aprox. |
|---------------|-------------|----------------|
| react         | ^18.3.1     | ~42 KB         |
| react-dom     | ^18.3.1     | ~130 KB        |
| dexie         | ^4.0.8      | ~20 KB         |
| firebase      | ^12.11.0    | ~300 KB+       |
| lucide-react  | ^0.577.0    | ~50-80 KB      |

**Total estimado:** ~600 KB (gzip: ~180 KB)

### Recomendações de Bundle

1. **Firebase:** Carregar módulos sob demanda
```typescript
// Ao invés de importar firebase/app, firebase/auth, etc.
// Usar imports diretos dos módulos necessários
```

2. **Code-splitting por rota/tela:** Já configurado no vite.config.ts, mas pode ser expandido.

3. **Lazy hydration:** Componentes abaixo do fold podem ser carregados após interação.

---

## Thread Principal - Operações Bloqueantes

### Operações Síncronas Identificadas

1. **seedDefaultLibrary** (`src/services/backlogRepository.ts:66-95`)
   - Itera sobre todos os jogos padrão
   - Transação IndexedDB por jogo

2. **readBacklogDataSnapshot** (`src/services/backlogRepository.ts:97-156`)
   - Carrega todas as tabelas de uma vez

3. **importExport operations** (`src/services/importExportService.ts`)
   - Processamento síncrono de backups grandes

4. **structuredDataSync operations** (`src/core/structuredDataSync.ts`)
   - Múltiplas leituras antes de escritas

---

## Recomendações Prioritárias

### Imediatas (1-2 sprints)

1. **Mover hooks de feature para componentes de tela** - Maior impacto
2. **Implementar React.memo em componentes de UI**
3. **Extrair LibraryCard para componente memoizado**
4. **Otimizar useLibraryState useMemo chain**

### Médio Prazo (2-4 sprints)

5. **Implementar Dexie.liveQuery para subscrições incrementais**
6. **Web Worker para badges e monthly recap**
7. **Cache em memória para stores/platforms no sync**
8. **Otimizar queries de game page com maps indexados**

### Longo Prazo (4+ sprints)

9. **Virtualização de listas grandes**
10. **Paginação de dados IndexedDB**
11. **Service Worker para cache de assets**
12. **Revisão completa do bundle Firebase**

---

## Ferramentas Recomendadas para Monitoramento

1. **React DevTools Profiler** - Identificar re-renders
2. **Chrome Performance Tab** - Análise de flame graph
3. **WebPageTest** - Metrics de carregamento
4. **Bundle Analyzer** - `npm install rollup-plugin-visualizer`

---

## Métricas de Sucesso

Após otimizações:

| Métrica                    | Atual (Est.) | Alvo     |
|----------------------------|--------------|----------|
| First Contentful Paint     | ~1.5s        | < 0.8s   |
| Time to Interactive        | ~2.5s        | < 1.5s   |
| Re-renders por navegação   | ~50+         | < 10     |
| Memória (biblioteca média) | ~100 MB      | < 50 MB  |
| Bundle size (gzip)         | ~180 KB      | < 120 KB |

---

*Relatório gerado via análise estática de código em 2026-03-20*
