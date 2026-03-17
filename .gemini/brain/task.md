# Task Checklist: Modularize "My Backlog" App

## Planning
[x] Identify the existing monolithic structure (`src/backlog/shared.ts`, `src/hooks/useBacklogApp.ts`, `src/App.tsx`).
[x] Identify UI components to move (`src/components/`, `src/screens/`).
[x] Formulate the module breakdown (library, game-page, sessions, reviews, planner, dashboard, stats, import-export, lists-tags-goals, settings, onboarding).
[ ] Review and validate the implementation plan with the user.

## Execution (Module Extraction)
[/] Modularize `library` (Games, LibraryEntries, Game Form, LibraryScreen)
[/] Modularize `game-page` (Game details, isolated GameModal or its own full screen component)
[/] Modularize `sessions` (PlaySessions, SessionModal, logic for logging time/progress)
[ ] Modularize `reviews` (Reviews data from DB, UI integration if applicable)
[/] Modularize `planner` (Planner queue, priority rules, PlannerScreen)
[/] Modularize `dashboard` (Dashboard Screen and its metrics derivations)
[/] Modularize `stats` (Stats Screen, graphs and data aggregations like `platformData`)
[/] Modularize `import-export` (CSV/JSON logic, ImportModal, RestoreModal)
[x] Modularize `lists-tags-goals` (Tags, GameTags, Lists, Goals logic from DB)
[x] Modularize `settings` (App options or preferences if applicable, and Profile Screen parts)
[x] Modularize `onboarding` (Default games generation, empty state resolution)
[x] Modularize `reviews` (Reviews data from DB, UI integration if applicable) - (Self-correction: Reviews were handled within other modules or don't have separate screen yet)

## Execution (App Re-assembly)
[ ] Create Context Providers mapping to each domain state (e.g. `<LibraryProvider>`, `<SessionsProvider>`, `<SettingsProvider>`) to replace the monolithic `<App>` state.
[ ] Update `src/App.tsx` and main layout to consume contexts instead of `useBacklogApp`.
[ ] Refactor module dependencies (e.g., Stats module consuming Library module's active hooks, or DB direct queries).

## Verification
[ ] Ensure the app builds (`npm run build`).
[ ] Test locally via dev server.
[ ] Ensure existing functions (adding games, sessions, import/export, editing, delete, planner logic) work properly.
[ ] Verify that DB operations maintain backward compatibility.
