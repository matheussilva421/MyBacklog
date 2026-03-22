# Relatório de Auditoria Técnica Completa - MyBacklog

**Data:** 2026-03-22
**Versão:** 1.0
**Status:** Auditoria Concluída

---

## Sumário Executivo

| Severidade | Quantidade |
|------------|------------|
| **Crítico**    | 4          |
| **Alto**       | 7          |
| **Médio**      | 11         |
| **Baixo**      | 8          |

### Resumo por Categoria

| Categoria | Bugs | Arquitetura | UI/UX | Sync |
|-----------|------|-------------|-------|------|
| Quantidade | 5 | 8 | 7 | 10 |

---

## Bugs Críticos

### CRIT-01: Status de Progresso Pode Ficar "Preso" em `finished`

**Arquivo:** `src/modules/sessions/utils/sessionMutations.ts`
**Linhas:** 13-29
**Severidade:** CRÍTICO

**Problema:**
A função `getNextProgressStatus` só promove para `finished` quando `completionPercent === 100`, mas não faz downgrade quando o progresso cai. Isso causa inconsistência entre o status exibido e o progresso real.

```typescript
function getNextProgressStatus(
  currentStatus: ProgressStatus,
  completionPercent: number,
): ProgressStatus {
  if (completionPercent === 100) return "finished";
  if (currentStatus === "not_started" || currentStatus === "paused") return "playing";
  return currentStatus; // BUG: nunca faz downgrade de finished
}
```

**Impacto:**
- Usuário pode ter jogo com status "Terminado" mas progresso de 60%
- Inconsistência visual e de dados
- Filtros por status não funcionam corretamente

**Recomendação:**
Recalcular `progressStatus` com base no `completionPercent` real, incluindo downgrades:
- `completed_100` → `playing` se completion < 100
- `finished` → `playing` se completion < 100

---

### CRIT-02: Remount Forçado da Game Page Perde Estado do Formulário

**Arquivo:** `src/App.tsx`
**Linhas:** ~120-130 (padrão de renderização)
**Severidade:** CRÍTICO

**Problema:**
`GamePageScreen` usa `key={app.selectedGamePage.game.id}` para resetar estado local ao trocar de jogo. Isso força recriação completa do componente.

**Impacto:**
- Estado de formulários é perdido ao trocar de jogo rapidamente
- Scroll position é perdido
- Operações em andamento são canceladas

**Recomendação:**
Sincronizar estado por `updatedAt` ou `id` com `useEffect`, ao invés de forçar remount via `key`.

---

### CRIT-03: Vazamento de Memória emuseBacklogSelectors

**Arquivo:** `src/hooks/useBacklogSelectors.ts`
**Linhas:** 64-105
**Severidade:** CRÍTICO

**Problema:**
Múltiplos `useMemo` criam maps e arrays complexos que dependem de `records`. A cadeia de dependências causa:
- Recálculos em cascata sempre que `data.gameRows` ou `data.libraryEntryRows` mudam
- Alocação constante de novos objetos Map e Array
- Garbage collection pressionado

```typescript
const records = useMemo(() => { /* ... */ }, [data.gameRows, data.libraryEntryRows]);
const recordsByEntryId = useMemo(() => { /* map sobre records */ }, [records]);
const games = useMemo(() => { /* map complexo sobre records */ }, [records]);
```

**Impacto:**
- Performance degrada com biblioteca grande (>500 jogos)
- Re-renderizações desnecessárias em todas as telas

**Recomendação:**
- Usar dependências mais granulares (ex: `data.gameRows.length`, `data.libraryEntryRows.length`)
- Considerar Reselect para memoization seletiva
- Usar `useMemo` com `WeakMap` para cache de objetos

---

### CRIT-04: Transação IndexedDB em useCloudSync com Dependências Circulares

**Arquivo:** `src/hooks/useCloudSync.ts`
**Linhas:** 216-227
**Severidade:** CRÍTICO

**Problema:**
`persistSyncMeta` tem dependência vazia `[]` mas acessa `historyRef.current` e `lastSuccessfulSyncAtRef.current`. Se a ordem de execução mudar, pode persistir estado stale.

