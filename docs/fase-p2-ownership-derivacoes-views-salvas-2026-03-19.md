# Fase P2: ownership semântico, campos derivados e views salvas

Data: 2026-03-19

## Objetivo da fase

Implementar apenas os itens de P2 com baixo caos e alta compatibilidade:

1. refinar semanticamente `ownershipStatus`
2. criar uma camada reutilizável de campos derivados/calculados
3. adicionar a base persistente de views salvas do usuário

As restrições desta fase foram mantidas:

- sem quebrar o importador atual
- sem quebrar backup/restore antigos
- sem remover funcionalidades existentes
- sem refactor gigante
- preservando o estilo e a arquitetura atual do projeto

## Decisões arquiteturais

### 1. `ownershipStatus` não foi removido nesta fase

O campo legado continua sendo a fonte persistida principal de compatibilidade:

- `wishlist`
- `owned`
- `subscription`
- `borrowed`
- `emulated`

Em vez de trocar o modelo inteiro agora, foi criada uma camada semântica derivada por cima dele.

Isso evita quebrar:

- criação/edição de jogo
- importação CSV/JSON
- backup/restore
- sync com snapshots antigos
- telas já existentes

### 2. Nova leitura semântica de posse/acesso

Foi introduzida a distinção conceitual entre:

- posse/estado geral do registro
- modelo de acesso
- origem do acesso

Semântica atual:

- `ownershipStatus` continua persistido
- `AccessModel` representa a interpretação derivada:
  - `wishlist`
  - `purchase`
  - `subscription`
  - `borrowed`
  - `emulated`
  - `unknown`
- `AccessSource` representa a origem derivada/normalizada:
  - `steam`
  - `epic`
  - `gog`
  - `game_pass`
  - `ps_plus`
  - `ps_store`
  - `nintendo_eshop`
  - etc.

Essa leitura é calculada a partir de:

- `ownershipStatus`
- `sourceStore`

### 3. Stores múltiplas e plataformas múltiplas seguem o plano iniciado no P1

A decisão foi mantida e formalizada:

- stores estruturadas: `Store + LibraryEntryStore`
- plataformas estruturadas: `Platform + GamePlatform`

Compatibilidade retroativa mantida:

- `LibraryEntry.sourceStore` continua existindo
- `LibraryEntry.platform` continua existindo
- `Game.platforms` continua existindo

As novas tabelas estruturadas continuam sendo a base incremental do modelo futuro, enquanto os campos legados seguem sustentando a UI e o importador atual.

### 4. Views salvas foram introduzidas primeiro como infraestrutura

Nesta fase foi criada a base persistente de views salvas com foco em arquitetura pronta, sem tentar fechar toda a UX final.

Cada view salva de biblioteca agora tem:

- `scope`
- `name`
- `statusFilter`
- `listId`
- `query`
- `sortBy`
- `sortDirection`
- `groupBy`
- `createdAt`
- `updatedAt`

Escopo inicial:

- `library`

## O que foi implementado

### A. Tipos e schema

Arquivo principal: `src/core/types.ts`

Entraram os tipos:

- `AccessModel`
- `AccessSource`
- `SavedViewScope`
- `LibrarySavedStatusFilter`
- `LibraryViewSortBy`
- `LibraryViewSortDirection`
- `LibraryViewGroupBy`
- `SavedView`

Também foi estendido:

- `Store.sourceKey?: AccessSource`

### B. Migração Dexie explícita

Arquivo principal: `src/core/db.ts`

Foi criada a `version(5)` com:

- índice novo em `stores` com `sourceKey`
- tabela nova `savedViews`

Migração feita:

- stores antigos recebem `sourceKey` derivado automaticamente a partir do nome
- `savedViews` entra vazia por padrão

Compatibilidade preservada:

- dados antigos continuam abrindo normalmente
- backups antigos continuam sendo aceitos
- tabelas antigas permanecem compatíveis

### C. Camada de campos derivados/calculados

Arquivos principais:

- `src/core/libraryEntryDerived.ts`
- `src/core/libraryEntryDerived.test.ts`

Helpers adicionados:

- `classifyAccessSource`
- `deriveAccessModel`
- `resolveLibraryEntrySemantics`
- `isCompleted`
- `isCurrentlyPlaying`
- `isPaused`
- `isWishlistEntry`
- `hasStarted`
- `isBacklogEntry`
- `isWantToPlay`
- `canLaunchEntry`

Objetivo:

- concentrar a lógica semântica de `LibraryEntry`
- reduzir comparação manual repetida de `progressStatus` e `ownershipStatus`
- deixar a futura migração de domínio mais segura

### D. Uso real da camada derivada

A lógica derivada foi ligada em pontos centrais:

