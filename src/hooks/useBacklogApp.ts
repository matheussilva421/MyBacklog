import { useDeferredValue, useMemo, useState } from "react";
import { db } from "../core/db";
import type { Goal as DbGoal, PlaySession as DbPlaySession } from "../core/types";
import {
  composeLibraryRecords,
  createGameFormState,
  createPreferencesDraft,
  createSessionFormState,
  dbGameToUiGame,
  onboardingGoalTemplates,
  screenMeta,
  suggestedStarterLists,
  buildDynamicTacticalGoals,
  systemRules,
  type BackupTables,
  type GameFormState,
  type GoalFormState,
  type LibraryListFilter,
  type ScreenKey,
  type SessionFormState,
  type StatusFilter,
} from "../backlog/shared";
import { useBacklogActions } from "./useBacklogActions";
import { useBacklogDataState } from "./useBacklogDataState";
import { useDashboardInsights } from "../modules/dashboard/hooks/useDashboardInsights";
import { useSelectedGamePage } from "../modules/game-page/hooks/useSelectedGamePage";
import { useImportExportState } from "../modules/import-export/hooks/useImportExportState";
import { useLibraryState } from "../modules/library/hooks/useLibraryState";
import { usePlannerInsights } from "../modules/planner/hooks/usePlannerInsights";
import { useAppPreferences } from "../modules/settings/hooks/useAppPreferences";
import { buildSessionCadenceMap, buildSessionMonthlyHours } from "../modules/sessions/utils/sessionAnalytics";

function createGoalDraft(goal?: DbGoal): GoalFormState {
  return {
    type: goal?.type ?? "finished",
    target: goal?.target != null ? String(goal.target) : "",
    period: goal?.period ?? "monthly",
  };
}