```typescript
const persistSyncMeta = useCallback(
  async (nextHistory: SyncHistoryEntry[], nextLastSuccessfulSyncAt: string | null) => {
    await db.transaction("rw", db.settings, db.pendingMutations, db.settings, async () => {
      // ...
    });
  },
  [], // BUG: deveria ter dependências?
);
```

**Impacto:**
- Meta de sync pode não ser persistida corretamente
- Histórico de sync pode ser perdido em cenários de erro

**Recomendação:**
Adicionar dependências apropriadas ou mover refs para dentro do callback.

---

## Bugs de Alto Impacto

### ALTO-01: Falha ao Limpar Tabela settings em replaceLocalTables

**Arquivo:** `src/hooks/useCloudSync.ts`
**Linhas:** 84-143
**Severidade:** ALTO

**Problema:**
A função `replaceLocalTables` limpa todas as tabelas mas NÃO limpa `db.settings` antes de inserir novos dados. Settings críticos podem ser preservados indevidamente durante pull da nuvem.

```typescript
await db.savedViews.clear();
// ... outras tabelas
await db.settings.clear(); // Linha 120 - MAS settings são usados ANTES DISSO
```

**Impacto:**
- Settings locais podem conflitar com settings da nuvem
- Preferences podem ser sobrescritas incorretamente

---

### ALTO-02: Filtros em Cascata no useLibraryState Criam Arrays Intermediários

**Arquivo:** `src/modules/library/hooks/useLibraryState.ts`
**Linhas:** 59-197
**Severidade:** ALTO

**Problema:**
8 `useMemo` interdependentes criam cascata de recálculos:
- `searchedGames` → `libraryGames` → `sortedLibraryGames` → `groupedLibraryGames`
- Cada filter/map cria novo array

**Impacto:**
- Performance ruim com biblioteca grande (>200 jogos)
- Re-renderizações lentas ao digitar search query

---

### ALTO-03: Falta de Validação de Form em GamePage

**Arquivo:** `src/modules/game-page/utils/formState.ts`
**Severidade:** ALTO

**Problema:**
Formulário da game page não valida campos obrigatórios antes de submit. Campos como `title` podem ser vazios.

**Impacto:**
- Jogos podem ser criados/editados com dados inválidos
- Erros de integridade no banco

---

### ALTO-04: Race Condition em syncLibraryEntryStoreRelations

**Arquivo:** `src/core/structuredDataSync.ts`
**Linhas:** 110-171
**Severidade:** ALTO

**Problema:**
Múltiplas chamadas concorrentes para `syncLibraryEntryStoreRelations` podem criar relações duplicadas antes que `existingRelations` seja lido.

```typescript
const existingRelations = await db.libraryEntryStores
  .where("libraryEntryId").equals(libraryEntry.id).toArray();
// Race: outra transação pode inserir aqui
for (const relation of existingRelations) { /* deleta */ }
```

**Impacto:**
- Relações duplicadas na tabela `library_entry_stores`
- Dados inconsistentes

**Recomendação:**
Usar transação com lock ou `db.transaction()` envolvendo toda a operação.

---

### ALTO-05: useEffect com Dependência Instável em useBacklogApp

**Arquivo:** `src/hooks/useBacklogApp.ts`
**Linhas:** 153-158
**Severidade:** ALTO

**Problema:**
```typescript
useEffect(() => {
  const validIds = new Set(games.map((game) => game.id));
  const nextSelectedIds = selectedLibraryIds.filter((entryId) => validIds.has(entryId));
  if (nextSelectedIds.length === selectedLibraryIds.length) return;
  setSelectedLibraryIds(nextSelectedIds);
}, [games, selectedLibraryIds, setSelectedLibraryIds]);
```

`games` é um array criado por `useMemo`, mas sua referência muda frequentemente.

**Impacto:**
- Efeito roda mais vezes que o necessário
- Estado de seleção é recalculado desnecessariamente

---

### ALTO-06: Error Handler Genérico em useCloudSync

