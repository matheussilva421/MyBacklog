import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import AppShell from "./AppShell";

const useBacklogAppMock = vi.fn();
const useCloudSyncMock = vi.fn();

vi.mock("../hooks/useBacklogApp", () => ({
  useBacklogApp: () => useBacklogAppMock(),
}));

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => useCloudSyncMock(),
}));

vi.mock("../modules/dashboard/components/DashboardScreen", () => ({
  DashboardScreen: () => <div>dashboard-screen</div>,
}));
vi.mock("../modules/library/components/LibraryScreen", () => ({
  LibraryScreen: () => <div>library-screen</div>,
}));
vi.mock("../modules/catalog-maintenance/components/CatalogMaintenanceScreen", () => ({
  CatalogMaintenanceScreen: () => <div>maintenance-screen</div>,
}));
vi.mock("../modules/sync-center/components/SyncCenterScreen", () => ({
  SyncCenterScreen: () => <div>sync-screen</div>,
}));
vi.mock("../modules/planner/components/PlannerScreen", () => ({
  PlannerScreen: () => <div>planner-screen</div>,
}));
vi.mock("../modules/sessions/components/SessionsScreen", () => ({
  SessionsScreen: () => <div>sessions-screen</div>,
}));
vi.mock("../modules/stats/components/StatsScreen", () => ({
  StatsScreen: () => <div>stats-screen</div>,
}));
vi.mock("../modules/settings/components/ProfileScreen", () => ({
  ProfileScreen: () => <div>profile-screen</div>,
}));
vi.mock("../modules/game-page/components/GamePageScreen", () => ({
  GamePageScreen: () => <div>game-screen</div>,
}));
vi.mock("../modules/onboarding/components/GuidedTourModal", () => ({
  GuidedTourModal: ({ open, onNext, onClose }: { open: boolean; onNext: () => void; onClose: () => void }) =>
    open ? (
      <div>
        <div>guided-tour</div>
        <button onClick={onNext}>tour-next</button>
        <button onClick={onClose}>tour-close</button>
      </div>
    ) : null,
}));
vi.mock("../modules/onboarding/components/OnboardingScreen", () => ({
  OnboardingScreen: () => <div>onboarding-screen</div>,
}));
vi.mock("./backlog-modals", () => ({
  BatchEditModal: () => null,
  GameModal: () => null,
  GoalModal: () => null,
  ImportModal: () => null,
  RestoreModal: () => null,
  SessionModal: () => null,
}));

