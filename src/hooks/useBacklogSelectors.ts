import { useMemo } from "react";
import {
  composeLibraryRecords,
  createPreferencesDraft,
  dbGameToUiGame,
  onboardingGoalTemplates,
  screenMeta,
  suggestedStarterLists,
  type LibraryListFilter,
} from "../backlog/shared";
import {
  buildPlatformNamesByGameId,
  buildStoreNamesByEntryId,
  resolveStructuredPlatforms,
  resolveStructuredStores,
} from "../core/structuredRelations";
import type { useBacklogContext } from "./useBacklogContext";

type BacklogContext = ReturnType<typeof useBacklogContext>;

function createAutoSyncWatchKey(args: { data: BacklogContext["data"]; preferences: BacklogContext["preferences"] }) {
  const { data, preferences } = args;
  return JSON.stringify({
    games: data.gameRows.map((row) => [row.id, row.updatedAt, row.platforms]),
    entries: data.libraryEntryRows.map((row) => [row.id, row.updatedAt, row.platform, row.sourceStore]),
    reviews: data.reviewRows.map((row) => [row.id, row.libraryEntryId, row.score ?? ""]),
    tags: data.tagRows.map((row) => [row.id, row.name]),
    gameTags: data.gameTagRows.map((row) => [row.id, row.libraryEntryId, row.tagId]),
    goals: data.goalRows.map((row) => [row.id, row.type, row.current, row.target, row.period]),
    lists: data.listRows.map((row) => [row.id, row.name]),
    libraryEntryLists: data.libraryEntryListRows.map((row) => [row.id, row.libraryEntryId, row.listId]),
    libraryEntryStores: data.libraryEntryStoreRows.map((row) => [
      row.id,
      row.libraryEntryId,
      row.storeId,
      row.isPrimary,
    ]),
    stores: data.storeRows.map((row) => [row.id, row.updatedAt, row.name]),
    platforms: data.platformRows.map((row) => [row.id, row.updatedAt, row.name]),
    gamePlatforms: data.gamePlatformRows.map((row) => [row.id, row.gameId, row.platformId]),
    sessions: data.sessionRows.map((row) => [row.id, row.libraryEntryId, row.date, row.platform, row.durationMinutes]),
    savedViews: data.savedViewRows.map((row) => [row.id, row.updatedAt, row.name]),
    prefs: {
      autoSyncEnabled: preferences.autoSyncEnabled,
      operatorName: preferences.operatorName,
      plannerPreference: preferences.plannerPreference,
      rawgApiKey: preferences.rawgApiKey,
      onboardingCompleted: preferences.onboardingCompleted,
      guidedTourCompleted: preferences.guidedTourCompleted,
      primaryPlatforms: preferences.primaryPlatforms,
      defaultStores: preferences.defaultStores,
    },
  });
}

export function useBacklogSelectors(context: BacklogContext) {
  const { data, preferences, ui } = context;

  const effectiveSelectedListFilter = useMemo<LibraryListFilter>(() => {
    if (ui.selectedListFilter === "all") return "all";
    return data.listRows.some((list) => list.id === ui.selectedListFilter) ? ui.selectedListFilter : "all";
  }, [data.listRows, ui.selectedListFilter]);

  const records = useMemo(
    () => composeLibraryRecords(data.gameRows, data.libraryEntryRows),
    [data.gameRows, data.libraryEntryRows],
  );
  const recordsByEntryId = useMemo(
    () => new Map(records.map((record) => [record.libraryEntry.id, record] as const)),
    [records],
  );
  const reviewByEntryId = useMemo(
    () => new Map(data.reviewRows.map((review) => [review.libraryEntryId, review] as const)),
    [data.reviewRows],
  );
  const tagById = useMemo(() => new Map(data.tagRows.map((tag) => [tag.id, tag] as const)), [data.tagRows]);
  const listById = useMemo(() => new Map(data.listRows.map((list) => [list.id, list] as const)), [data.listRows]);
  const storeNamesByEntryId = useMemo(
    () => buildStoreNamesByEntryId(data.storeRows, data.libraryEntryStoreRows),
    [data.libraryEntryStoreRows, data.storeRows],
  );
  const platformNamesByGameId = useMemo(
    () => buildPlatformNamesByGameId(data.platformRows, data.gamePlatformRows),
    [data.gamePlatformRows, data.platformRows],
  );
  const games = useMemo(
    () =>
      records.map((record) =>
        dbGameToUiGame(record, {
          stores: resolveStructuredStores(record.libraryEntry, storeNamesByEntryId),
          platforms: resolveStructuredPlatforms(record.game, record.libraryEntry.platform, platformNamesByGameId),
        }),
      ),
    [platformNamesByGameId, records, storeNamesByEntryId],
  );
  const selectedBatchGames = useMemo(
    () => games.filter((game) => ui.selectedLibraryIds.includes(game.id)),
    [games, ui.selectedLibraryIds],
  );
  const displayName = preferences.operatorName;
  const hasCompletedOnboarding = preferences.onboardingCompleted;
  const onboardingInitialDraft = useMemo(() => createPreferencesDraft(preferences), [preferences]);
  const onboardingInitialLists = useMemo(
    () =>
      data.listRows.length > 0 ? data.listRows.map((list) => list.name) : Array.from(suggestedStarterLists.slice(0, 3)),
    [data.listRows],
  );
  const onboardingInitialGoalIds = useMemo(() => {
    const matchingTemplates = onboardingGoalTemplates
      .filter((template) =>
        data.goalRows.some((goal) => goal.type === template.type && goal.period === template.period),
      )
      .map((template) => template.id);

    return matchingTemplates.length > 0
      ? matchingTemplates
      : onboardingGoalTemplates.slice(0, 2).map((template) => template.id);
  }, [data.goalRows]);
  const heroCopy = screenMeta[ui.screen];
  const autoSyncWatchKey = useMemo(
    () =>
      createAutoSyncWatchKey({
        data,
        preferences,
      }),
    [data, preferences],
  );

  return {
    effectiveSelectedListFilter,
    records,
    recordsByEntryId,
    reviewByEntryId,
    tagById,
    listById,
    storeNamesByEntryId,
    platformNamesByGameId,
    games,
    selectedBatchGames,
    displayName,
    hasCompletedOnboarding,
    onboardingInitialDraft,
    onboardingInitialLists,
    onboardingInitialGoalIds,
    heroCopy,
    autoSyncWatchKey,
  };
}
