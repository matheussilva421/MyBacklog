# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the application code. Keep feature work inside `src/modules/<feature>/` with colocated `components/`, `hooks/`, and `utils/`. Shared UI lives in `src/components/`, app-wide hooks in `src/hooks/`, persistence and domain types in `src/core/` and `src/backlog/`, and auth/sync integrations in `src/contexts/` and `src/lib/`. Tests are mostly colocated as `*.test.ts` or `*.test.tsx`, with shared setup in `src/test/setup.ts`. References, fixtures, and validation notes belong in `docs/`; static support files live in `resources/`.

## Build, Test, and Development Commands
Use `npm install` to install dependencies.

- `npm run dev`: start the Vite app on `http://127.0.0.1:4173`
- `npm run build`: run TypeScript build checks and produce `dist/`
- `npm run preview`: serve the production build locally
- `npm run test:run`: run the Vitest suite once
- `npm run test`: run Vitest in watch mode
- `npm run typecheck`: verify TypeScript without emitting files
- `npm run lint` / `npm run lint:fix`: enforce ESLint rules
- `npm run format` / `npm run format:check`: apply or verify Prettier formatting
- `npm run cf:dev` / `npm run cf:deploy`: local Cloudflare workflow and deploy

## Coding Style & Naming Conventions
This repository uses TypeScript, React function components, ESLint, and Prettier. Follow the existing defaults: 2-space indentation, semicolons, double quotes, trailing commas, and `printWidth` 120. Use `PascalCase` for components and screens (`GamePageScreen.tsx`), `useCamelCase` for hooks (`useBacklogApp.ts`), and `camelCase` for utilities (`gamePageData.ts`). Prefer feature-local files over broad shared helpers unless logic is reused across modules.

## Testing Guidelines
Vitest and Testing Library are the active test stack. Add or update tests for any changed hook, utility, persistence rule, or interactive screen. Name tests after the source file, for example `src/modules/library/components/LibraryScreen.test.tsx`. Run `npm run test:run` and `npm run typecheck` before opening a PR; include targeted manual verification for IndexedDB, import/export, and sync-related changes.

## Commit & Pull Request Guidelines
Recent history favors short imperative subjects, often in Portuguese, with optional Conventional Commit prefixes such as `feat:` or scoped forms like `feat(import): ...`. Keep commits focused and descriptive, for example `feat(planner): adiciona filtro por plataforma`. PRs should summarize user-visible changes, call out schema or env updates, link the issue, list verification steps, and attach screenshots for UI changes.

## Configuration Tips
Copy `.env.example` when local configuration is needed. `VITE_RAWG_API_KEY` is optional and should never be committed. Treat local IndexedDB and Firebase-related changes carefully; document migration or sync behavior in the PR when data flow changes.

## Design System: Cards

O sistema usa uma base CSS unificada para cards (`.app-card`) com modificadores de estado e densidade.

### Classes Base
- `.app-card` - classe base (padding: 16px, gap: 12px, border, background)
- `.app-card--interactive` - cursor pointer + hover/focus states
- `.app-card--compact` - padding reduzido (12px)
- `.app-card--selected` - border cyan (seleção)
- `.app-card--active` - border yellow (ativo/foco)

### Componente React
Use o componente `<AppCard>` de `src/components/cards/`:

```tsx
import { AppCard, AppCardHeader, AppCardTitle, AppCardBody } from "@/components/cards";

<AppCard type="interactive" selected={isSelected} onClick={handleClick}>
  <AppCardHeader>
    <AppCardTitle icon={<Icon />}>Título</AppCardTitle>
  </AppCardHeader>
  <AppCardBody>Conteúdo</AppCardBody>
</AppCard>
```

### Props do AppCard
- `type`: "informative" | "interactive" | "statistic" | "status" | "selection" | "action" | "analytic" | "history"
- `density`: "normal" | "compact" | "relaxed"
- `tone`: "cyan" | "yellow" | "magenta" | "emerald" | "orange" | "violet"
- `selected`, `active`, `locked`, `disabled`: boolean states
- `as`: "div" | "article" | "section" | "button"

### Migração de Cards Existentes
Cards como `library-card`, `session-card`, `planner-card`, `audit-card`, etc. foram migrados para herdar de `.app-card`. Ao criar novos cards, use a base `.app-card` sempre que possível, adicionando apenas especificidades de layout.

