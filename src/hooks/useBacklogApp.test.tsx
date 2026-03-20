import { renderHook } from "@testing-library/react";
import { vi } from "vitest";

const useBacklogDataStateMock = vi.fn();
const useImportExportStateMock = vi.fn();
const useAppPreferencesMock = vi.fn();
const useBacklogUiStateMock = vi.fn();
const useLibraryStateMock = vi.fn();
const useBuildSessionInsightsMock = vi.fn();
const usePlannerInsightsMock = vi.fn();
const useDashboardInsightsMock = vi.fn();
const useSelectedGamePageMock = vi.fn();
const useCatalogMaintenanceStateMock = vi.fn();
const useBacklogActionsMock = vi.fn();

vi.mock("./useBacklogDataState", () => ({
  useBacklogDataState: () => useBacklogDataStateMock(),
}));
vi.mock("../modules/import-export/hooks/useImportExportState", () => ({
  useImportExportState: () => useImportExportStateMock(),
}));
vi.mock("../modules/settings/hooks/useAppPreferences", () => ({
  useAppPreferences: () => useAppPreferencesMock(),
}));
vi.mock("./useBacklogUiState", () => ({
  useBacklogUiState: () => useBacklogUiStateMock(),
}));
vi.mock("../modules/library/hooks/useLibraryState", () => ({
  useLibraryState: () => useLibraryStateMock(),
}));
vi.mock("../modules/sessions/hooks/useBuildSessionInsights", () => ({
  useBuildSessionInsights: () => useBuildSessionInsightsMock(),
}));
vi.mock("../modules/planner/hooks/usePlannerInsights", () => ({
  usePlannerInsights: () => usePlannerInsightsMock(),
}));
vi.mock("../modules/dashboard/hooks/useDashboardInsights", () => ({
  useDashboardInsights: () => useDashboardInsightsMock(),
}));
vi.mock("../modules/game-page/hooks/useSelectedGamePage", () => ({
  useSelectedGamePage: () => useSelectedGamePageMock(),
}));
vi.mock("../modules/catalog-maintenance/hooks/useCatalogMaintenanceState", () => ({
  useCatalogMaintenanceState: () => useCatalogMaintenanceStateMock(),
}));
vi.mock("./useBacklogActions", () => ({
  useBacklogActions: () => useBacklogActionsMock(),
}));

import { useBacklogApp } from "./useBacklogApp";

function createBaseUiState(overrides: Record<string, unknown> = {}) {
  return {
    screen: "dashboard",
    setScreen: vi.fn(),
    query: "",
    setQuery: vi.fn(),
    deferredQuery: "",
    filter: "Todos",
    setFilter: vi.fn(),
    selectedListFilter: "all",
    setSelectedListFilter: vi.fn(),
    selectedGameId: 1,
    setSelectedGameId: vi.fn(),
    selectedLibraryIds: [],
    setSelectedLibraryIds: vi.fn(),
    gameModalMode: null,
    setGameModalMode: vi.fn(),
    gameForm: {},
    setGameForm: vi.fn(),
    batchEditModalOpen: false,
    setBatchEditModalOpen: vi.fn(),
    batchEditForm: {
      applyMode: "merge",
      status: "",
      priority: "",
      primaryPlatform: "",
      platforms: [],
      primaryStore: "",
      stores: [],
      tags: "",
      listIds: [],
    },
    sessionModalOpen: false,
    setSessionModalOpen: vi.fn(),
    sessionForm: {},
    sessionEditId: null,
    setSessionEditId: vi.fn(),
    goalModalMode: null,
    setGoalModalMode: vi.fn(),
    goalForm: {},
    editingGoalId: null,
    guidedTourOpen: false,
    setGuidedTourOpen: vi.fn(),
    guidedTourStepIndex: 0,
    setGuidedTourStepIndex: vi.fn(),
    guidedTourOriginScreen: "dashboard",
    openCreateGameModal: vi.fn(),
    closeGameModal: vi.fn(),
    openSessionModal: vi.fn(),
    closeSessionModal: vi.fn(),
    openEditSessionModal: vi.fn(),
    openCreateGoalModal: vi.fn(),
    openEditGoalModal: vi.fn(),
    closeGoalModal: vi.fn(),
    openGuidedTour: vi.fn(),
    closeGuidedTour: vi.fn(),
    nextGuidedTourStep: vi.fn(),
    previousGuidedTourStep: vi.fn(),
    handleGameFormChange: vi.fn(),
    handleBatchEditFormChange: vi.fn(),
    handleSessionFormChange: vi.fn(),
    handleGoalFormChange: vi.fn(),
    toggleLibrarySelection: vi.fn(),
    clearLibrarySelection: vi.fn(),
    selectVisibleLibraryGames: vi.fn(),
    ...overrides,
  };
}

