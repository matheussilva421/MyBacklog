# MyBacklog

Aplicacao local-first para catalogo, backlog, planner e telemetria pessoal de jogos.

## Stack
- Vite + React + TypeScript
- Dexie.js (IndexedDB)
- Lucide React
- Integracao opcional com RAWG via `VITE_RAWG_API_KEY`

## Estado atual
- shell cyberpunk com sidebar, hero, dashboard, biblioteca, planner, estatisticas e perfil
- pagina dedicada do jogo com sessoes, review, tags e leitura tatica
- CRUD local para jogos da biblioteca
- importacao com preview e resolucao de conflito
- backup e restore em JSON
- sessoes de jogo com atualizacao de horas e progresso
- reviews persistidas por `LibraryEntry`
- tags persistidas por `LibraryEntry` via `GameTag`
- navegacao para a pagina do jogo a partir de dashboard, biblioteca e planner
- charts SVG proprios, sem Recharts

## Modelo de dados
O app separa claramente:

- `Game`: metadado do jogo
- `LibraryEntry`: relacao do usuario com o jogo

Entidades principais atuais:
- `Game`
- `LibraryEntry`
- `PlaySession`
- `Review`
- `Tag`
- `GameTag`
- `List`
- `Goal`
- `Setting`
- `ImportJob`

## Ultima atualizacao
- adicao da tela `game` como pagina real de detalhe, sem depender so da ficha lateral da biblioteca
- refactor do dominio em `useBacklogApp` para carregar `reviews`, `tags`, `gameTags` e `goals`
- composicao centralizada da pagina do jogo em `src/modules/game-page/utils/gamePageData.ts`
- fluxo para salvar review e sincronizar tags diretamente no IndexedDB
- biblioteca e planner agora abrem a pagina dedicada do jogo

## Estrutura principal
- `src/App.tsx`: shell principal
- `src/hooks/useBacklogApp.ts`: estado e acoes da aplicacao
- `src/modules/`: telas, hooks e utilitarios por modulo
- `src/components/`: UI compartilhada e modais
- `src/backlog/shared.ts`: constantes, mapeamentos e helpers do dominio
- `src/core/db.ts`: schema e migracoes Dexie
- `docs/`: referencias visuais, fixtures e validacoes

## Documentacao local
- `docs/reference/game_backlog_dashboard.jsx`: mock de referencia
- `docs/validation/`: screenshots de validacao visual
- `docs/fixtures/import-sample.csv`: fixture de importacao

## Rodando localmente
```bash
npm install
npm run dev
```

Dev server: `http://127.0.0.1:4173`

## Build
```bash
npm run build
```

## RAWG opcional
Crie um arquivo `.env` com:

```bash
VITE_RAWG_API_KEY=sua_chave
```