export function useBacklogApp() {
  const [screen, setScreen] = useState<ScreenKey>("dashboard");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("Todos");
  const [selectedListFilter, setSelectedListFilter] = useState<LibraryListFilter>("all");
  const [selectedGameId, setSelectedGameId] = useState(0);

  const [gameModalMode, setGameModalMode] = useState<"create" | "edit" | null>(null);
  const [gameForm, setGameForm] = useState<GameFormState>(() => createGameFormState());
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionFormState>(() => createSessionFormState());
  const [sessionEditId, setSessionEditId] = useState<number | null>(null);
  const [goalModalMode, setGoalModalMode] = useState<"create" | "edit" | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormState>(() => createGoalDraft());
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const data = useBacklogDataState();
  const importState = useImportExportState(data.setNotice);
  const preferences = useAppPreferences(data.settingRows);

  const effectiveSelectedListFilter = useMemo<LibraryListFilter>(() => {
    if (selectedListFilter === "all") return "all";
    return data.listRows.some((list) => list.id === selectedListFilter) ? selectedListFilter : "all";
  }, [data.listRows, selectedListFilter]);

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
  const tagById = useMemo(
    () => new Map(data.tagRows.map((tag) => [tag.id, tag] as const)),
    [data.tagRows],
  );
  const listById = useMemo(
    () => new Map(data.listRows.map((list) => [list.id, list] as const)),
    [data.listRows],
  );
  const games = useMemo(() => records.map(dbGameToUiGame), [records]);
  const displayName = preferences.operatorName;
  const hasCompletedOnboarding = preferences.onboardingCompleted;
  const onboardingInitialDraft = useMemo(() => createPreferencesDraft(preferences), [preferences]);
  const onboardingInitialLists = useMemo(
    () =>
      data.listRows.length > 0
        ? data.listRows.map((list) => list.name)
        : Array.from(suggestedStarterLists.slice(0, 3)),
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

  const findGame = (id: number) => games.find((game) => game.id === id);
  const monthlyHours = useMemo(
    () => buildSessionMonthlyHours(data.sessionRows),
    [data.sessionRows],
  );
  const sessionCadenceMap = useMemo(
    () => buildSessionCadenceMap(data.sessionRows),
    [data.sessionRows],
  );
  const dynamicTacticalGoals = useMemo(
    () => buildDynamicTacticalGoals(games, data.sessionRows),
    [games, data.sessionRows],
  );

  const {
    resolvedGoalRows,
    plannerGoalSignals,
    computedPlannerQueue,
    goalProgress,
  } = usePlannerInsights({
    games,
    libraryEntryRows: data.libraryEntryRows,
    sessionRows: data.sessionRows,
    goalRows: data.goalRows,
    fallbackGoalProgress: dynamicTacticalGoals,
    preferences,
    sessionCadenceMap,
  });

  const {
    monthlyProgress,
    platformData,
    durationBuckets,
    stats,
    personalBadges,
    monthlyRecap,
    continuePlayingGames,
  } = useDashboardInsights({
    games,
    libraryEntryRows: data.libraryEntryRows,
    sessionRows: data.sessionRows,
    plannerGoalSignals,
    preferences,
    query: deferredQuery,
  });

  const matchesQuery = (values: Array<string | number>) =>
    !deferredQuery || values.some((value) => String(value).toLowerCase().includes(deferredQuery));

  const {
    listOptions,
    libraryGames,
    selectedGame,
    selectedRecord,
    selectedGameLists,
  } = useLibraryState({
    games,
    recordsByEntryId,
    tagById,
    listById,
    gameTagRows: data.gameTagRows,
    libraryEntryListRows: data.libraryEntryListRows,
    query: deferredQuery,
    filter,
    selectedListFilter: effectiveSelectedListFilter,
    selectedGameId,
  });

  const resolvedSelectedGameId = selectedGame?.id ?? 0;

  const selectedGamePage = useSelectedGamePage({
    selectedGame,
    selectedRecord,
    sessionRows: data.sessionRows,
    gameTagRows: data.gameTagRows,
    libraryEntryListRows: data.libraryEntryListRows,
    tagById,
    listById,
    reviewByEntryId,
    goalRows: resolvedGoalRows,
    plannerGoalSignals,
    preferences,
  });

  const visiblePlannerQueue = computedPlannerQueue.filter((entry) => {
    const game = findGame(entry.gameId);
    return matchesQuery([game?.title ?? "", entry.reason, entry.fit, entry.eta]);
  });
  const visibleSessions = data.sessionRows.filter((entry) => {
    const game = findGame(entry.libraryEntryId);
    return matchesQuery([
      game?.title ?? "",
      game?.platform ?? "",
      entry.note ?? "",
      entry.durationMinutes,
    ]);
  });
  const heroCopy = screenMeta[screen];

  const readBackupTables = async (): Promise<BackupTables> => {
    const [gamesRows, libraryEntries, playSessions, reviews, lists, libraryEntryLists, tags, gameTags, goals, settings] = await Promise.all([
      db.games.toArray(),
      db.libraryEntries.toArray(),
      db.playSessions.toArray(),
      db.reviews.toArray(),
      db.lists.toArray(),
      db.libraryEntryLists.toArray(),
      db.tags.toArray(),
      db.gameTags.toArray(),
      db.goals.toArray(),
      db.settings.toArray(),
    ]);
    return { games: gamesRows, libraryEntries, playSessions, reviews, lists, libraryEntryLists, tags, gameTags, goals, settings };
  };

  const openCreateGameModal = () => {
    setGameForm(
      createGameFormState(undefined, {
        platform: preferences.primaryPlatforms[0],
        sourceStore: preferences.defaultStores[0],
      }),
    );
    setGameModalMode("create");
  };
  const openEditGameModal = () => {
    if (!selectedGame) return;
    setGameForm(createGameFormState(selectedGame));
    setGameModalMode("edit");
  };
  const closeGameModal = () => setGameModalMode(null);

  const openSessionModal = (gameId?: number) => {
    setSessionEditId(null);
    setSessionForm(createSessionFormState(gameId));
    setSessionModalOpen(true);
  };
  const closeSessionModal = () => {
    setSessionModalOpen(false);
    setSessionEditId(null);
  };
  const openEditSessionModal = (session: DbPlaySession) => {
    if (!session.id) return;
    setSessionEditId(session.id);
    setSessionForm({
      gameId: String(session.libraryEntryId),
      date: session.date,
      durationMinutes: String(session.durationMinutes),
      completionPercent:
        session.completionPercent != null ? String(session.completionPercent) : "",
      mood: session.mood ?? "",
      note: session.note ?? "",
    });
    setSessionModalOpen(true);
  };

  const openGamePage = (gameId?: number) => {
    const nextGameId = typeof gameId === "number" ? gameId : selectedGame?.id;
    if (typeof nextGameId === "number" && nextGameId > 0) {
      setSelectedGameId(nextGameId);
      setScreen("game");
      return;
    }
    setScreen("library");
  };
  const openLibraryGame = (gameId?: number) => {
    if (typeof gameId === "number" && gameId > 0) setSelectedGameId(gameId);
    setScreen("library");
  };

  const openCreateGoalModal = () => {
    setGoalForm(createGoalDraft());
    setEditingGoalId(null);
    setGoalModalMode("create");
  };
  const openEditGoalModal = (goal: DbGoal) => {
    setGoalForm(createGoalDraft(goal));
    setEditingGoalId(goal.id ?? null);
    setGoalModalMode("edit");
  };
  const closeGoalModal = () => setGoalModalMode(null);

  const handleGameFormChange = <K extends keyof GameFormState>(field: K, value: GameFormState[K]) =>
    setGameForm((current) => ({ ...current, [field]: value }));
  const handleSessionFormChange = <K extends keyof SessionFormState>(field: K, value: SessionFormState[K]) =>
    setSessionForm((current) => ({ ...current, [field]: value }));
  const handleGoalFormChange = <K extends keyof GoalFormState>(field: K, value: GoalFormState[K]) =>
    setGoalForm((current) => ({ ...current, [field]: value }));

  const actions = useBacklogActions({
    records,
    libraryEntryRows: data.libraryEntryRows,
    listRows: data.listRows,
    selectedRecord,
    selectedGame,
    selectedListFilter: effectiveSelectedListFilter,
    gameModalMode,
    gameForm,
    sessionForm,
    sessionEditId,
    goalForm,
    editingGoalId,
    preferences,
    importState,
    refreshData: data.refreshData,
    readBackupTables,
    setNotice: data.setNotice,
    setSubmitting: data.setSubmitting,
    setScreen,
    setSelectedGameId,
    setSelectedListFilter,
    setGameModalMode,
    setSessionModalOpen,
    setSessionEditId,
    setGoalModalMode,
  });

  return {
    screen,
    setScreen,
    query,
    setQuery,
    deferredQuery,
    filter,
    setFilter,
    selectedListFilter: effectiveSelectedListFilter,
    setSelectedListFilter,
    selectedGameId: resolvedSelectedGameId,
    setSelectedGameId,
    loading: data.loading,
    notice: data.notice,
    submitting: data.submitting,
    heroCopy,
    preferences,
    displayName,
    hasCompletedOnboarding,
    onboardingInitialDraft,
    onboardingInitialLists,
    onboardingInitialGoalIds,
    games,
    sessionRows: data.sessionRows,
    libraryGames,
    selectedGame,
    selectedGamePage,
    monthlyProgress,
    platformData,
    monthlyHours,
    durationBuckets,
    visibleSessions,
    visiblePlannerQueue,
    continuePlayingGames,
    stats,
    goalProgress,
    personalBadges,
    monthlyRecap,
    systemRules,
    findGame,
    gameModalMode,
    gameForm,
    sessionModalOpen,
    sessionForm,
    sessionEditId,
    goalRows: resolvedGoalRows,
    listRows: data.listRows,
    listOptions,
    selectedGameLists,
    goalModalMode,
    goalForm,
    importModalOpen: importState.importModalOpen,
    importSource: importState.importSource,
    importText: importState.importText,
    importFileName: importState.importFileName,
    importPreview: importState.importPreview,
    importPreviewSummary: importState.importPreviewSummary,
    importFileInputRef: importState.importFileInputRef,
    restoreModalOpen: importState.restoreModalOpen,
    restoreMode: importState.restoreMode,
    restoreText: importState.restoreText,
    restoreFileName: importState.restoreFileName,
    restorePreview: importState.restorePreview,
    restorePreviewTotals: importState.restorePreviewTotals,
    restoreFileInputRef: importState.restoreFileInputRef,
    openCreateGameModal,
    openEditGameModal,
    closeGameModal,
    openSessionModal,
    closeSessionModal,
    openEditSessionModal,
    openImportFlow: importState.openImportFlow,
    closeImportFlow: importState.closeImportFlow,
    resetImportPreview: importState.resetImportPreview,
    openRestoreFlow: importState.openRestoreFlow,
    closeRestoreFlow: importState.closeRestoreFlow,
    resetRestorePreview: importState.resetRestorePreview,
    handleGameFormChange,
    handleSessionFormChange,
    handleGoalFormChange,
    handleImportSourceChange: importState.handleImportSourceChange,
    handleImportTextChange: importState.handleImportTextChange,
    handleRestoreModeChange: importState.handleRestoreModeChange,
    handleRestoreTextChange: importState.handleRestoreTextChange,
    handleImportPreviewActionChange: importState.handleImportPreviewActionChange,
    handleImportPreviewMatchChange: importState.handleImportPreviewMatchChange,
    handleImportPreviewRawgChange: importState.handleImportPreviewRawgChange,
    handleImportFileChange: importState.handleImportFileChange,
    handleRestoreFileChange: importState.handleRestoreFileChange,
    openLibraryGame,
    openGamePage,
    openCreateGoalModal,
    openEditGoalModal,
    closeGoalModal,
    ...actions,
  };
}