function createGame() {
  return {
    id: 7,
    title: "Cyberpunk 2077",
    platform: "PC",
    platforms: ["PC"],
    sourceStore: "Steam",
    stores: ["Steam"],
    genre: "RPG",
    status: "Jogando",
    progress: 62,
    hours: 48,
    eta: "14h",
    priority: "Alta",
    mood: "Imersivo",
    score: 9.4,
    year: 2020,
    notes: "Main story forte.",
    difficulty: "Média",
  };
}

function createBaseDataState(overrides: Record<string, unknown> = {}) {
  return {
    gameRows: [],
    libraryEntryRows: [],
    libraryEntryListRows: [],
    libraryEntryStoreRows: [],
    sessionRows: [],
    reviewRows: [],
    tagRows: [],
    gameTagRows: [],
    goalRows: [],
    listRows: [{ id: 2, name: "Prioridade", createdAt: "2026-03-01T00:00:00.000Z" }],
    settingRows: [],
    savedViewRows: [],
    importJobRows: [],
    storeRows: [],
    platformRows: [],
    gamePlatformRows: [],
    loading: false,
    notice: null,
    submitting: false,
    setNotice: vi.fn(),
    setSubmitting: vi.fn(),
    refreshData: vi.fn(),
    ...overrides,
  };
}

