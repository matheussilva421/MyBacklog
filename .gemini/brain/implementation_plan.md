# Refactoring My Backlog: Modular Architecture

This plan covers the migration from a monolithic architecture (concentrated in `src/backlog/shared.ts` and `src/hooks/useBacklogApp.ts`) into a domain-driven module structure.

## Proposed Changes

We will create a `src/modules` folder containing the following domain modules requested:

### Core / Global
We will create a `src/core` folder to keep global database setup and unified types. E.g.:
#### [NEW] `src/core/db.ts` (Moved from `src/db.ts`)
#### [NEW] `src/core/types.ts` (Moved from `src/types.ts`)
#### [MODIFY] `src/App.tsx` (Refactored to assemble the providers/components from the new modules)

---

### `library`
Will contain fundamental logic for the main games collection and the Library screen.
#### [NEW] `src/modules/library/components/LibraryScreen.tsx`
#### [NEW] `src/modules/library/hooks/useLibrary.ts`
#### [NEW] `src/modules/library/utils.ts` (e.g., dbGameToUiGame, etc.)

---

### `game-page`
Will contain the logic for editing and viewing a single game (currently `GameModal`).
#### [NEW] `src/modules/game-page/components/GameModal.tsx`
#### [NEW] `src/modules/game-page/utils/formState.ts`

---

### `sessions`
Will encompass the logic for logging play sessions.
#### [NEW] `src/modules/sessions/components/SessionModal.tsx`
#### [NEW] `src/modules/sessions/hooks/useSessions.ts`

---

### `reviews`
Will isolate review models and interactions with the Dexie DB for reviews.
#### [NEW] `src/modules/reviews/hooks/useReviews.ts`

---

### `planner`
Will handle the priority queue and planner logic.
#### [NEW] `src/modules/planner/components/PlannerScreen.tsx`
#### [NEW] `src/modules/planner/hooks/usePlannerQueue.ts`
#### [NEW] `src/modules/planner/utils/scoring.ts`

---

### `dashboard`
Will hold the Dashboard and quick actions.
#### [NEW] `src/modules/dashboard/components/DashboardScreen.tsx`
#### [NEW] `src/modules/dashboard/hooks/useDashboardMetrics.ts`

---

### `stats`
Will encompass charts and data derivations.
#### [NEW] `src/modules/stats/components/StatsScreen.tsx`
#### [NEW] `src/modules/stats/components/Charts.tsx` (from `charts.tsx`)

---

### `import-export`
Will isolate the CSV/JSON import-export parsing and modals.
#### [NEW] `src/modules/import-export/components/ImportModal.tsx`
#### [NEW] `src/modules/import-export/components/RestoreModal.tsx`
#### [NEW] `src/modules/import-export/utils/csv.ts`
#### [NEW] `src/modules/import-export/utils/backup.ts`

---

### `lists-tags-goals`
Will encapsulate goals, tags handling, and generic list management.
#### [NEW] `src/modules/lists-tags-goals/hooks/useGoals.ts`
#### [NEW] `src/modules/lists-tags-goals/hooks/useTags.ts`

---

### `settings`
Will encapsulate Profile Screen contents, system rules references, and user preferences.
#### [NEW] `src/modules/settings/components/ProfileScreen.tsx`
#### [NEW] `src/modules/settings/constants/systemRules.ts`

---

### `onboarding`
Will manage the first-time setup data seeds.
#### [NEW] `src/modules/onboarding/data/seeds.ts` (defaultGames, defaultSessions from `shared.ts`)
#### [NEW] `src/modules/onboarding/hooks/useSeeder.ts`

---

### Code Deletion and Cleanup
After all logic is moved, the monoliths will be completely deleted:
#### [DELETE] `src/backlog/shared.ts`
#### [DELETE] `src/hooks/useBacklogApp.ts`
#### [DELETE] `src/components/backlog-modals.tsx`

---

## State Management Approach
We will replace `useBacklogApp()` with a combination of isolated hooks. `App.tsx` will coordinate by consuming these custom hooks (`useLibrary`, `useSessions`, `usePlannerQueue`, etc.) from their respective modules instead of relying on a single mega-hook.

## Verification Plan

### Automated Tests
1. Ensure the TypeScript compiler does not complain: `npx tsc --noEmit`
2. Ensure Vite build succeeds: `npm run build`

### Manual Verification
1. I will start the Vite dev server locally.
2. Verify that I can view Dashboard, Library, Planner, and Stats screens correctly.
3. Validate that attempting to add a session works without crashing.
4. Export and Import JSON backup manually or programmatically to ensure no feature degradation.