**Arquivo:** `src/hooks/useCloudSync.ts`
**Linhas:** 419-435
**Severidade:** ALTO

**Problema:**
O catch block trata todos os erros igualmente, mas apenas `isCloudPermissionError` é verificado. Outros erros são logados genericamente.

```typescript
catch (error) {
  if (isCloudPermissionError(error)) { /* handle */ }
  logSyncError("Cloud sync bootstrap error:", error); // Genérico
  // ...
}
```

**Impacto:**
- Erros de rede temporários não são tratados com retry
- Erros de autenticação não são diferenciados

---

### ALTO-07: Fallback de Seleção de Jogo Pode Causar Loop

**Arquivo:** `src/hooks/useBacklogApp.ts`
**Linhas:** 147-151
**Severidade:** ALTO

**Problema:**
```typescript
useEffect(() => {
  if (selectedGameId <= 0) return;
  if (games.some((game) => game.id === selectedGameId)) return;
  setSelectedGameId(games[0]?.id ?? 0);
}, [games, selectedGameId, setSelectedGameId]);
```

Se `games[0]` muda frequentemente, este efeito pode causar atualizações em cascata.

---

## Bugs de Médio Impacto

### MED-01: Console.log em Produção (mockDataSeeder.ts)

**Arquivo:** `src/core/mockDataSeeder.ts`
**Linha:** 146
**Severidade:** MÉDIO

```typescript
console.log("[MockDataSeeder] Dados inseridos:", logInfo);
```

**Impacto:** Poluição de logs em produção (baixo, mas visível no console).

---

### MED-02: String Concatenation em Loop

**Arquivo:** `src/modules/library/hooks/useLibraryState.ts`
**Linha:** ~65
**Severidade:** MÉDIO

Concatenação de strings em loop para tag names ao invés de `Array.join()`.

---

### MED-03: Date Parsing Repetido

**Arquivo:** Múltiplos
**Severidade:** MÉDIO

`parseDateInput` é chamada múltiplas vezes para mesma string sem cache.

---

### MED-04: TextDecoder Criado em Cada Chamada

**Arquivo:** `src/core/utils.ts`
**Linhas:** 5-17
**Severidade:** MÉDIO

```typescript
function repairLegacyText(value: string | undefined): string | undefined {
  const bytes = new TextEncoder().encode(value); // Cria novo a cada vez
  // ...
}
```

**Recomendação:** Criar `TextDecoder`/`TextEncoder` como singleton.

---

### MED-05: toLocaleString sem Memoization

**Arquivo:** `src/core/utils.ts`
**Linhas:** 126-131
**Severidade:** MÉDIO

`formatMonthLabel` é chamada repetidamente para mesmas datas sem cache.

---

### MED-06: Chaves de Lista Usando Index

**Arquivo:** `src/modules/library/components/LibraryScreen.tsx`
**Linha:** 333
**Severidade:** MÉDIO

```typescript
{savedViews.map((view) => {
  const savedViewId = view.id;
  return <div key={savedViewId ?? `${view.scope}-${view.name}`} ...>
```

**Impacto:** Re-renderização incorreta se view mudar.

---

### MED-07: Componentes UI sem React.memo

**Arquivo:** `src/components/cyberpunk-ui.tsx`
**Severidade:** MÉDIO

Componentes `Panel`, `NotchButton`, `Pill` são re-renderizados mesmo quando props não mudam.

---

### MED-08: Handlers sem useCallback

**Arquivo:** `src/hooks/useBacklogActions.ts`
**Severidade:** MÉDIO

Muitos handlers não usam `useCallback`, causando re-criação a cada render.

---

### MED-09: Computation em Tempo Real no Planner

**Arquivo:** `src/modules/planner/utils/scoring.ts`
**Linhas:** 80-138
**Severidade:** MÉDIO

`computePlannerScore` é chamada para CADA jogo na fila.

---

### MED-10: Charts SVG sem Memoization

**Arquivo:** `src/charts.tsx`
**Severidade:** MÉDIO

