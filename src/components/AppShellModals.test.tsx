import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShellModals } from "./AppShellModals";

vi.mock("./backlog-modals", () => ({
  GameModal: () => <div>game-modal</div>,
  BatchEditModal: () => <div>batch-edit-modal</div>,
  SessionModal: () => <div>session-modal</div>,
  GoalModal: () => <div>goal-modal</div>,
  ImportModal: () => <div>import-modal</div>,
  RestoreModal: () => <div>restore-modal</div>,
}));

function createAppState(overrides: Record<string, unknown> = {}) {
  return {
    gameModalMode: null,
    gameForm: {},
    storeRows: [],
    platforms: [],
    preferences: { rawgApiKey: "" },
    submitting: false,
    closeGameModal: vi.fn(),
    handleGameFormChange: vi.fn(),
    handleGameSubmit: vi.fn(),
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
    selectedBatchGames: [],
    tagRows: [],
    listRows: [],
    closeBatchEditModal: vi.fn(),
    handleBatchEditFormChange: vi.fn(),
    handleBatchEditSubmit: vi.fn(),
    sessionModalOpen: false,
    sessionEditId: null,
    sessionForm: {},
    games: [],
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
    importPreviewSummary: {
      create: 0,
      update: 0,
      ignore: 0,
      fresh: 0,
      existing: 0,
      review: 0,
      duplicates: 0,
      assisted: 0,
      maintenance: 0,
    },
    importFileInputRef: { current: null },
    closeImportFlow: vi.fn(),
    handleImportSourceChange: vi.fn(),
    handleImportTextChange: vi.fn(),
    handleImportFileChange: vi.fn(),
    handleImportPreviewActionChange: vi.fn(),
    handleImportPreviewMatchChange: vi.fn(),
    handleImportPreviewGameChange: vi.fn(),
    handleImportPreviewRawgChange: vi.fn(),
    handleImportPreviewApplySuggested: vi.fn(),
    handleImportPreviewAutoMergeSafe: vi.fn(),
    handleImportPreviewIgnoreUnsafe: vi.fn(),
    handleImportSubmit: vi.fn(),
    restoreModalOpen: false,
    restoreMode: "merge",
    restoreText: "",
    restoreFileName: "",
    restorePreview: null,
    restorePreviewTotals: { create: 0, update: 0, skip: 0 },
    restoreFileInputRef: { current: null },
    closeRestoreFlow: vi.fn(),
    handleRestoreModeChange: vi.fn(),
    handleRestoreTextChange: vi.fn(),
    handleRestoreFileChange: vi.fn(),
    handleRestoreSubmit: vi.fn(),
    ...overrides,
  };
}

describe("AppShellModals", () => {
  it("renders only the most recently opened modal when states overlap", async () => {
    const { rerender } = render(<AppShellModals app={createAppState({ gameModalMode: "create" }) as never} />);

    await screen.findByText("game-modal");

    rerender(<AppShellModals app={createAppState({ gameModalMode: "create", importModalOpen: true }) as never} />);

    await waitFor(() => {
      expect(screen.getByText("import-modal")).toBeInTheDocument();
      expect(screen.queryByText("game-modal")).not.toBeInTheDocument();
    });
  });
});
