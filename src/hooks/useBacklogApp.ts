import { useCallback, useEffect, useRef } from "react";
import {
  systemRules,
} from "../backlog/shared";
import type { List } from "../core/types";
import { useBacklogActions } from "./useBacklogActions";
import { useCatalogMaintenanceState } from "../modules/catalog-maintenance/hooks/useCatalogMaintenanceState";
import { guidedTourSteps } from "../modules/onboarding/utils/guidedTour";
import { useBacklogContext } from "./useBacklogContext";
import { useBacklogSelectors } from "./useBacklogSelectors";
import { readBackupTables as readBackupTablesFromDb } from "../services/backlogRepository";

/**
 * Hook centralizado que fornece apenas dados básicos e ações globais.
 *
 * Nota: Os hooks de feature foram movidos para dentro de cada componente de tela
 * para prevenir re-renderizações em cascata e cálculos desnecessários.
 *
 * - DashboardScreen usa useDashboardInsights diretamente
 * - LibraryScreen usa useLibraryState diretamente
 * - PlannerScreen usa usePlannerInsights diretamente
 * - GamePageScreen usa useSelectedGamePage diretamente
 * - SessionsScreen usa useBuildSessionInsights diretamente
 */
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

  const findGame = useCallback((id: number) => games.find((game) => game.id === id), [games]);
  const matchesQuery = useCallback(
    (values: Array<string | number>) =>
      !ui.deferredQuery ||
      values.some((value) => String(value).toLowerCase().includes(ui.deferredQuery)),
    [ui.deferredQuery],
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
    selectedRecord: ui.selectedGameId ? records.find((r) => r.libraryEntry.id === ui.selectedGameId) : undefined,
    selectedGame: ui.selectedGameId ? games.find((g) => g.id === ui.selectedGameId) : undefined,
    selectedListFilter: effectiveSelectedListFilter,
    selectedLibraryIds: ui.selectedLibraryIds,
    currentLibraryView: {
      query: ui.query,
      filter: ui.filter,
      selectedListFilter: effectiveSelectedListFilter,
      sortBy: ui.librarySortBy,
      sortDirection: ui.librarySortDirection,
      groupBy: ui.libraryGroupBy,
    },
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
    // Estado global e navegação
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
    selectedGameId: ui.selectedGameId,
    setSelectedGameId: ui.setSelectedGameId,
    selectedLibraryIds: ui.selectedLibraryIds,
    selectedGame: games.find((game) => game.id === ui.selectedGameId),

    // Estado de dados
    loading: data.loading,
    notice: data.notice,
    setNotice: data.setNotice,
    refreshData: data.refreshData,
    readBackupTables,
    submitting: data.submitting,
    games,
    sessionRows: data.sessionRows,
    libraryEntryRows: data.libraryEntryRows,
    gameRows: data.gameRows,
    reviewRows: data.reviewRows,
    tagRows: data.tagRows,
    gameTagRows: data.gameTagRows,
    libraryEntryListRows: data.libraryEntryListRows,
    libraryEntryStoreRows: data.libraryEntryStoreRows,
    storeRows: data.storeRows,
    platformRows: data.platformRows,
    gamePlatformRows: data.gamePlatformRows,
    listRows: data.listRows,
    savedViewRows: data.savedViewRows,
    goalRows: data.goalRows,
    importJobRows: data.importJobRows,

    // Dados derivados básicos
    records,
    recordsByEntryId,
    tagById,
    listById,
    reviewByEntryId,
    storeNamesByEntryId,
    platformNamesByGameId,
    selectedBatchGames,
    platforms: data.platformRows,
    listOptions: Array.from(data.listRows)
      .filter((list): list is List => list.id != null)
      .map((list) => ({ id: list.id, name: list.name }))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),

    // Preferências e onboarding
    preferences,
    displayName,
    hasCompletedOnboarding,
    onboardingInitialDraft,
    onboardingInitialLists,
    onboardingInitialGoalIds,
    heroCopy,
    autoSyncWatchKey,

    // Guided tour
    guidedTourOpen: ui.guidedTourOpen,
    guidedTourStep,
    guidedTourStepIndex: ui.guidedTourStepIndex,
    guidedTourStepCount: guidedTourSteps.length,
    guidedTourTarget,

    // Estado de modais e formulários
    gameModalMode: ui.gameModalMode,
    gameForm: ui.gameForm,
    batchEditModalOpen: ui.batchEditModalOpen,
    batchEditForm: ui.batchEditForm,
    sessionModalOpen: ui.sessionModalOpen,
    sessionForm: ui.sessionForm,
    sessionEditId: ui.sessionEditId,
    goalModalMode: ui.goalModalMode,
    goalForm: ui.goalForm,

    // Estado de import/export
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

    // Handlers de formulário
    handleGameFormChange: ui.handleGameFormChange,
    handleBatchEditFormChange: ui.handleBatchEditFormChange,
    handleSessionFormChange: ui.handleSessionFormChange,
    handleGoalFormChange: ui.handleGoalFormChange,
    toggleLibrarySelection: ui.toggleLibrarySelection,
    clearLibrarySelection: ui.clearLibrarySelection,
    selectVisibleLibraryGames: ui.selectVisibleLibraryGames,

    // Handlers de import/export
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

    // Handlers de modal
    openCreateGameModal: ui.openCreateGameModal,
    openEditGameModal: ui.openEditGameModal,
    openEditGameModalFor: ui.openEditGameModalFor,
    openGuidedTour: ui.openGuidedTour,
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
    openCreateGoalModal: ui.openCreateGoalModal,
    openEditGoalModal: ui.openEditGoalModal,
    closeGoalModal: ui.closeGoalModal,

    // Handlers de navegação
    openLibraryGame: (gameId?: number) => {
      if (typeof gameId === "number" && gameId > 0) ui.setSelectedGameId(gameId);
      ui.setScreen("library");
    },
    openGamePage: (gameId?: number) => {
      const nextGameId = typeof gameId === "number" ? gameId : undefined;
      if (typeof nextGameId === "number" && nextGameId > 0) {
        ui.setSelectedGameId(nextGameId);
        ui.setScreen("game");
        return;
      }
      ui.setScreen("library");
    },

    // Handlers de guided tour
    closeGuidedTour,
    finishGuidedTour,
    nextGuidedTourStep: () => ui.nextGuidedTourStep(guidedTourSteps.length),
    previousGuidedTourStep: ui.previousGuidedTourStep,

    // Utils
    findGame,
    matchesQuery,
    systemRules,

    // Catalog maintenance
    catalogMaintenanceReport,
    catalogAuditReport,

    // Todas as actions do useBacklogActions
    ...actions,
  };
}
