# Design System de Cards

## Objetivo

Padronizar os cards do app sem iniciar um refactor cosmético amplo demais.

O foco desta versão é:

- reduzir duplicação de CSS;
- unificar estados visuais e interativos;
- melhorar consistência entre biblioteca, views salvas, auditoria, sync e histórico;
- criar uma base reutilizável para evoluções futuras.

## Decisão de Escopo

Este documento substitui a proposta anterior mais teórica por um plano de execução realista.

### Entra agora

- tokens mínimos de spacing, borda, fundo e transição para cards;
- uma base CSS pequena para cards reutilizáveis;
- padronização dos estados `hover`, `focus-visible`, `selected` e `active`;
- migração incremental dos cards com maior retorno visual e estrutural.

### Fica fora por enquanto

- taxonomia extensa com muitas subclasses (`analytic`, `history`, `action`, `status`, etc.);
- renomear todos os cards do projeto de uma vez;
- reescrever `Panel` e `MetricCard` para caber no mesmo sistema;
- refactor total orientado por nomenclatura BEM.

## Diagnóstico Prático

Hoje o app já tem um sistema parcial, mas espalhado.

Pontos concretos:

- [src/index.css](src/index.css) repete `border`, `background`, `padding` e `gap` em vários blocos.
- `.library-card`, `.planner-card`, `.session-card`, `.audit-card`, `.saved-view-card`, `.sync-history-card` e `.import-job-card` compartilham comportamento, mas sem base comum.
- estados de seleção e ativo usam semânticas próximas, porém inconsistentes.
- a biblioteca já tem um componente dedicado em [src/modules/library/components/LibraryCard.tsx](src/modules/library/components/LibraryCard.tsx), o que facilita começar por ela.

## Base Proposta

Adicionar apenas os tokens realmente úteis:

```css
:root {
  --card-padding: 16px;
  --card-padding-compact: 12px;
  --card-gap: 12px;
  --card-gap-relaxed: 14px;
  --card-bg: rgba(7, 9, 13, 0.82);
  --card-border: 1px solid var(--line-soft);
  --card-hover-border: rgba(244, 239, 27, 0.2);
  --card-selected-border: rgba(38, 216, 255, 0.34);
  --card-active-border: rgba(244, 239, 27, 0.28);
  --card-transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}
```

Classes base iniciais:

```css
.app-card
.app-card--interactive
.app-card--compact
.app-card--selected
.app-card--active
```

Isso basta para absorver a maior parte das repetições sem virar um framework interno.

## Plano de Implementacao

### Fase 1: Fundacao CSS

Objetivo: criar a base sem quebrar componentes existentes.

Arquivos principais:

- [src/index.css](src/index.css)
- [src/components/cyberpunk-ui.tsx](src/components/cyberpunk-ui.tsx) se algum helper pequeno for realmente necessario

Entregas:

- adicionar tokens de card no `:root`;
- criar `.app-card` e modificadores essenciais;
- alinhar `focus-visible`, `hover` e estados de selecao;
- manter compatibilidade com classes atuais.

Definition of done:

- nenhum componente precisa ser reescrito ainda;
- classes novas coexistem com as antigas;
- zero regressao visual obvia nos cards principais.

### Fase 2: Migracao dos Cards de Maior Retorno

Objetivo: aplicar a base onde ha mais ganho com menor risco.

Prioridade:

1. biblioteca;
2. views salvas;
3. cards de auditoria, sync e historico;
4. import/export preview e jobs.

Arquivos provaveis:

- [src/modules/library/components/LibraryCard.tsx](src/modules/library/components/LibraryCard.tsx)
- [src/modules/library/components/LibraryScreen.tsx](src/modules/library/components/LibraryScreen.tsx)
- [src/modules/sync-center/components/SyncCenterScreen.tsx](src/modules/sync-center/components/SyncCenterScreen.tsx)
- [src/components/backlog-modals.tsx](src/components/backlog-modals.tsx)
- [src/index.css](src/index.css)

Entregas:

- `library-card-shell` e `library-card` passam a herdar a base;
- `saved-view-card`, `audit-card`, `sync-history-card` e `import-job-card` convergem em padding, gap e estados;
- reduzir duplicacao de borda/fundo entre cards semelhantes.

Definition of done:

- biblioteca e sync parecem pertencer ao mesmo produto;
- estados `selected` e `active` ficam previsiveis;
- mobile continua intacto.

### Fase 3: Consolidacao e Limpeza

Objetivo: remover duplicacao restante e documentar o padrao.

Entregas:

- eliminar regras CSS redundantes que a base tornou obsoletas;
- documentar quais cards devem usar a base e quais continuam como primitives separadas;
- manter excecoes explicitas para `Panel`, `MetricCard` e componentes analiticos muito especificos.

Arquivos provaveis:

- [src/index.css](src/index.css)
- [AGENTS.md](AGENTS.md), se fizer sentido registrar a convencao

Definition of done:

- menos blocos CSS repetidos;
- novo card do app consegue nascer a partir de uma base conhecida;
- o sistema fica pequeno o bastante para ser lembrado sem consultar um documento enorme.

## Criterios de Aceite

- cards interativos compartilham comportamento visual;
- spacing e padding deixam de variar arbitrariamente;
- estados focais e de selecao ficam consistentes;
- nao ha overflow ou quebra de layout nova em mobile;
- o refactor nao exige renomear todo o projeto.

## Riscos e Mitigacao

- risco: abstrair cedo demais.
  mitigacao: limitar a base a poucos modificadores.

- risco: churn grande no CSS.
  mitigacao: migrar por grupos, nao por tela inteira.

- risco: misturar `Panel` com card comum.
  mitigacao: manter `Panel` como primitive separada nesta rodada.

## Recomendacao Final

Vale a pena seguir com este trabalho, mas em modo incremental.

A melhor abordagem nao e construir um design system completo de cards agora. O melhor retorno vem de:

1. criar a base minima;
2. migrar biblioteca e sync;
3. consolidar depois.

Esse caminho entrega consistencia real sem abrir um refactor caro demais para o momento atual do app.