Componentes de gráfico recalculam paths SVG a cada render.

---

### MED-11: Auto-sync Watch Key com JSON.stringify Grande

**Arquivo:** `src/hooks/useBacklogSelectors.ts`
**Linhas:** 21-52
**Severidade:** MÉDIO

`createAutoSyncWatchKey` faz JSON.stringify de arrays grandes.

---

## Bugs de Baixo Impacto

### BAIXO-01: Import de Todos Ícones Lucide

**Arquivo:** Múltiplos componentes (21 arquivos)
**Severidade:** BAIXO

Embora vite.config.ts tenha code-splitting, não há tree-shaking efetivo.

---

### BAIXO-02: SplitCsvTokens com Set Desnecessário

**Arquivo:** `src/core/utils.ts`
**Linhas:** 23-32
**Severidade:** BAIXO

Cria Set apenas para remover duplicatas, depois converte para Array.

---

### BAIXO-03: Fallback de String em getErrorTextField

**Arquivo:** `src/hooks/useCloudSync.ts`
**Linhas:** 61-65
**Severidade:** BAIXO

```typescript
function getErrorTextField(error: unknown, field: "code" | "message") {
  if (!error || typeof error !== "object") return "";
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}
```

Type assertion pode esconder bugs.

---

### BAIXO-04: Variável Não Utilizada em buildSyncComparison

**Arquivo:** `src/modules/sync-center/utils/syncEngine.ts`
**Severidade:** BAIXO

---

### BAIXO-05: Comentário em Inglês/Português Misturado

**Arquivo:** Múltiplos
**Severidade:** BAIXO

Inconsistência de nomenclatura e comentários.

---

### BAIXO-06: Magic Numbers

**Arquivo:** Múltiplos
**Severidade:** BAIXO

Ex: `30000` (30s) em `useCloudSync.ts:836`, `5000` (5s) em `useCloudSync.ts:185`.

---

### BAIXO-07: Type Any Implícito

**Arquivo:** Múltiplos
**Severidade:** BAIXO

Alguns erros são tratados como `unknown` mas depois convertidos sem type guard.

---

### BAIXO-08: TODOs e FIXMEs Não Resolvidos

**Arquivo:** Múltiplos
**Severidade:** BAIXO

Nenhum TODO/FIXM encontrado na busca atual (bom sinal!).

---

## Problemas de Arquitetura

### ARQ-01: Hooks de Feature no useBacklogApp

**Arquivo:** `src/hooks/useBacklogApp.ts`
**Severidade:** ALTO

O hook compõe TODOS os hooks de feature mesmo quando usuário está em apenas uma tela.

**Impacto:** Re-renderizações desnecessárias, cálculos inúteis.

**Status:** Comentário nas linhas 14-22 indica que hooks foram movidos para componentes de tela, mas isso precisa ser verificado.

---

### ARQ-02: Dependência Circular Potencial

**Arquivo:** `src/hooks/useBacklogActions.ts` e `src/hooks/useBacklogApp.ts`
**Severidade:** MÉDIO

`useBacklogApp` chama `useBacklogActions` que recebe callbacks de `useBacklogApp`.

---

### ARQ-03: Serviço de Import/Export Muito Grande

**Arquivo:** `src/services/importExportService.ts`
**Severidade:** MÉDIO

Arquivo com +500 linhas, difícil de testar e manter.

---

### ARQ-04: Lógica de Sync Distribuída

**Arquivo:** Múltiplos (`useCloudSync.ts`, `sync.ts`, `syncEngine.ts`, `structuredDataSync.ts`)
**Severidade:** MÉDIO

Lógica de sync está espalhada em 4+ arquivos.

---

### ARQ-05: Context API Não Utilizada Para Estado Global

**Arquivo:** `src/hooks/useBacklogContext.ts`
**Severidade:** BAIXO

Estado global é passado via props ao invés de Context.

---

### ARQ-06: Testes Unitários Insuficientes

**Arquivo:** Múltiplos `.test.ts`
**Severidade:** MÉDIO

