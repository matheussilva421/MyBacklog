# MyBacklog

Aplicacao local-first para catalogo, backlog, planner e telemetria pessoal de jogos.

## Stack
- Vite + React + TypeScript
- Dexie.js (IndexedDB)
- Lucide React
- Integracao opcional com RAWG via `VITE_RAWG_API_KEY`

## Estado atual
- shell cyberpunk com sidebar, hero, dashboard, biblioteca, planner, estatisticas e perfil
- CRUD local para jogos da biblioteca
- importacao com preview e resolucao de conflito
- backup e restore em JSON
- sessoes de jogo com atualizacao de horas e progresso
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

## Estrutura principal
- `src/App.tsx`: shell principal
- `src/hooks/useBacklogApp.ts`: estado e acoes da aplicacao
- `src/screens/`: telas por modulo
- `src/components/`: UI compartilhada e modais
- `src/backlog/shared.ts`: constantes, mapeamentos e helpers do dominio
- `src/db.ts`: schema e migracoes Dexie
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