describe("useBacklogApp", () => {
  beforeEach(() => {
    useBacklogDataStateMock.mockReturnValue(createBaseDataState());
    useImportExportStateMock.mockReturnValue({
      importModalOpen: false,
      importSource: "csv",
      importText: "",
      importFileName: "",
      importPreview: null,
      importPreviewSummary: null,
      importFileInputRef: { current: null },
      restoreModalOpen: false,
      restoreMode: "merge",
      restoreText: "",
      restoreFileName: "",
      restorePreview: null,
      restorePreviewTotals: null,
      restoreFileInputRef: { current: null },
      openImportFlow: vi.fn(),
      closeImportFlow: vi.fn(),
      resetImportPreview: vi.fn(),
      openRestoreFlow: vi.fn(),
      closeRestoreFlow: vi.fn(),
      resetRestorePreview: vi.fn(),
      handleImportSourceChange: vi.fn(),
      handleImportTextChange: vi.fn(),
      handleRestoreModeChange: vi.fn(),
      handleRestoreTextChange: vi.fn(),
      handleImportPreviewActionChange: vi.fn(),
      handleImportPreviewMatchChange: vi.fn(),
      handleImportPreviewGameChange: vi.fn(),
      handleImportPreviewRawgChange: vi.fn(),
      handleImportPreviewApplySuggested: vi.fn(),
      handleImportPreviewAutoMergeSafe: vi.fn(),
      handleImportPreviewIgnoreUnsafe: vi.fn(),
      handleImportFileChange: vi.fn(),
      handleRestoreFileChange: vi.fn(),
    });
    useAppPreferencesMock.mockReturnValue({
      operatorName: "Matheus",
      primaryPlatforms: ["PC"],
      defaultStores: ["Steam"],
      rawgApiKey: "",
      plannerPreference: "balanced",
      onboardingCompleted: true,
      guidedTourCompleted: true,
      autoSyncEnabled: true,
    });
    useBacklogUiStateMock.mockReturnValue(createBaseUiState());
    useLibraryStateMock.mockReturnValue({
      listOptions: [{ id: 2, name: "Prioridade", count: 1 }],
      libraryGames: [createGame()],
      selectedGame: createGame(),
      selectedRecord: {
        game: { id: 1, title: "Cyberpunk 2077" },
        libraryEntry: { id: 7, gameId: 1 },
      },
      selectedGameLists: [],
    });
    useBuildSessionInsightsMock.mockReturnValue({
      monthlyHours: [],
      sessionCadenceMap: new Map(),
    });
    usePlannerInsightsMock.mockReturnValue({
      resolvedGoalRows: [],
      plannerGoalSignals: {},
      computedPlannerQueue: [],
      goalProgress: [],
    });
    useDashboardInsightsMock.mockReturnValue({
      monthlyProgress: [],
      platformData: [],
      durationBuckets: [],
      stats: { total: 1, hours: 48 },
      personalBadges: [],
      monthlyRecap: null,
      continuePlayingGames: [],
    });
    useSelectedGamePageMock.mockReturnValue(undefined);
    useCatalogMaintenanceStateMock.mockReturnValue({
      summary: {
        totalIssues: 3,
        structuralIssues: 1,
        repairableStructuralIssues: 1,
        duplicateGroups: 1,
        duplicateEntries: 2,
        metadataQueue: 1,
        orphanSessions: 0,
      },
      duplicateGroups: [],
      metadataQueue: [],
      audit: {
        summary: {
          totalIssues: 1,
          repairableIssues: 1,
          metadataIssues: 0,
          orphanSessions: 0,
          playtimeIssues: 0,
          progressIssues: 1,
        },
        issues: [],
        repairPlan: { entryUpdates: [], orphanSessionIds: [] },
      },
    });
    useBacklogActionsMock.mockReturnValue({
      handleCatalogRepair: vi.fn(),
      handleCatalogDuplicateMerge: vi.fn(),
      handleCatalogMetadataEnrich: vi.fn(),
      handleCatalogMetadataEnrichQueue: vi.fn(),
      handleGuidedTourComplete: vi.fn(),
    });
  });

  it("normalizes invalid list filters to all", () => {
    useBacklogUiStateMock.mockReturnValue(createBaseUiState({ selectedListFilter: 999 }));

    const { result } = renderHook(() => useBacklogApp());

    expect(result.current.selectedListFilter).toBe("all");
  });

  it("opens the game page with the selected id", () => {
    const setScreen = vi.fn();
    const setSelectedGameId = vi.fn();
    useBacklogUiStateMock.mockReturnValue(
      createBaseUiState({ setScreen, setSelectedGameId }),
    );

    const { result } = renderHook(() => useBacklogApp());
    result.current.openGamePage(7);

    expect(setSelectedGameId).toHaveBeenCalledWith(7);
    expect(setScreen).toHaveBeenCalledWith("game");
  });

  it("exposes the catalog audit report from the dedicated hook", () => {
    const { result } = renderHook(() => useBacklogApp());

    expect(result.current.catalogAuditReport.summary.totalIssues).toBe(1);
    expect(result.current.catalogMaintenanceReport.summary.duplicateGroups).toBe(1);
  });

  it("opens the guided tour automatically when it has not been completed", () => {
    const openGuidedTour = vi.fn();
    useAppPreferencesMock.mockReturnValue({
      operatorName: "Matheus",
      primaryPlatforms: ["PC"],
      defaultStores: ["Steam"],
      rawgApiKey: "",
      plannerPreference: "balanced",
      onboardingCompleted: true,
      guidedTourCompleted: false,
      autoSyncEnabled: true,
    });
    useBacklogUiStateMock.mockReturnValue(createBaseUiState({ openGuidedTour }));

    renderHook(() => useBacklogApp());

    expect(openGuidedTour).toHaveBeenCalledWith("dashboard");
  });

  it("reconciles stale selected game ids and batch selection after catalog changes", () => {
    const setSelectedGameId = vi.fn();
    const setSelectedLibraryIds = vi.fn();
    useBacklogDataStateMock.mockReturnValue(
      createBaseDataState({
      gameRows: [
        {
          id: 1,
          title: "Cyberpunk 2077",
          normalizedTitle: "cyberpunk 2077",
          platforms: "PC",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      libraryEntryRows: [
        {
          id: 7,
          gameId: 1,
          platform: "PC",
          sourceStore: "Steam",
          format: "digital",
          ownershipStatus: "owned",
          progressStatus: "playing",
          priority: "high",
          completionPercent: 62,
          playtimeMinutes: 1440,
          favorite: false,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-10T00:00:00.000Z",
        },
      ],
      }),
    );
    useBacklogUiStateMock.mockReturnValue(
      createBaseUiState({
        selectedGameId: 999,
        selectedLibraryIds: [7, 999],
        setSelectedGameId,
        setSelectedLibraryIds,
      }),
    );

    renderHook(() => useBacklogApp());

    expect(setSelectedGameId).toHaveBeenCalledWith(7);
    expect(setSelectedLibraryIds).toHaveBeenCalledWith([7]);
  });
});
