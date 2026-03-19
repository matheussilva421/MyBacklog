# Fase P1: `completionDate`, stores múltiplas e plataformas estruturadas

## Objetivo da fase

Esta fase implementa apenas as mudanças de P1 pedidas para o modelo de dados, com foco em:

1. adicionar `completionDate?: string` em `LibraryEntry`
2. iniciar suporte real a múltiplas bibliotecas / stores
3. iniciar suporte real a plataformas estruturadas / múltiplas

O objetivo foi fazer isso de forma incremental, sem quebrar:

- importação atual
- backups antigos
- restore antigo
- funcionalidades já existentes do app

## Decisões de modelagem

### 1. `completionDate` fica em `LibraryEntry`

Essa decisão foi mantida porque a data de conclusão não é metadado universal do jogo; ela representa a relação do usuário com aquele item específico da biblioteca.

Exemplo:

- `Game`: "Elden Ring" existe como metadado
- `LibraryEntry`: eu terminei minha cópia em `2026-03-19`

Por isso, `completionDate` pertence à camada pessoal do usuário e foi adicionada em `LibraryEntry`.

### 2. Stores múltiplas: `Store` + `LibraryEntryStore`

A direção escolhida foi:

- `Store`
- `LibraryEntryStore`

Motivo:

- a store é um dado reutilizável e normalizado
- a relação é da entrada da biblioteca, não do jogo
- o mesmo jogo pode existir em Steam, GOG e Game Pass em entradas diferentes
- uma mesma entrada pode precisar registrar mais de uma origem / loja / fonte ao longo do tempo

### 3. Plataformas estruturadas: `Platform` + `GamePlatform`

A direção escolhida foi:

- `Platform`
- `GamePlatform`

Motivo:

- plataforma estruturada é metadado do jogo
- o mesmo `Game` pode existir em várias plataformas
- isso prepara o projeto para enriquecer metadado, importar melhor e evitar CSV textual frouxo no futuro

## Estratégia de compatibilidade retroativa

Para não gerar caos nesta fase, os campos legados continuam existindo:

- `LibraryEntry.sourceStore`
- `LibraryEntry.platform`
- `Game.platforms`

Eles continuam sendo tratados como a representação primária / legada para a UI e para compatibilidade, enquanto as novas tabelas estruturadas passam a ser a base real para a evolução do domínio.

### Compatibilidade adotada

- `LibraryEntry.sourceStore` continua guardando a store principal
- `LibraryEntry.platform` continua guardando a plataforma principal da entrada
- `Game.platforms` continua guardando a lista textual legada de plataformas
- tabelas novas são populadas automaticamente a partir desses campos

Com isso, o app mantém o comportamento atual, mas já cria a fundação para múltiplas stores e plataformas estruturadas.

## O que foi implementado

### Tipos

Arquivo principal:

- `src/core/types.ts`

Mudanças:

- `completionDate?: string` adicionado em `LibraryEntry`
- `completionDate?: string` adicionado em `LegacyGameRecord` para compatibilidade de migração
- novos tipos criados:
  - `Store`
  - `LibraryEntryStore`
  - `Platform`
  - `GamePlatform`

### Banco / Dexie

Arquivo principal:

- `src/core/db.ts`

Mudanças:

- novas tabelas Dexie adicionadas:
  - `stores`
  - `libraryEntryStores`
  - `platforms`
  - `gamePlatforms`
- `libraryEntries` passou a indexar `completionDate`
- foi criada migração explícita em `version(4)`

### O que a migração faz

1. lê os `games` e `libraryEntries` existentes
2. preenche `completionDate` automaticamente para registros já concluídos, usando:
   - `lastSessionAt`
   - ou `updatedAt`
3. deriva snapshot estruturado a partir dos campos legados
4. popula:
   - `stores`
   - `libraryEntryStores`
   - `platforms`
   - `gamePlatforms`

Resultado:

- quem já tinha base local não perde nada
- a base antiga passa a ter suporte estruturado automaticamente

### Sincronização do modelo legado com o modelo novo

Arquivos principais:

- `src/core/structuredTables.ts`
- `src/core/structuredDataSync.ts`

`structuredTables.ts` deriva as tabelas estruturadas a partir dos dados legados.

`structuredDataSync.ts` mantém as relações estruturadas em operações normais do app:

- sincroniza stores da entrada
- sincroniza plataformas do jogo
- sincroniza o record inteiro após criação, edição e importação

### Regras de negócio de conclusão

Arquivos principais:

- `src/core/catalogIntegrity.ts`
- `src/modules/sessions/utils/sessionMutations.ts`
- `src/modules/settings/utils/catalogAudit.ts`
- `src/modules/catalog-maintenance/utils/catalogMaintenance.ts`
- `src/modules/game-page/utils/formState.ts`

