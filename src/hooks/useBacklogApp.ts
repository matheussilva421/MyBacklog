import { useEffect, useMemo, useRef } from "react";
import { db } from "../core/db";
import {
  buildDynamicTacticalGoals,
  composeLibraryRecords,
  createGameFormState,
  createPreferencesDraft,
  dbGameToUiGame,
  onboardingGoalTemplates,
  screenMeta,
  suggestedStarterLists,
  systemRules,
  type BackupTables,
  type LibraryListFilter,
} from "../backlog/shared";
import { useBacklogActions } from "./useBacklogActions";
import { useBacklogDataState } from "./useBacklogDataState";
import { useBacklogUiState } from "./useBacklogUiState";
import { useDashboardInsights } from "../modules/dashboard/hooks/useDashboardInsights";
import { useSelectedGamePage } from "../modules/game-page/hooks/useSelectedGamePage";
import { useImportExportState } from "../modules/import-export/hooks/useImportExportState";
import { useLibraryState } from "../modules/library/hooks/useLibraryState";
import { usePlannerInsights } from "../modules/planner/hooks/usePlannerInsights";
import { useBuildSessionInsights } from "../modules/sessions/hooks/useBuildSessionInsights";
import { useAppPreferences } from "../modules/settings/hooks/useAppPreferences";
import { useCatalogMaintenanceState } from "../modules/catalog-maintenance/hooks/useCatalogMaintenanceState";
import { guidedTourSteps } from "../modules/onboarding/utils/guidedTour";

