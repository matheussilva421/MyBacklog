# Ajustes visuais e tutorial guiado inicial

Data: 2026-03-19

## Objetivo desta etapa

Esta entrega teve dois objetivos centrais:

1. corrigir bugs visuais do shell e dos cards de conquistas
2. criar um tutorial guiado para a primeira entrada no app

O foco não foi apenas “deixar bonito”, mas remover ruídos de uso que atrapalhavam leitura, hierarquia visual e entendimento inicial do sistema.

## Problemas atacados

### 1. Texto escapando dos cards de conquistas

Nos cards de badges, o título e o pill de status estavam disputando o mesmo espaço horizontal. Em larguras menores, isso fazia:

- o título quebrar de forma ruim
- o status invadir o conteúdo
- o texto parecer “sair do card”

### 2. Espaço excessivo entre navegação lateral e ações rápidas

Na coluna da sidebar, o bloco de navegação e o bloco de ações rápidas estavam ficando artificialmente afastados. Isso passava a sensação de layout quebrado e deixava a leitura do menu lateral desconexa.

### 3. Falta de orientação para quem entra pela primeira vez

Mesmo com onboarding de configuração inicial, ainda faltava um tour curto explicando as áreas principais do produto:

- dashboard
- ações rápidas
- biblioteca
- manutenção
- sessões
- planner
- estatísticas
- perfil

## O que foi implementado

## 1. Correções visuais na sidebar

Arquivo principal:

- [src/index.css](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/index.css)

Mudanças aplicadas:

- a coluna lateral agora usa `align-content: start`
- as linhas da sidebar passaram a usar `grid-auto-rows: max-content`
- isso impede o esticamento vertical indevido entre o painel de marca/navegação e o card de `Ações rápidas`

Resultado:

- o card de `Ações rápidas` volta a ficar naturalmente próximo do bloco acima
- a sidebar parece um conjunto único, não duas peças soltas em alturas diferentes

## 2. Correções visuais nos cards de conquistas

Arquivo principal:

- [src/index.css](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/index.css)

Mudanças aplicadas:

- o grid de badges deixou de ser fixo em 2 colunas e passou a usar `auto-fit` com `minmax`
- os cards agora podem quebrar melhor conforme a largura disponível
- o cabeçalho do badge passou a alinhar pelo topo em vez de forçar tudo no mesmo eixo
- o título ganhou `min-width: 0` e `overflow-wrap: anywhere`
- o pill de status deixou de empurrar o título de forma agressiva
- o bloco de progresso ganhou quebra mais segura para linhas menores

Resultado:

- o título não invade mais o pill
- o texto respira melhor em resoluções menores
- a grade passa a colapsar de forma mais natural quando o espaço aperta

## 3. Tutorial guiado de primeira entrada

Novos arquivos:

- [src/modules/onboarding/utils/guidedTour.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/onboarding/utils/guidedTour.ts)
- [src/modules/onboarding/components/GuidedTourModal.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/onboarding/components/GuidedTourModal.tsx)

Integração:

- [src/hooks/useBacklogUiState.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/hooks/useBacklogUiState.ts)
- [src/hooks/useBacklogApp.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/hooks/useBacklogApp.ts)
- [src/hooks/useBacklogActions.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/hooks/useBacklogActions.ts)
- [src/App.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/App.tsx)
- [src/modules/settings/components/ProfileScreen.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/settings/components/ProfileScreen.tsx)
- [src/modules/settings/utils/preferences.ts](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/settings/utils/preferences.ts)

### Como o tutorial funciona

Foi criado um tour em etapas que:

- abre automaticamente quando o usuário entra no app e ainda não marcou o guia como concluído
- navega entre as telas principais do sistema
- destaca visualmente a área relevante da etapa atual
- explica o propósito prático de cada módulo
- pode ser pulado
- pode ser reaberto depois pelo Perfil

### Etapas do tour

O tour cobre:

- Dashboard
- Ações rápidas
- Biblioteca e ficha do jogo
- Manutenção do catálogo
- Sessões
- Planner
- Estatísticas
- Perfil

### Persistência

Foi adicionada a preferência `guidedTourCompleted` em settings.

Isso garante:

- abertura automática na primeira experiência
- não repetir o tutorial em toda visita
- possibilidade de rever manualmente quando quiser

## 4. Reabertura do tutorial pelo Perfil

O Perfil ganhou um botão dedicado:

- `Rever tutorial`

Arquivo:

- [src/modules/settings/components/ProfileScreen.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/settings/components/ProfileScreen.tsx)

Resultado:

- o app continua amigável para primeira entrada
- e continua didático mesmo para quem quiser revisitar o fluxo depois

## 5. Ajustes de integração e destaque visual

Arquivos:

- [src/App.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/App.tsx)
- [src/components/cyberpunk-ui.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/components/cyberpunk-ui.tsx)
- [src/index.css](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/index.css)

Foi adicionada uma camada de destaque para o tutorial:

- item da sidebar em foco
- hero da dashboard em foco
- card de ações rápidas em foco
- tela principal em foco nas etapas de módulos

Isso faz o tutorial parecer guiado de verdade, e não só um modal solto com texto.

## Testes atualizados

Arquivos ajustados:

- [src/App.test.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/App.test.tsx)
- [src/hooks/useBacklogApp.test.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/hooks/useBacklogApp.test.tsx)
- [src/modules/settings/components/ProfileScreen.test.tsx](D:/Google/Backup%20Gdrive/Projects%20AI/My%20Backlog/src/modules/settings/components/ProfileScreen.test.tsx)

Cobertura adicionada nesta etapa:

- renderização e controle do overlay do tutorial em `App`
- abertura automática do tutorial em `useBacklogApp` quando ele ainda não foi concluído
- compatibilidade do `ProfileScreen` com a nova ação de reabrir o guia

## Validação executada

### Build

- `npm run build`

Resultado:

- passou

### Testes

- `npm run test:run`

Resultado:

- 16 arquivos de teste aprovados
- 71 testes aprovados

### Validação em navegador real

Foi feita validação manual em preview local para confirmar:

- o tutorial abre automaticamente
- a sidebar não empurra mais `Ações rápidas` para longe
- o botão `Rever tutorial` aparece no Perfil
- a seção de conquistas não apresenta mais o problema de texto “escapando” como antes

## Resumo do ganho

Depois desta etapa, o app melhora em dois pontos críticos:

- leitura e estabilidade visual em telas menores
- entendimento inicial do produto para novos usuários

Em termos de produto, isso reduz atrito logo nos primeiros minutos de uso e deixa a interface mais confiável visualmente.

## Próximo passo sugerido

Depois deste bloco, os próximos avanços com mais valor seriam:

- polish do tutorial com atalhos de teclado e spotlight ainda mais preciso
- ajuda contextual por módulo
- revisão final de copy/encoding em telas que ainda carregam textos antigos