Mudanças:

- `completionDate` agora é derivada e recalculada de forma consistente
- quando uma sessão muda o estado consolidado, a data de conclusão acompanha
- quando o progresso cai, a data pode ser limpa
- merges e reparos de catálogo preservam / recalculam `completionDate`

### Importação / exportação / backup / restore

Arquivos principais:

- `src/modules/import-export/utils/importExport.ts`
- `src/backlog/shared.ts`

Mudanças:

- importação CSV/JSON agora entende:
  - `completionDate`
  - `stores`
  - `platforms`
- defaults de importação passam a gerar arrays estruturados
- merge de payloads considera stores, plataformas e completion date
- backup foi expandido para incluir:
  - `stores`
  - `libraryEntryStores`
  - `platforms`
  - `gamePlatforms`
- `version` do backup foi elevada para `5`
- leitura de backups antigos continua funcionando:
  - se o backup não tiver as tabelas estruturadas, elas são reconstruídas dos campos legados

Resultado:

- backup/restore antigo continua válido
- backup novo já leva a estrutura futura correta

### Camadas ajustadas

Arquivos principais:

- `src/hooks/useBacklogActions.ts`
- `src/hooks/useBacklogDataState.ts`
- `src/hooks/useBacklogApp.ts`
- `src/modules/library/utils.ts`

Mudanças:

- criação/edição/importação agora sincronizam as tabelas estruturadas
- seed inicial da base já cria stores e plataformas normalizadas
- export de backup agora inclui as tabelas novas
- composição de `LibraryRecord` passa a carregar `completionDate`

### Testes adicionados / ajustados

Arquivos principais:

- `src/core/catalogIntegrity.test.ts`
- `src/modules/import-export/utils/importExport.test.ts`
- `src/hooks/useCloudSync.test.ts`

Cobertura adicionada / ajustada:

- derivação de `completionDate`
- limpeza de `completionDate` quando o item deixa de estar concluído
- import parsing com stores e plataformas
- preview de restore com tabelas estruturadas
- hidratação de backup legado para a estrutura nova

## Resultado da compatibilidade

### O que continua funcionando sem mudança de uso

- importador atual
- backup/restore antigo
- fluxo de criação / edição
- sessões
- merge de duplicados
- repair do catálogo

### O que já está pronto como base para evoluir

- múltiplas stores por `LibraryEntry`
- múltiplas plataformas estruturadas por `Game`
- conclusão com data explícita

## Limites desta fase

Esta fase não reescreve a UI inteira para múltiplas stores / múltiplas plataformas. Ela faz o passo correto de P1:

- modelagem real
- migração real
- compatibilidade retroativa
- persistência real

Em outras palavras:

- o suporte estrutural começou de verdade
- a experiência visual ainda continua priorizando os campos legados principais para manter estabilidade

## Riscos conhecidos

1. ainda há duplicidade transitória entre:
   - `sourceStore` e `libraryEntryStores`
   - `platform` / `platforms` legados e tabelas estruturadas

Isso foi intencional para manter compatibilidade e evitar quebra nesta fase.

2. CSV export ainda continua fortemente ancorado na representação legada primária. O backup JSON já é a representação mais fiel da nova estrutura.

3. a UI ainda não expõe edição completa de múltiplas stores e plataformas estruturadas; o suporte já existe no modelo e nas rotinas, mas a camada visual ainda precisa evoluir.

## Próximos passos recomendados

### Próximo passo P2 mais natural

1. criar selectors reais para ler stores/plataformas estruturadas
2. exibir e editar múltiplas stores na página do jogo / ficha da biblioteca
3. exibir e editar plataformas estruturadas na camada de metadado do `Game`

### Próximo passo de manutenção técnica

1. reduzir dependência da string legada como fonte primária
2. fazer export CSV refletir múltiplas stores / plataformas quando apropriado
3. adicionar testes específicos para:
   - migração Dexie com base real antiga
   - restore merge com structured relations conflitantes
   - round-trip de backup v4 -> v5

## Validação executada

Comandos rodados nesta fase:

```powershell
npm run build
npm run test:run
```

Resultado:

- build passou
- suíte passou
- total atual: `86 tests`

## Resumo executivo

Esta fase entregou o que era P1 de forma segura:

- `completionDate` entrou de verdade em `LibraryEntry`
- stores múltiplas começaram com `Store + LibraryEntryStore`
- plataformas estruturadas começaram com `Platform + GamePlatform`
- a migração Dexie ficou explícita
- backups antigos continuam funcionando
- restore antigo continua funcionando
- importador atual não foi quebrado

O sistema agora tem uma base correta para a próxima fase, sem trocar o avião com ele no ar.