export function useBacklogApp() {
  const data = useBacklogDataState();
  const importState = useImportExportState(data.setNotice);
  const preferences = useAppPreferences(data.settingRows);
  const ui = useBacklogUiState({ preferences });
  const hasAutoOpenedGuidedTour = useRef(false);

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
  const tagById = useMemo(
    () => new Map(data.tagRows.map((tag) => [tag.id, tag] as const)),
    [data.tagRows],
  );
  const listById = useMemo(
    () => new Map(data.listRows.map((list) => [list.id, list] as const)),
    [data.listRows],
  );
  const games = useMemo(() => records.map(dbGameToUiGame), [records]);

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
    query: ui.deferredQuery,
    filter: ui.filter,
    selectedListFilter: effectiveSelectedListFilter,
    selectedGameId: ui.selectedGameId,
  });

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
  const sessionInsights = useBuildSessionInsights({ sessionRows: data.sessionRows });
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
    sessionCadenceMap: sessionInsights.sessionCadenceMap,
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
    query: ui.deferredQuery,
  });

  const matchesQuery = (values: Array<string | number>) =>
    !ui.deferredQuery || values.some((value) => String(value).toLowerCase().includes(ui.deferredQuery));

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

  const openEditGameModal = () => {
    if (!selectedGame) return;
    ui.setGameForm(createGameFormState(selectedGame));
    ui.setGameModalMode("edit");
  };

  const openEditGameModalFor = (gameId: number) => {
    const targetGame = findGame(gameId);
    if (!targetGame) return;
    ui.setSelectedGameId(gameId);
    ui.setGameForm(createGameFormState(targetGame));
    ui.setGameModalMode("edit");
  };

  const openGamePage = (gameId?: number) => {
    const nextGameId = typeof gameId === "number" ? gameId : selectedGame?.id;
    if (typeof nextGameId === "number" && nextGameId > 0) {
      ui.setSelectedGameId(nextGameId);
      ui.setScreen("game");
      return;
    }
    ui.setScreen("library");
  };

  const openLibraryGame = (gameId?: number) => {
    if (typeof gameId === "number" && gameId > 0) ui.setSelectedGameId(gameId);
    ui.setScreen("library");
  };

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
  const heroCopy = screenMeta[ui.screen];

  const catalogMaintenanceReport = useCatalogMaintenanceState({
    gameRows: data.gameRows,
    libraryEntryRows: data.libraryEntryRows,
    sessionRows: data.sessionRows,
    reviewRows: data.reviewRows,
    listRows: data.listRows,
    libraryEntryListRows: data.libraryEntryListRows,
    tagRows: data.tagRows,
    gameTagRows: data.gameTagRows,
  });
  const catalogAuditReport = catalogMaintenanceReport.audit;

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

  const actions = useBacklogActions({
    records,
    libraryEntryRows: data.libraryEntryRows,
    listRows: data.listRows,
    selectedRecord,
    selectedGame,
    selectedListFilter: effectiveSelectedListFilter,
    gameModalMode: ui.gameModalMode,
    gameForm: ui.gameForm,
    sessionForm: ui.sessionForm,
    sessionEditId: ui.sessionEditId,
    goalForm: ui.goalForm,
    editingGoalId: ui.editingGoalId,
    preferences,
    catalogAuditReport,
    catalogMaintenanceReport,
    importState,
    refreshData: data.refreshData,
    readBackupTables,
    setNotice: data.setNotice,
    setSubmitting: data.setSubmitting,
    setScreen: ui.setScreen,
    setSelectedGameId: ui.setSelectedGameId,
    setSelectedListFilter: ui.setSelectedListFilter,
    setGameModalMode: ui.setGameModalMode,
    setSessionModalOpen: ui.setSessionModalOpen,
    setSessionEditId: ui.setSessionEditId,
    setGoalModalMode: ui.setGoalModalMode,
  });

  const guidedTourStep = guidedTourSteps[ui.guidedTourStepIndex] ?? guidedTourSteps[0];
  const guidedTourTarget = ui.guidedTourOpen ? guidedTourStep.target : null;

  useEffect(() => {
    if (!hasCompletedOnboarding || preferences.guidedTourCompleted || ui.guidedTourOpen || hasAutoOpenedGuidedTour.current) {
      return;
    }

    hasAutoOpenedGuidedTour.current = true;
    ui.openGuidedTour("dashboard");
  }, [hasCompletedOnboarding, preferences.guidedTourCompleted, ui]);

  const closeGuidedTour = async () => {
    const persisted = await actions.handleGuidedTourComplete();
    ui.closeGuidedTour(true);
    if (persisted) data.setNotice("Guia rápido encerrado. Você pode reabrir esse tutorial no Perfil.");
  };

  const finishGuidedTour = async () => {
    const persisted = await actions.handleGuidedTourComplete();
    ui.closeGuidedTour(true);
    if (persisted) data.setNotice("Tutorial guiado concluído. O Arsenal Gamer já está pronto para uso.");
  };

  return {
    screen: ui.screen,
    setScreen: ui.setScreen,
    query: ui.query,
    setQuery: ui.setQuery,
    deferredQuery: ui.deferredQuery,
    filter: ui.filter,
    setFilter: ui.setFilter,
    selectedListFilter: effectiveSelectedListFilter,
    setSelectedListFilter: ui.setSelectedListFilter,
    selectedGameId: resolvedSelectedGameId,
    setSelectedGameId: ui.setSelectedGameId,
    loading: data.loading,
    notice: data.notice,
    setNotice: data.setNotice,
    refreshData: data.refreshData,
    readBackupTables,
    submitting: data.submitting,
    heroCopy,
    preferences,
    displayName,
    hasCompletedOnboarding,
    guidedTourOpen: ui.guidedTourOpen,
    guidedTourStep,
    guidedTourStepIndex: ui.guidedTourStepIndex,
    guidedTourStepCount: guidedTourSteps.length,
    guidedTourTarget,
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
    monthlyHours: sessionInsights.monthlyHours,
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
    gameModalMode: ui.gameModalMode,
    gameForm: ui.gameForm,
    sessionModalOpen: ui.sessionModalOpen,
    sessionForm: ui.sessionForm,
    sessionEditId: ui.sessionEditId,
    goalRows: resolvedGoalRows,
    listRows: data.listRows,
    listOptions,
    selectedGameLists,
    goalModalMode: ui.goalModalMode,
    goalForm: ui.goalForm,
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
    catalogMaintenanceReport,
    catalogAuditReport,
    openCreateGameModal: ui.openCreateGameModal,
    openGuidedTour: ui.openGuidedTour,
    openEditGameModal,
    openEditGameModalFor,
    closeGameModal: ui.closeGameModal,
    openSessionModal: ui.openSessionModal,
    closeSessionModal: ui.closeSessionModal,
    openEditSessionModal: ui.openEditSessionModal,
    openImportFlow: importState.openImportFlow,
    closeImportFlow: importState.closeImportFlow,
    resetImportPreview: importState.resetImportPreview,
    openRestoreFlow: importState.openRestoreFlow,
    closeRestoreFlow: importState.closeRestoreFlow,
    resetRestorePreview: importState.resetRestorePreview,
    handleGameFormChange: ui.handleGameFormChange,
    handleSessionFormChange: ui.handleSessionFormChange,
    handleGoalFormChange: ui.handleGoalFormChange,
    handleImportSourceChange: importState.handleImportSourceChange,
    handleImportTextChange: importState.handleImportTextChange,
    handleRestoreModeChange: importState.handleRestoreModeChange,
    handleRestoreTextChange: importState.handleRestoreTextChange,
    handleImportPreviewActionChange: importState.handleImportPreviewActionChange,
    handleImportPreviewMatchChange: importState.handleImportPreviewMatchChange,
    handleImportPreviewGameChange: importState.handleImportPreviewGameChange,
    handleImportPreviewRawgChange: importState.handleImportPreviewRawgChange,
    handleImportFileChange: importState.handleImportFileChange,
    handleRestoreFileChange: importState.handleRestoreFileChange,
    openLibraryGame,
    openGamePage,
    openCreateGoalModal: ui.openCreateGoalModal,
    openEditGoalModal: ui.openEditGoalModal,
    closeGoalModal: ui.closeGoalModal,
    closeGuidedTour,
    finishGuidedTour,
    nextGuidedTourStep: () => ui.nextGuidedTourStep(guidedTourSteps.length),
    previousGuidedTourStep: ui.previousGuidedTourStep,
    ...actions,
  };
}