function createAppState(overrides: Record<string, unknown> = {}) {
  return {
    // Estado global e navegação
    loading: false,
    notice: null,
    submitting: false,
    screen: "dashboard",
    setScreen: vi.fn(),
    query: "",
    setQuery: vi.fn(),
    deferredQuery: "",
    filter: "Todos",
    setFilter: vi.fn(),
    selectedListFilter: "all",
    setSelectedListFilter: vi.fn(),
    librarySortBy: "updatedAt",
    setLibrarySortBy: vi.fn(),
    librarySortDirection: "desc",
    setLibrarySortDirection: vi.fn(),
    libraryGroupBy: "none",
    setLibraryGroupBy: vi.fn(),
    selectedGameId: 0,
    setSelectedGameId: vi.fn(),
    selectedLibraryIds: [],

    // Dados brutos
    games: [],
    sessionRows: [],
    libraryEntryRows: [],
    gameRows: [],
    reviewRows: [],
    tagRows: [],
    gameTagRows: [],
    libraryEntryListRows: [],
    libraryEntryStoreRows: [],
    storeRows: [],
    platformRows: [],
    gamePlatformRows: [],
    listRows: [],
    savedViewRows: [],
    goalRows: [],
    importJobRows: [],

    // Dados derivados básicos
    records: [],
    recordsByEntryId: new Map(),
    tagById: new Map(),
    listById: new Map(),
    reviewByEntryId: new Map(),
    storeNamesByEntryId: new Map(),
    platformNamesByGameId: new Map(),
    selectedBatchGames: [],
    platforms: [],
    listOptions: [],

    // Preferências e onboarding
    preferences: {
      operatorName: "Matheus",
      primaryPlatforms: ["PC"],
      defaultStores: ["Steam"],
      rawgApiKey: "",
      plannerPreference: "balanced",
      onboardingCompleted: true,
      guidedTourCompleted: true,
      autoSyncEnabled: true,
    },
    hasCompletedOnboarding: true,
    onboardingInitialDraft: {},
    onboardingInitialLists: [],
    onboardingInitialGoalIds: [],
    heroCopy: { before: "Visão", accent: "Geral" },

    // Guided tour
    guidedTourOpen: false,
    guidedTourStep: { screen: "dashboard", target: "dashboard", title: "tour", description: "tour", bullets: [] },
    guidedTourStepIndex: 0,
    guidedTourStepCount: 8,
    guidedTourTarget: null,
    openGuidedTour: vi.fn(),
    closeGuidedTour: vi.fn(),
    finishGuidedTour: vi.fn(),
    nextGuidedTourStep: vi.fn(),
    previousGuidedTourStep: vi.fn(),

    // Estado de modais e formulários
    gameModalMode: null,
    gameForm: { libraryEntryId: 0 },
    batchEditModalOpen: false,
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
    sessionForm: {},
    sessionEditId: null,
    goalModalMode: null,
    goalForm: {},

    // Estado de import/export
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

    // Handlers de formulário
    handleGameFormChange: vi.fn(),
    handleBatchEditFormChange: vi.fn(),
    handleSessionFormChange: vi.fn(),
    handleGoalFormChange: vi.fn(),
    toggleLibrarySelection: vi.fn(),
    clearLibrarySelection: vi.fn(),
    selectVisibleLibraryGames: vi.fn(),

    // Handlers de import/export
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
    openImportFlow: vi.fn(),
    closeImportFlow: vi.fn(),
    resetImportPreview: vi.fn(),
    openRestoreFlow: vi.fn(),
    closeRestoreFlow: vi.fn(),
    resetRestorePreview: vi.fn(),

    // Handlers de modal
    openCreateGameModal: vi.fn(),
    openEditGameModal: vi.fn(),
    openEditGameModalFor: vi.fn(),
    closeGameModal: vi.fn(),
    openBatchEditModal: vi.fn(),
    closeBatchEditModal: vi.fn(),
    openSessionModal: vi.fn(),
    closeSessionModal: vi.fn(),
    openEditSessionModal: vi.fn(),
    openCreateGoalModal: vi.fn(),
    openEditGoalModal: vi.fn(),
    closeGoalModal: vi.fn(),

    // Handlers de navegação
    openLibraryGame: vi.fn(),
    openGamePage: vi.fn(),

    // Utils
    findGame: vi.fn(),
    matchesQuery: vi.fn(),
    systemRules: [],

    // Catalog maintenance
    catalogMaintenanceReport: {
      summary: {
        totalIssues: 0,
        structuralIssues: 0,
        repairableStructuralIssues: 0,
        duplicateGroups: 0,
        duplicateEntries: 0,
        metadataQueue: 0,
        orphanSessions: 0,
      },
      duplicateGroups: [],
      metadataQueue: [],
      audit: {
        summary: {
          totalIssues: 0,
          repairableIssues: 0,
          metadataIssues: 0,
          orphanSessions: 0,
          playtimeIssues: 0,
          progressIssues: 0,
        },
        issues: [],
        repairPlan: { entryUpdates: [], orphanSessionIds: [] },
      },
    },
    catalogAuditReport: {
      summary: {
        totalIssues: 0,
        repairableIssues: 0,
        metadataIssues: 0,
        orphanSessions: 0,
        playtimeIssues: 0,
        progressIssues: 0,
      },
      issues: [],
      repairPlan: { entryUpdates: [], orphanSessionIds: [] },
    },

    // Handlers de ação
    handleOnboardingSubmit: vi.fn(),
    handlePreferencesSave: vi.fn(),
    handleListCreate: vi.fn(),
    handleListDelete: vi.fn(),
    handleCatalogRepair: vi.fn(),
    handleCatalogDuplicateMerge: vi.fn(),
    handleCatalogNormalizeEntry: vi.fn(),
    handleCatalogNormalizeQueue: vi.fn(),
    handleCatalogConsolidateAliasGroup: vi.fn(),
    handleCatalogMetadataEnrich: vi.fn(),
    handleCatalogMetadataEnrichQueue: vi.fn(),
    handleSaveLibraryView: vi.fn(),
    handleApplySavedView: vi.fn(),
    handleDeleteSavedView: vi.fn(),
    handleExport: vi.fn(),
    handleBackupExport: vi.fn(),
    handleDeleteSelectedGame: vi.fn(),
    handleResumeSelectedGame: vi.fn(),
    handleFavoriteSelectedGame: vi.fn(),
    handleSendSelectedToPlanner: vi.fn(),
    handleQuickSessionCreate: vi.fn(),
    handleSessionDelete: vi.fn(),
    handleGoalDelete: vi.fn(),
    handleGameReviewSave: vi.fn(),
    handleGameTagsSave: vi.fn(),
    handleGameListsSave: vi.fn(),
    handleClearImportHistory: vi.fn(),
    readBackupTables: vi.fn(),
    refreshData: vi.fn(),
    setNotice: vi.fn(),

    // Propriedades calculadas (para retrocompatibilidade com testes)
    stats: {
      total: 12,
      hours: 120,
      backlog: 5,
      playing: 2,
      finished: 5,
      totalDelta: "",
      backlogDelta: "",
      playingDelta: "",
      finishedDelta: "",
      hoursDelta: "",
    },
    monthlyProgress: [],
    platformData: [],
    storeData: [],
    durationBuckets: [],
    continuePlayingGames: [],
    visiblePlannerQueue: [],
    personalBadges: [],
    monthlyRecap: {
      title: "Recap",
      isMonthEnd: false,
      periodLabel: "Jan",
      summary: "",
      totalHours: 0,
      totalSessions: 0,
      activeGames: 0,
      activeDays: 0,
      topGameTitle: "",
      topGameHours: 0,
      completedGames: 0,
      addedGames: 0,
    },
    goalProgress: [],
    libraryGames: [],
    groupedLibraryGames: [{ key: "all", label: "Todos", games: [] }],
    selectedGame: undefined,
    selectedGameLists: [],
    activeSavedView: undefined,
    selectedGamePage: undefined,
    monthlyHours: [],
    visibleSessions: [],
    importJobs: [],
    ...overrides,
  };
}

