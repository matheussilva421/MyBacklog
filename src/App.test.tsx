import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

const useBacklogAppMock = vi.fn();

vi.mock("./hooks/useBacklogApp", () => ({
  useBacklogApp: () => useBacklogAppMock(),
}));

vi.mock("./modules/dashboard/components/DashboardScreen", () => ({
  DashboardScreen: () => <div>dashboard-screen</div>,
}));
vi.mock("./modules/library/components/LibraryScreen", () => ({
  LibraryScreen: () => <div>library-screen</div>,
}));
vi.mock("./modules/catalog-maintenance/components/CatalogMaintenanceScreen", () => ({
  CatalogMaintenanceScreen: () => <div>maintenance-screen</div>,
}));
vi.mock("./modules/planner/components/PlannerScreen", () => ({
  PlannerScreen: () => <div>planner-screen</div>,
}));
vi.mock("./modules/sessions/components/SessionsScreen", () => ({
  SessionsScreen: () => <div>sessions-screen</div>,
}));
vi.mock("./modules/stats/components/StatsScreen", () => ({
  StatsScreen: () => <div>stats-screen</div>,
}));
vi.mock("./modules/settings/components/ProfileScreen", () => ({
  ProfileScreen: () => <div>profile-screen</div>,
}));
vi.mock("./modules/game-page/components/GamePageScreen", () => ({
  GamePageScreen: () => <div>game-screen</div>,
}));
vi.mock("./modules/onboarding/components/OnboardingScreen", () => ({
  OnboardingScreen: () => <div>onboarding-screen</div>,
}));
vi.mock("./components/backlog-modals", () => ({
  GameModal: () => null,
  GoalModal: () => null,
  ImportModal: () => null,
  RestoreModal: () => null,
  SessionModal: () => null,
}));

import App from "./App";

function createAppState(overrides: Record<string, unknown> = {}) {
  return {
    loading: false,
    hasCompletedOnboarding: true,
    onboardingInitialDraft: {},
    onboardingInitialLists: [],
    onboardingInitialGoalIds: [],
    notice: null,
    submitting: false,
    handleOnboardingSubmit: vi.fn(),
    screen: "dashboard",
    setScreen: vi.fn(),
    stats: { total: 12, hours: 120 },
    monthlyProgress: [],
    platformData: [],
    continuePlayingGames: [],
    visiblePlannerQueue: [],
    personalBadges: [],
    monthlyRecap: null,
    findGame: vi.fn(),
    openLibraryGame: vi.fn(),
    openGamePage: vi.fn(),
    libraryGames: [],
    selectedGame: undefined,
    selectedGameLists: [],
    filter: "Todos",
    selectedListFilter: "all",
    listOptions: [],
    setFilter: vi.fn(),
    setSelectedListFilter: vi.fn(),
    setSelectedGameId: vi.fn(),
    handleExport: vi.fn(),
    handleBackupExport: vi.fn(),
    openRestoreFlow: vi.fn(),
    openCreateGameModal: vi.fn(),
    openEditGameModal: vi.fn(),
    handleDeleteSelectedGame: vi.fn(),
    handleResumeSelectedGame: vi.fn(),
    handleFavoriteSelectedGame: vi.fn(),
    openSessionModal: vi.fn(),
    handleSendSelectedToPlanner: vi.fn(),
    goalProgress: [],
    goalRows: [],
    systemRules: [],
    openCreateGoalModal: vi.fn(),
    openEditGoalModal: vi.fn(),
    handleGoalDelete: vi.fn(),
    games: [],
    sessionRows: [],
    deferredQuery: "",
    handleQuickSessionCreate: vi.fn(),
    openEditSessionModal: vi.fn(),
    handleSessionDelete: vi.fn(),
    durationBuckets: [],
    monthlyHours: [],
    visibleSessions: [],
    preferences: {
      operatorName: "Matheus",
      primaryPlatforms: ["PC"],
      defaultStores: ["Steam"],
      rawgApiKey: "",
      plannerPreference: "balanced",
      onboardingCompleted: true,
    },
    listRows: [],
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
    handlePreferencesSave: vi.fn(),
    handleListCreate: vi.fn(),
    handleListDelete: vi.fn(),
    handleCatalogRepair: vi.fn(),
    handleCatalogDuplicateMerge: vi.fn(),
    handleCatalogMetadataEnrich: vi.fn(),
    handleCatalogMetadataEnrichQueue: vi.fn(),
    selectedGamePage: undefined,
    gameModalMode: null,
    gameForm: {},
    closeGameModal: vi.fn(),
    handleGameFormChange: vi.fn(),
    handleGameSubmit: vi.fn(),
    sessionModalOpen: false,
    sessionForm: {},
    sessionEditId: null,
    closeSessionModal: vi.fn(),
    handleSessionFormChange: vi.fn(),
    handleSessionSubmit: vi.fn(),
    goalModalMode: null,
    goalForm: {},
    closeGoalModal: vi.fn(),
    handleGoalFormChange: vi.fn(),
    handleGoalSubmit: vi.fn(),
    importModalOpen: false,
    importSource: "csv",
    importText: "",
    importFileName: "",
    importPreview: null,
    importPreviewSummary: null,
    importFileInputRef: { current: null },
    closeImportFlow: vi.fn(),
    handleImportSourceChange: vi.fn(),
    handleImportTextChange: vi.fn(),
    handleImportFileChange: vi.fn(),
    handleImportPreviewActionChange: vi.fn(),
    handleImportPreviewMatchChange: vi.fn(),
    handleImportPreviewGameChange: vi.fn(),
    handleImportPreviewRawgChange: vi.fn(),
    handleImportSubmit: vi.fn(),
    restoreModalOpen: false,
    restoreMode: "merge",
    restoreText: "",
    restoreFileName: "",
    restorePreview: null,
    restorePreviewTotals: null,
    restoreFileInputRef: { current: null },
    closeRestoreFlow: vi.fn(),
    handleRestoreModeChange: vi.fn(),
    handleRestoreTextChange: vi.fn(),
    handleRestoreFileChange: vi.fn(),
    handleRestoreSubmit: vi.fn(),
    query: "",
    setQuery: vi.fn(),
    heroCopy: { before: "Visão", accent: "Geral" },
    openImportFlow: vi.fn(),
    ...overrides,
  };
}

describe("App", () => {
  it("renders the matching screen", () => {
    useBacklogAppMock.mockReturnValue(createAppState({ screen: "profile" }));

    render(<App />);

    expect(screen.getByText("profile-screen")).toBeInTheDocument();
  });

  it("routes sidebar clicks through setScreen", () => {
    const setScreen = vi.fn();
    useBacklogAppMock.mockReturnValue(createAppState({ setScreen }));

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /perfil/i }));

    expect(setScreen).toHaveBeenCalledWith("profile");
  });

  it("forwards search changes to the app state", () => {
    const setQuery = vi.fn();
    useBacklogAppMock.mockReturnValue(createAppState({ setQuery }));

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText("Busca global..."), { target: { value: "cyber" } });

    expect(setQuery).toHaveBeenCalledWith("cyber");
  });
});
