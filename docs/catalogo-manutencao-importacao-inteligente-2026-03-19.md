# Catálogo: manutenção e importação inteligente

Data: 2026-03-19

## Objetivo

Esta etapa elevou a manutenção do catálogo para um módulo próprio do app e fortaleceu o fluxo de importação para reduzir duplicação, metadado pobre e vínculo incorreto entre `Game` e `LibraryEntry`.

O foco foi em quatro frentes:

1. detecção de duplicados com merge assistido
2. fila de metadado faltante
3. preview de importação mais forte
4. painel dedicado de manutenção do catálogo

## Resultado prático

O app agora consegue:

- identificar grupos de jogos potencialmente duplicados
- sugerir se faz mais sentido `mesclar`, `manter` ou `ignorar`
- consolidar histórico sem perder sessões, review, tags e listas ao mesclar
- listar rapidamente jogos com metadado incompleto
- enriquecer esses jogos via RAWG quando houver match confiável
- mostrar conflitos e sugestões melhores antes de persistir uma importação
- abrir um módulo específico de manutenção, em vez de esconder tudo apenas na área de perfil

## Alterações por área

### 1. Navegação e shell do app

Foi adicionada uma nova tela de manutenção:

- `maintenance` em [src/backlog/shared.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/backlog/shared.ts)
- copy e hero da nova tela em [src/modules/dashboard/utils/navigationData.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/dashboard/utils/navigationData.ts)
- rota da tela em [src/App.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/App.tsx)

Também foi criado um atalho para abrir essa manutenção a partir do perfil:

- [src/modules/settings/components/ProfileScreen.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/settings/components/ProfileScreen.tsx)

### 2. Domínio de manutenção do catálogo

Foi criado um módulo novo para concentrar a inteligência de manutenção:

- [src/modules/catalog-maintenance/utils/catalogMaintenance.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/catalog-maintenance/utils/catalogMaintenance.ts)
- [src/modules/catalog-maintenance/hooks/useCatalogMaintenanceState.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/catalog-maintenance/hooks/useCatalogMaintenanceState.ts)
- [src/modules/catalog-maintenance/components/CatalogMaintenanceScreen.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/catalog-maintenance/components/CatalogMaintenanceScreen.tsx)

Esse módulo produz um relatório consolidado com:

- inconsistências estruturais já auditadas
- grupos de duplicados
- fila de metadado faltante
- resumo quantitativo para a tela

### 3. Detecção de duplicados

Os duplicados são agrupados com base em sinais combinados:

- título normalizado
- plataforma
- ano
- developer
- publisher

Cada grupo recebe:

- item principal sugerido
- justificativas da sugestão
- ação sugerida:
  - `merge`
  - `keep`
  - `ignore`

Heurísticas principais:

- `merge` quando os itens parecem representar o mesmo jogo e o conflito é baixo
- `ignore` quando os metadados divergem de forma forte
- `keep` quando ainda há ambiguidade e o usuário deve decidir

### 4. Merge assistido sem perda de histórico

Foi implementada a fusão de duplicados no fluxo de ações:

- [src/hooks/useBacklogActions.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/hooks/useBacklogActions.ts)

Ao mesclar:

- o `Game` principal recebe metadado útil dos duplicados
- as `PlaySession` dos itens duplicados são reatribuídas para o `LibraryEntry` principal
- `Review` é consolidada sem perder a melhor informação existente
- `GameTag` e `LibraryEntryList` são deduplicados e reatribuídos
- `LibraryEntry` principal é recalculado com base no conjunto consolidado
- jogos duplicados órfãos são removidos ao final da transação

Isso preserva histórico e evita perda de dados pessoais do usuário.

### 5. Fila de metadado faltante

A auditoria agora identifica jogos com ausência de:

- capa
- gênero
- estúdio
- publisher
- ano
- plataformas

Esses itens aparecem em uma fila própria na nova tela de manutenção:

- [src/modules/catalog-maintenance/components/CatalogMaintenanceScreen.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/catalog-maintenance/components/CatalogMaintenanceScreen.tsx)

Também foi criado enriquecimento por item e enriquecimento em lote:

- [src/hooks/useBacklogActions.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/hooks/useBacklogActions.ts)
- [src/modules/import-export/utils/rawg.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/import-export/utils/rawg.ts)

Quando existe chave RAWG configurada, o app tenta completar o `Game` com mais segurança.

### 6. Import preview mais forte

O preview de importação foi fortalecido em:

- [src/modules/import-export/utils/importExport.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/import-export/utils/importExport.ts)
- [src/modules/import-export/hooks/useImportExportState.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/import-export/hooks/useImportExportState.ts)
- [src/components/backlog-modals.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/components/backlog-modals.tsx)

Agora cada item pode exibir:

- conflito com `LibraryEntry` existente
- candidatos de `Game` já presentes no catálogo
- motivos de revisão
- sugestão de ação

O usuário pode escolher:

- atualizar um `LibraryEntry` existente
- criar novo
- vincular o item importado a um `Game` já existente
- enriquecer via RAWG quando aplicável

Com isso, o catálogo tende a crescer com muito menos duplicação e menos registros pobres.

### 7. Integração do app

O hook principal passou a orquestrar o novo relatório e as novas ações:

- [src/hooks/useBacklogApp.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/hooks/useBacklogApp.ts)

Além disso:

- a tela de manutenção foi ligada ao shell
- a importação ganhou novo callback para escolha do `Game`
- o perfil passou a abrir a manutenção dedicada

### 8. Ajustes visuais

Foram adicionados estilos para a nova tela e para os novos elementos de preview:

- [src/index.css](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/index.css)

## Testes adicionados/atualizados

Cobertura nova:

- [src/modules/catalog-maintenance/utils/catalogMaintenance.test.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/catalog-maintenance/utils/catalogMaintenance.test.ts)
- [src/modules/catalog-maintenance/components/CatalogMaintenanceScreen.test.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/catalog-maintenance/components/CatalogMaintenanceScreen.test.tsx)

Cobertura ajustada:

- [src/modules/import-export/utils/importExport.test.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/import-export/utils/importExport.test.ts)
- [src/hooks/useBacklogApp.test.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/hooks/useBacklogApp.test.tsx)
- [src/App.test.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/App.test.tsx)

## Validação executada

Validação feita nesta entrega:

- `npm run build`
- `npm run test:run`
- verificação manual no app em preview local

Resultado:

- build passou
- suíte de testes passou
- a nova entrada de navegação `Manutenção` apareceu corretamente no shell

## Observações

- Esta etapa melhora muito a saúde do catálogo, mas ainda não substitui sincronização remota entre dispositivos.
- O enriquecimento via RAWG depende de chave configurada nas preferências do app.
- A mesclagem automática continua conservadora: em casos mais ambíguos, o sistema sugere revisão em vez de assumir.

## Próximo passo recomendado

Depois desta entrega, o próximo bloco natural é aprofundar o catálogo com:

- merge assistido mais visual
- edição rápida em lote de metadado
- regras mais fortes de deduplicação por franquia/série
- manutenção ativa integrada ao fluxo de importação, não só à tela de auditoria
