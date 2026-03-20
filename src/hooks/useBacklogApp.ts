import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  buildDynamicTacticalGoals,
  createGameFormState,
  systemRules,
} from "../backlog/shared";
import { useBacklogActions } from "./useBacklogActions";
import { useDashboardInsights } from "../modules/dashboard/hooks/useDashboardInsights";
import { useSelectedGamePage } from "../modules/game-page/hooks/useSelectedGamePage";
import { useLibraryState } from "../modules/library/hooks/useLibraryState";
import { usePlannerInsights } from "../modules/planner/hooks/usePlannerInsights";
import { useBuildSessionInsights } from "../modules/sessions/hooks/useBuildSessionInsights";
import { useCatalogMaintenanceState } from "../modules/catalog-maintenance/hooks/useCatalogMaintenanceState";
import { guidedTourSteps } from "../modules/onboarding/utils/guidedTour";
import { useBacklogContext } from "./useBacklogContext";
import { useBacklogSelectors } from "./useBacklogSelectors";
import { readBackupTables as readBackupTablesFromDb } from "../services/backlogRepository";

export function useBacklogApp() {
  const context = useBacklogContext();
  const { data, importState, preferences, ui } = context;
  const selectors = useBacklogSelectors(context);
  const {
    guidedTourOpen,
    openGuidedTour,
    closeGuidedTour: closeGuidedTourState,
    selectedGameId,
    setSelectedGameId,
    selectedLibraryIds,
    setSelectedLibraryIds,
  } = ui;
  const hasAutoOpenedGuidedTour = useRef(false);
  const {
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
  } = selectors;

  const {
    listOptions,
    libraryGames,
    groupedLibraryGames,
    selectedGame,
    selectedRecord,
    selectedGameLists,
    activeSavedView,
    currentViewDraft,
  } = useLibraryState({
    games,
    recordsByEntryId,
    tagById,
    listById,
    gameTagRows: data.gameTagRows,
    libraryEntryListRows: data.libraryEntryListRows,
    query: ui.query,
    searchQuery: ui.deferredQuery,
    filter: ui.filter,
    selectedListFilter: effectiveSelectedListFilter,
    sortBy: ui.librarySortBy,
    sortDirection: ui.librarySortDirection,
    groupBy: ui.libraryGroupBy,
    savedViews: data.savedViewRows,
    selectedGameId: ui.selectedGameId,
  });

  const findGame = useCallback((id: number) => games.find((game) => game.id === id), [games]);
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
    storeData,
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

  const matchesQuery = useCallback(
    (values: Array<string | number>) =>
      !ui.deferredQuery ||
      values.some((value) => String(value).toLowerCase().includes(ui.deferredQuery)),
    [ui.deferredQuery],
  );

  const resolvedSelectedGameId = selectedGame?.id ?? 0;

  const selectedGamePage = useSelectedGamePage({
    selectedGame,
    selectedRecord,
    sessionRows: data.sessionRows,
    storeNamesByEntryId,
    platformNamesByGameId,
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

  const visiblePlannerQueue = useMemo(
    () =>
      computedPlannerQueue.filter((entry) => {
        const game = findGame(entry.gameId);
        return matchesQuery([game?.title ?? "", entry.reason, entry.fit, entry.eta]);
      }),
    [computedPlannerQueue, findGame, matchesQuery],
  );
  const visibleSessions = useMemo(
    () =>
      data.sessionRows.filter((entry) => {
        const game = findGame(entry.libraryEntryId);
        return matchesQuery([
          game?.title ?? "",
          game?.platform ?? "",
          entry.note ?? "",
          entry.durationMinutes,
        ]);
      }),
    [data.sessionRows, findGame, matchesQuery],
  );

  const catalogMaintenanceReport = useCatalogMaintenanceState({
    gameRows: data.gameRows,
    libraryEntryRows: data.libraryEntryRows,
    sessionRows: data.sessionRows,
    reviewRows: data.reviewRows,
    listRows: data.listRows,
    libraryEntryListRows: data.libraryEntryListRows,
    storeRows: data.storeRows,
    libraryEntryStoreRows: data.libraryEntryStoreRows,
    platformRows: data.platformRows,
    gamePlatformRows: data.gamePlatformRows,
    tagRows: data.tagRows,
    gameTagRows: data.gameTagRows,
  });
  const catalogAuditReport = catalogMaintenanceReport.audit;

  const readBackupTables = useCallback(() => readBackupTablesFromDb(), []);

  const actions = useBacklogActions({
    records,
    libraryEntryRows: data.libraryEntryRows,
    listRows: data.listRows,
    savedViewRows: data.savedViewRows,
    selectedRecord,
    selectedGame,
    selectedListFilter: effectiveSelectedListFilter,
    selectedLibraryIds: ui.selectedLibraryIds,
    currentLibraryView: currentViewDraft,
    gameModalMode: ui.gameModalMode,
    gameForm: ui.gameForm,
    batchEditForm: ui.batchEditForm,
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
    setFilter: ui.setFilter,
    setSelectedGameId: ui.setSelectedGameId,
    setSelectedListFilter: ui.setSelectedListFilter,
    setLibrarySortBy: ui.setLibrarySortBy,
    setLibrarySortDirection: ui.setLibrarySortDirection,
    setLibraryGroupBy: ui.setLibraryGroupBy,
    setQuery: ui.setQuery,
    setGameModalMode: ui.setGameModalMode,
    setSelectedLibraryIds: ui.setSelectedLibraryIds,
    setSessionModalOpen: ui.setSessionModalOpen,
    setSessionEditId: ui.setSessionEditId,
    setGoalModalMode: ui.setGoalModalMode,
    setBatchEditModalOpen: ui.setBatchEditModalOpen,
  });

  const guidedTourStep = guidedTourSteps[ui.guidedTourStepIndex] ?? guidedTourSteps[0];
  const guidedTourTarget = ui.guidedTourOpen ? guidedTourStep.target : null;

  useEffect(() => {
    if (
      !hasCompletedOnboarding ||
      preferences.guidedTourCompleted ||
      guidedTourOpen ||
      hasAutoOpenedGuidedTour.current
    ) {
      return;
    }

    hasAutoOpenedGuidedTour.current = true;
    openGuidedTour("dashboard");
  }, [guidedTourOpen, hasCompletedOnboarding, openGuidedTour, preferences.guidedTourCompleted]);

  useEffect(() => {
    if (selectedGameId <= 0) return;
    if (games.some((game) => game.id === selectedGameId)) return;
    setSelectedGameId(games[0]?.id ?? 0);
  }, [games, selectedGameId, setSelectedGameId]);

  useEffect(() => {
    const validIds = new Set(games.map((game) => game.id));
    const nextSelectedIds = selectedLibraryIds.filter((entryId) => validIds.has(entryId));
    if (nextSelectedIds.length === selectedLibraryIds.length) return;
    setSelectedLibraryIds(nextSelectedIds);
  }, [games, selectedLibraryIds, setSelectedLibraryIds]);

  const closeGuidedTour = async () => {
    const persisted = await actions.handleGuidedTourComplete();
    closeGuidedTourState(true);
    if (persisted) data.setNotice("Guia rápido encerrado. Você pode reabrir esse tutorial no Perfil.");
  };

  const finishGuidedTour = async () => {
    const persisted = await actions.handleGuidedTourComplete();
    closeGuidedTourState(true);
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
    librarySortBy: ui.librarySortBy,
    setLibrarySortBy: ui.setLibrarySortBy,
    librarySortDirection: ui.librarySortDirection,
    setLibrarySortDirection: ui.setLibrarySortDirection,
    libraryGroupBy: ui.libraryGroupBy,
    setLibraryGroupBy: ui.setLibraryGroupBy,
    selectedGameId: resolvedSelectedGameId,
    setSelectedGameId: ui.setSelectedGameId,
    selectedLibraryIds: ui.selectedLibraryIds,
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
    autoSyncWatchKey,
    games,
    reviewRows: data.reviewRows,
    tagRows: data.tagRows,
    gameTagRows: data.gameTagRows,
    libraryEntryListRows: data.libraryEntryListRows,
    libraryEntryStoreRows: data.libraryEntryStoreRows,
    sessionRows: data.sessionRows,
    libraryGames,
    selectedGame,
    selectedGamePage,
    monthlyProgress,
    platformData,
    storeData,
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
    batchEditModalOpen: ui.batchEditModalOpen,
    batchEditForm: ui.batchEditForm,
    sessionModalOpen: ui.sessionModalOpen,
    sessionForm: ui.sessionForm,
    sessionEditId: ui.sessionEditId,
    goalRows: resolvedGoalRows,
    listRows: data.listRows,
    savedViewRows: data.savedViewRows,
    listOptions,
    groupedLibraryGames,
    activeSavedView,
    selectedGameLists,
    selectedBatchGames,
    goalModalMode: ui.goalModalMode,
    goalForm: ui.goalForm,
    storeRows: data.storeRows,
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
    openBatchEditModal: ui.openBatchEditModal,
    closeBatchEditModal: ui.closeBatchEditModal,
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
    handleBatchEditFormChange: ui.handleBatchEditFormChange,
    handleSessionFormChange: ui.handleSessionFormChange,
    handleGoalFormChange: ui.handleGoalFormChange,
    toggleLibrarySelection: ui.toggleLibrarySelection,
    clearLibrarySelection: ui.clearLibrarySelection,
    selectVisibleLibraryGames: ui.selectVisibleLibraryGames,
    handleImportSourceChange: importState.handleImportSourceChange,
    handleImportTextChange: importState.handleImportTextChange,
    handleRestoreModeChange: importState.handleRestoreModeChange,
    handleRestoreTextChange: importState.handleRestoreTextChange,
    handleImportPreviewActionChange: importState.handleImportPreviewActionChange,
    handleImportPreviewMatchChange: importState.handleImportPreviewMatchChange,
    handleImportPreviewGameChange: importState.handleImportPreviewGameChange,
    handleImportPreviewRawgChange: importState.handleImportPreviewRawgChange,
    handleImportPreviewApplySuggested: importState.handleImportPreviewApplySuggested,
    handleImportPreviewAutoMergeSafe: importState.handleImportPreviewAutoMergeSafe,
    handleImportPreviewIgnoreUnsafe: importState.handleImportPreviewIgnoreUnsafe,
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
    importJobRows: data.importJobRows,
    platforms: data.platformRows,
    gamePlatformRows: data.gamePlatformRows,
    ...actions,
  };
}