- `src/backlog/shared.ts`
  - `dbStatusToStatus` agora usa helpers derivados
- `src/modules/planner/utils/goals.ts`
  - metas usam `isCompleted`, `hasStarted` e `isWishlistEntry`
- `src/modules/dashboard/hooks/useDashboardInsights.ts`
  - métricas deixam de repetir checagens manuais
- `src/modules/dashboard/utils/monthlyRecap.ts`
  - conclusão mensal usa helper centralizado

### E. Stores estruturadas passam a carregar origem semântica

Arquivos:

- `src/core/structuredTables.ts`
- `src/core/structuredDataSync.ts`

Mudança:

- ao criar/sincronizar `Store`, agora também é salvo `sourceKey`

Isso prepara o próximo passo de UI de stores múltiplas com semântica de origem mais forte.

### F. Base de views salvas

Arquivos principais:

- `src/modules/library/utils/savedViews.ts`
- `src/modules/library/utils/savedViews.test.ts`
- `src/hooks/useBacklogUiState.ts`
- `src/hooks/useBacklogDataState.ts`
- `src/hooks/useBacklogApp.ts`
- `src/hooks/useBacklogActions.ts`

O que entrou:

- estado de biblioteca com:
  - `sortBy`
  - `sortDirection`
  - `groupBy`
- persistência de `savedViews` no Dexie
- ações mínimas para:
  - salvar view atual
  - aplicar view salva
  - excluir view salva

### G. Biblioteca preparada para views salvas

Arquivos:

- `src/modules/library/hooks/useLibraryState.ts`
- `src/modules/library/components/LibraryScreen.tsx`
- `src/index.css`

Foi adicionado o mínimo funcional:

- ordenação da biblioteca
- agrupamento da biblioteca
- aplicação de views salvas
- botão para salvar a configuração atual
- lista mínima de views salvas com apply/delete

Importante:

- isso não é a UX final de views salvas
- é a infraestrutura real, já usável e persistente

### H. Backup, restore e sync compatíveis com `savedViews`

Arquivos:

- `src/backlog/shared.ts`
- `src/modules/import-export/utils/importExport.ts`
- `src/modules/sync-center/utils/syncEngine.ts`
- `src/hooks/useBacklogActions.ts`

Mudanças:

- `BackupPayload` agora inclui `savedViews`
- export de backup inclui `savedViews`
- restore replace/merge inclui `savedViews`
- parser de backup antigo continua funcionando
- sync na nuvem agora inclui `savedViews`
- merge de sync usa `scope + name` como chave lógica da view salva

## Compatibilidade retroativa

### Mantida

- importação atual
- backups antigos
- restore antigo
- sync atual
- criação/edição de jogos
- uso dos campos legados `sourceStore`, `platform`, `Game.platforms`

### Estratégia usada

- modelo atual continua existindo
- semântica nova entra como camada derivada
- estrutura nova entra paralelamente, sem corte abrupto

## O que ficou preparado

### Refinamento real de posse/acesso

Ficou preparado para uma fase seguinte:

- `ownershipStatus` virar camada legada
- `accessModel` e `accessSource` ganharem edição real na UI
- stores múltiplas passarem a influenciar a leitura principal de acesso

### Views salvas

Ficou preparado para:

- views salvas por escopo adicional
- filtros mais ricos
- views padrão do sistema
- UI mais sofisticada de rename/duplicate/favorite/share

### Plataforma e store estruturadas

Ficou preparado para:

- edição real de múltiplas stores por `LibraryEntry`
- edição real de múltiplas plataformas por `Game`
- redução futura da dependência dos campos legados string-based

## Testes executados

### Build

Executado com sucesso:

- `npm run build`

### Testes automatizados

Executado com sucesso:

- `npm run test:run`

Resultado nesta fase:

- `94 tests` passando

Inclui testes novos para:

- camada derivada de `LibraryEntry`
- helpers de views salvas
- compatibilidade de import/export com a estrutura nova

## Riscos atuais

1. ainda existe duplicidade transitória entre:
   - `ownershipStatus` legado
   - semântica derivada `AccessModel/AccessSource`

2. views salvas já persistem, mas a UX ainda é funcional/minimalista

3. stores e plataformas estruturadas ainda não são a fonte principal exibida pela UI

## Próximos passos sugeridos

### P2.1

- editar múltiplas stores na página do jogo
- editar múltiplas plataformas do `Game`
- mostrar semântica derivada de acesso na UI

### P2.2

- enriquecer views salvas com:
  - rename
  - duplicate
  - pin/favorite
  - presets do sistema

### P2.3

- começar a migrar leituras da UI dos campos string legados para relações estruturadas