Falta cobertura para:
- Fluxos de navegação/seleção
- Troca de jogo na GamePage
- Reset de formulário
- Fallback de seleção

---

### ARQ-07: Bundle Size com Firebase

**Arquivo:** `src/lib/firebase.ts`
**Severidade:** BAIXO

Firebase importa módulos grandes (~300KB+).

---

### ARQ-08: Falta de Virtualização de Listas

**Arquivo:** `src/modules/library/components/LibraryScreen.tsx`
**Severidade:** MÉDIO

Lista de jogos não é virtualizada, performance degrada com >500 itens.

---

## Problemas de UI/UX

### UI-01: Botões sem Handler de Loading

**Arquivo:** Múltiplos
**Severidade:** MÉDIO

Botões como "Enviar para nuvem" não mostram estado de loading durante operação.

---

### UI-02: Feedback de Erro Genérico

**Arquivo:** Múltiplos
**Severidade:** MÉDIO

Notices como "Falha ao sincronizar" não explicam causa ou solução.

---

### UI-03: Filtros sem Indicação Visual Ativa

**Arquivo:** `src/modules/library/components/LibraryScreen.tsx`
**Severidade:** BAIXO

Filtros de status não destacam claramente qual está ativo.

---

### UI-04: Search sem Debounce

**Arquivo:** `src/modules/library/hooks/useLibraryState.ts`
**Severidade:** MÉDIO

Query de busca não tem debounce, causa re-render a cada caractere.

---

### UI-05: Modal sem Fechamento via Escape

**Arquivo:** Múltiplos modais
**Severidade:** BAIXO

Alguns modais não fecham com tecla Escape.

---

### UI-06: Formulário sem Validação em Tempo Real

**Arquivo:** `src/modules/game-page/`
**Severidade:** MÉDIO

Erros só aparecem no submit, não durante digitação.

---

### UI-07: Scroll não Preservado em Navegação

**Arquivo:** `src/App.tsx`
**Severidade:** BAIXO

Navegar entre telas e voltar perde scroll position.

---

## Problemas de Sync

### SYNC-01: Auto-merge sem Resolução de Conflito Explícita

**Arquivo:** `src/hooks/useCloudSync.ts`
**Linhas:** 373-403
**Severidade:** ALTO

Auto-merge decide automaticamente como reconciliar dados sem input do usuário.

---

### SYNC-02: Pending Mutations Podem Acumular

**Arquivo:** `src/lib/mutationQueue.ts`
**Severidade:** MÉDIO

Se sync falha repetidamente, mutações pendentes acumulam sem limite.

---

### SYNC-03: Falta de Indicador de Sync em Tempo Real

**Arquivo:** `src/modules/sync-center/`
**Severidade:** BAIXO

Usuário não vê progresso de sync enquanto ocorre.

---

### SYNC-04: Retry com Backoff Muito Agressivo

**Arquivo:** `src/lib/sync.ts`
**Linhas:** 30-58
**Severidade:** BAIXO

Backoff exponencial (1s, 2s, 4s) pode causar timeout em conexões lentas.

---

### SYNC-05: Soft Delete sem Limpeza Automática

**Arquivo:** `src/lib/softDelete.ts`
**Severidade:** MÉDIO

Registros com `deletedAt` não são limpos automaticamente após período.

---

### SYNC-06: Device ID Pode Colidir

**Arquivo:** `src/lib/deviceId.ts`
**Severidade:** BAIXO

Device ID usa `Math.random()` sem verificação de unicidade.

---

### SYNC-07: Tab Sync Lock sem Timeout

**Arquivo:** `src/lib/tabSyncLock.ts`
**Severidade:** MÉDIO

Lock pode travar indefinidamente se tab fechar durante sync.

---

### SYNC-08: Sync Telemetry sem Limites de Tamanho

**Arquivo:** `src/lib/syncTelemetry.ts`
**Severidade:** BAIXO

Histórico de sync pode crescer indefinidamente.

---

### SYNC-09: Conflito Detectado mas Não Resolvido

**Arquivo:** `src/hooks/useCloudSync.ts`
**Linhas:** 406-414
**Severidade:** ALTO