describe("AppShell", () => {
  beforeEach(() => {
    useCloudSyncMock.mockReturnValue({
      isSyncing: false,
      isOnline: true,
      syncMode: "local-only",
      autoSyncEnabled: true,
      comparison: null,
      cloudExportedAt: null,
      lastSuccessfulSyncAt: null,
      syncHistory: [],
      isSyncBlockedByConflict: false,
      triggerSyncToCloud: vi.fn(),
      pushLocalToCloud: vi.fn(),
      pullCloudToLocal: vi.fn(),
      mergeLocalAndCloud: vi.fn(),
      workLocal: vi.fn(),
      resetLocalAndCloud: vi.fn(),
    });
  });

  it("renders the matching lazy screen", async () => {
    useBacklogAppMock.mockReturnValue(createAppState({ screen: "profile" }));

    render(<AppShell user={null} logout={vi.fn()} isAuthEnabled={false} />);

    expect(await screen.findByText("profile-screen")).toBeInTheDocument();
  });

  it("routes sidebar clicks through setScreen", async () => {
    const setScreen = vi.fn();
    useBacklogAppMock.mockReturnValue(createAppState({ setScreen }));

    render(<AppShell user={null} logout={vi.fn()} isAuthEnabled={false} />);
    await screen.findByText("dashboard-screen");
    fireEvent.click(screen.getByRole("button", { name: /perfil/i }));

    expect(setScreen).toHaveBeenCalledWith("profile");
  });

  it("forwards search changes to the app state", async () => {
    const setQuery = vi.fn();
    useBacklogAppMock.mockReturnValue(createAppState({ setQuery }));

    render(<AppShell user={null} logout={vi.fn()} isAuthEnabled={false} />);
    await screen.findByText("dashboard-screen");
    fireEvent.change(screen.getByPlaceholderText("Busca global..."), {
      target: { value: "cyber" },
    });

    expect(setQuery).toHaveBeenCalledWith("cyber");
  });

  it("renders and controls the guided tour overlay", () => {
    const nextGuidedTourStep = vi.fn();
    const closeGuidedTour = vi.fn();
    useBacklogAppMock.mockReturnValue(
      createAppState({
        guidedTourOpen: true,
        nextGuidedTourStep,
        closeGuidedTour,
      }),
    );

    render(<AppShell user={null} logout={vi.fn()} isAuthEnabled={false} />);
    fireEvent.click(screen.getByText("tour-next"));
    fireEvent.click(screen.getByText("tour-close"));

    expect(screen.getByText("guided-tour")).toBeInTheDocument();
    expect(nextGuidedTourStep).toHaveBeenCalled();
    expect(closeGuidedTour).toHaveBeenCalled();
  });

  it("renders onboarding before the main shell when the setup is incomplete", () => {
    useBacklogAppMock.mockReturnValue(createAppState({ hasCompletedOnboarding: false }));

    render(<AppShell user={null} logout={vi.fn()} isAuthEnabled={false} />);

    expect(screen.getByText("onboarding-screen")).toBeInTheDocument();
  });

  it("renders the sync center route", async () => {
    useBacklogAppMock.mockReturnValue(createAppState({ screen: "sync" }));

    render(<AppShell user={null} logout={vi.fn()} isAuthEnabled={false} />);

    expect(await screen.findByText("sync-screen")).toBeInTheDocument();
  });
});