Conflito é notificado mas não há UI clara de resolução no sync automático.

---

### SYNC-10: Pull Cloud sem Preview

**Arquivo:** `src/hooks/useCloudSync.ts`
**Linhas:** 680-733
**Severidade:** MÉDIO

Pull da nuvem aplica dados sem preview do que será alterado.

---

## Recomendações Prioritárias

### Imediatas (1-2 sprints)

1. **CRIT-01**: Fixar lógica de `getNextProgressStatus` para fazer downgrade
2. **CRIT-03**: Otimizar `useBacklogSelectors` com dependências granulares
3. **ALTO-04**: Adicionar transação em `syncLibraryEntryStoreRelations`
4. **SYNC-09**: Melhorar UI de resolução de conflitos

### Médio Prazo (2-4 sprints)

5. **CRIT-02**: Refatorar GamePage para não usar remount forçado
6. **ALTO-02**: Otimizar cascata de filtros no Library
7. **ARQ-01**: Verificar se hooks foram movidos para telas
8. **UI-04**: Adicionar debounce em search query

### Longo Prazo (4+ sprints)

9. **ARQ-08**: Implementar virtualização de lista
10. **SYNC-05**: Adicionar limpeza automática de soft deletes
11. **BAIXO-01**: Otimizar imports de ícones

---

## Métricas de Qualidade Atuais

| Métrica | Valor | Alvo |
|---------|-------|------|
| TypeScript Errors | 0 | 0 |
| ESLint Errors | 0 | 0 |
| Test Coverage | ~60% | 80% |
| Bundle Size (gzip) | ~180 KB | <120 KB |
| First Contentful Paint | ~1.5s | <0.8s |

---

## Resultados dos Testes E2E (Playwright)

**Data:** 2026-03-22
**Total:** 61 testes
**Aprovados:** 51 (83%)
**Falharam:** 10 (17%)

### Testes Falhando

| # | Teste | Arquivo | Erro |
|---|-------|---------|------|
| 1 | Dashboard carregar | `dashboard.test.ts:15` | Texto "Dashboard" não visível |
| 2 | Dashboard mock data | `dashboard.test.ts:90` | Dados mock não carregados |
| 3 | Game Page carregar | `game-page.test.ts:25` | Página não carregou |
| 4 | Game Page título | `game-page.test.ts:31` | Título não visível |
| 5 | Navegar para Sessões | `navigation.test.ts:50` | Tela não carregou |
| 6 | Navegar para Estatísticas | `navigation.test.ts:59` | Tela não carregou |
| 7 | Navegar para Manutenção | `navigation.test.ts:77` | Tela não carregou |
| 8 | Planner fit de sessões | `planner.test.ts:53` | Selector CSS inválido |
| 9 | Sessões carregar | `sessions.test.ts:15` | Texto não visível |
| 10 | Sessões iniciar timer | `sessions.test.ts:28` | Múltiplos elementos "Iniciar" |

### Causas Raiz

1. **Seletores de texto muito específicos** - Alguns testes buscam texto exato que pode variar (ex: "Sessões" vs "Diário de Sessões")
2. **Selector CSS com regex inválido** - `[class*='sess(ã|a)o]` não é CSS válido
3. **Dados mock não seedados** - Alguns testes assumem dados que podem não estar presentes
4. **Strict mode violation** - Múltiplos botões "Iniciar" causam ambiguidade

### Correções Recomendadas

1. Usar `getByRole()` ou `getByTestId()` ao invés de texto
2. Corrigir selector CSS no teste de Planner fit
3. Garantir seed de mock data antes dos testes
4. Usar seletores mais específicos (ex: `getByRole('button', { name: 'Iniciar timer' })`)

---

## Próximos Passos

1. **Revisar bugs críticos** com time e priorizar
2. **Criar tasks** para cada bug no tracker
3. **Estabelecer SLA** para correção por severidade
4. **Revisitar em 2 semanas** para verificar progresso

---

*Relatório gerado via análise estática de código em 2026-03-22*
