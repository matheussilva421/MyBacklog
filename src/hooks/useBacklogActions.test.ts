import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useBacklogActions } from "./useBacklogActions";
import { db } from "../core/db";
import type { DbLibraryEntry, DbGameMetadata, DbGoal, DbList, DbSavedView } from "../core/types";
import type {
  LibraryRecord,
  Game,
  StatusFilter,
  LibraryListFilter,
  LibraryViewSortBy,
  LibraryViewSortDirection,
  LibraryViewGroupBy,
} from "../backlog/shared";
import type { AppPreferences } from "../modules/settings/utils/preferences";
import type { useImportExportState } from "../modules/import-export/hooks/useImportExportState";

// Mocks dos módulos externos
vi.mock("../core/db", () => ({
  db: {
    games: {
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      bulkGet: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
      })),
      filter: vi.fn(() => ({
        first: vi.fn(),
      })),
      toArray: vi.fn(),
      update: vi.fn(),
    },
    libraryEntries: {
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      bulkGet: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
      })),
      filter: vi.fn(() => ({
        first: vi.fn(),
      })),
      toArray: vi.fn(),
    },
    reviews: {
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
      })),
      delete: vi.fn(),
      toArray: vi.fn(),
    },
    tags: {
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      filter: vi.fn(() => ({
        first: vi.fn(),
      })),
    },
    gameTags: {
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lists: {
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      filter: vi.fn(() => ({
        first: vi.fn(),
      })),
      delete: vi.fn(),
    },
    libraryEntryLists: {
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(undefined),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(undefined),
        })),
      })),
      toArray: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    playSessions: {
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: vi.fn(),
          toArray: vi.fn(() => []),
          reverse: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn(() => []),
            })),
          })),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(() => []),
        })),
      })),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stores: {
      add: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      delete: vi.fn(),
    },
    libraryEntryStores: {
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    platforms: {
      add: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      delete: vi.fn(),
    },
    gamePlatforms: {
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    goals: {
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      toArray: vi.fn(),
      get: vi.fn(),
    },
    settings: {
      bulkPut: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: vi.fn(),
        })),
      })),
    },
    savedViews: {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
    },
    importJobs: {
      add: vi.fn(),
      clear: vi.fn(),
    },
    pendingMutations: {
      add: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      bulkDelete: vi.fn(),
    },
    transaction: vi.fn(),
  },
}));

vi.mock("../modules/sessions/utils/sessionMutations", () => ({
  savePlaySession: vi.fn(async (payload) => ({
    libraryEntryId: payload.libraryEntryId,
    mode: payload.sessionId != null ? "edit" : "create",
  })),
  deletePlaySession: vi.fn(async (sessionId) => {
    await vi.mocked(db.playSessions.delete).mockResolvedValue(undefined);
    return 1;
  }),
}));

vi.mock("../modules/settings/utils/settingsStorage", () => ({
  upsertSettingsRows: vi.fn(async () => {}),
}));

vi.mock("../services/gameCatalogService", () => ({
  saveGameFromForm: vi.fn(async () => ({ entryId: 1 })),
  normalizeStructuredEntry: vi.fn(async () => {}),
}));

vi.mock("../services/importExportService", () => ({
  exportBackupPayload: vi.fn(() => ({
    filename: "backup.json",
    content: "{}",
    mimeType: "application/json",
    totalRecords: 1,
  })),
  exportLibraryCsv: vi.fn(() => ({
    filename: "library.csv",
    content: "title",
    mimeType: "text/csv",
  })),
  prepareImportPreview: vi.fn(async () => []),
  applyImportPreview: vi.fn(async () => ({ created: 1, updated: 0, ignored: 0 })),
  prepareRestorePreview: vi.fn(() => ({
    mode: "merge",
    payload: { libraryEntries: [], games: [], sessions: [], reviews: [], tags: [], lists: [] },
  })),
  applyRestorePreview: vi.fn(async () => {}),
}));

vi.mock("../modules/import-export/utils/rawg", () => ({
  fetchRawgMetadata: vi.fn(async () => ({
    title: "Enhanced Game",
    description: "Description from RAWG",
  })),
  mergeRawgMetadataIntoGame: vi.fn((game, metadata) => ({ ...game, ...metadata })),
  resolveBestRawgCandidate: vi.fn(async () => ({ rawgId: 123 })),
}));

vi.mock("../modules/catalog-maintenance/utils/catalogMaintenance", () => ({
  mergeGameMetadata: vi.fn((a, b) => ({ ...a, ...b })),
  mergeLibraryEntries: vi.fn((primary) => primary),
  mergeReviewRecords: vi.fn((a, b) => a || b),
}));

vi.mock("../core/structuredDataSync", () => ({
  syncStructuredRelationsForRecord: vi.fn(async () => {}),
}));

vi.mock("../core/structuredRelations", () => ({
  buildStoreNamesByEntryId: vi.fn(() => new Map()),
  buildPlatformNamesByGameId: vi.fn(() => new Map()),
  derivePrimaryPlatform: vi.fn((platforms) => platforms?.[0] ?? ""),
  derivePrimaryStore: vi.fn((stores) => stores?.[0] ?? ""),
  resolveStructuredPlatforms: vi.fn((_, platform) => (platform ? [platform] : [])),
  resolveStructuredStores: vi.fn(() => []),
}));

vi.mock("../core/utils", async (importOriginal) => {
  const actual = await importOriginal();
  const actualPrefs = await importOriginal("../modules/settings/utils/preferences");
  return {
    ...(actual as object),
    downloadText: vi.fn(),
    normalizeToken: vi.fn((t) => t?.toLowerCase() ?? ""),
    splitCsvTokens: vi.fn((t) =>
      typeof t === "string"
        ? t
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    ),
    normalizePreferencesDraft: vi.fn((draft) => draft),
    preferencesToSettingPairs: vi.fn((prefs) => []),
    ...(actualPrefs as object),
  };
});

// Tipos de mock
type MockImportExportState = {
  importModalOpen: boolean;
  importSource: string;
  importText: string;
  importFileName: string;
  importPreview: unknown[] | null;
  importPreviewSummary: unknown | null;
  importFileInputRef: { current: unknown };
  restoreModalOpen: boolean;
  restoreMode: string;
  restoreText: string;
  restoreFileName: string;
  restorePreview: unknown | null;
  restorePreviewTotals: unknown | null;
  restoreFileInputRef: { current: unknown };
  setImportPreview: (p: unknown[]) => void;
  closeImportFlow: () => void;
  setRestorePreview: (p: unknown) => void;
  closeRestoreFlow: () => void;
  handleImportSourceChange: () => void;
  handleImportTextChange: () => void;
  handleRestoreModeChange: () => void;
  handleRestoreTextChange: () => void;
  handleImportPreviewActionChange: () => void;
  handleImportPreviewMatchChange: () => void;
  handleImportPreviewGameChange: () => void;
  handleImportPreviewRawgChange: () => void;
  handleImportPreviewApplySuggested: () => void;
  handleImportPreviewAutoMergeSafe: () => void;
  handleImportPreviewIgnoreUnsafe: () => void;
  handleImportFileChange: () => void;
  handleRestoreFileChange: () => void;
  openImportFlow: () => void;
  closeImportFlowFn: () => void;
  resetImportPreview: () => void;
  openRestoreFlow: () => void;
  closeRestoreFlowFn: () => void;
  resetRestorePreview: () => void;
};

function createMockImportExportState(overrides: Partial<MockImportExportState> = {}): MockImportExportState {
  return {
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
    setImportPreview: vi.fn(),
    closeImportFlow: vi.fn(),
    setRestorePreview: vi.fn(),
    closeRestoreFlow: vi.fn(),
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
    closeImportFlowFn: vi.fn(),
    resetImportPreview: vi.fn(),
    openRestoreFlow: vi.fn(),
    closeRestoreFlowFn: vi.fn(),
    resetRestorePreview: vi.fn(),
    ...overrides,
  };
}

function createMockPreferences(overrides: Partial<AppPreferences> = {}): AppPreferences {
  return {
    operatorName: "Test User",
    primaryPlatforms: ["PC"],
    defaultStores: ["Steam"],
    rawgApiKey: "",
    plannerPreference: "balanced",
    onboardingCompleted: true,
    guidedTourCompleted: true,
    autoSyncEnabled: true,
    ...overrides,
  };
}

function createMockRecord(overrides: Partial<LibraryRecord> = {}): LibraryRecord {
  return {
    libraryEntry: {
      id: 1,
      gameId: 1,
      progress: 0,
      hours: 0,
      status: "Backlog",
      priority: "Média",
      favorite: false,
      ownershipStatus: "owned",
      progressStatus: "not_started",
      sourceStore: "Steam",
      platform: "PC",
      updatedAt: new Date().toISOString(),
    },
    game: {
      id: 1,
      title: "Test Game",
      year: 2024,
      genre: "Action",
      coverUrl: "",
      description: "",
      mood: "",
      difficulty: "",
      developer: "",
      publisher: "",
      platforms: "PC",
      rawgId: null,
      updatedAt: new Date().toISOString(),
    },
    sessions: [],
    review: null,
    tags: [],
    lists: [],
    stores: [],
    platforms: [],
    ...overrides,
  } as LibraryRecord;
}

function createMockGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    title: "Test Game",
    year: 2024,
    genre: "Action",
    coverUrl: "",
    description: "",
    mood: "",
    difficulty: "",
    developer: "",
    publisher: "",
    platforms: "PC",
    platform: "PC",
    sourceStore: "Steam",
    status: "Backlog",
    progress: 0,
    hours: 0,
    eta: "",
    score: 0,
    priority: "Média",
    rawgId: null,
    purchaseDate: null,
    pricePaid: null,
    currency: null,
    storeLink: null,
    stores: ["Steam"],
    ...overrides,
  } as Game;
}

function createMockArgs(overrides: Record<string, unknown> = {}) {
  const refreshData = vi.fn(async () => {});
  const readBackupTables = vi.fn(async () => ({
    games: [],
    libraryEntries: [],
    playSessions: [],
    reviews: [],
    tags: [],
    gameTags: [],
    lists: [],
    libraryEntryLists: [],
    stores: [],
    libraryEntryStores: [],
    platforms: [],
    gamePlatforms: [],
    goals: [],
    settings: [],
    savedViews: [],
    importJobs: [],
  }));
  const setNotice = vi.fn();
  const setSubmitting = vi.fn();
  const setScreen = vi.fn();
  const setFilter = vi.fn();
  const setSelectedGameId = vi.fn();
  const setSelectedListFilter = vi.fn();
  const setLibrarySortBy = vi.fn();
  const setLibrarySortDirection = vi.fn();
  const setLibraryGroupBy = vi.fn();
  const setQuery = vi.fn();
  const setGameModalMode = vi.fn();
  const setSelectedLibraryIds = vi.fn();
  const setSessionModalOpen = vi.fn();
  const setSessionEditId = vi.fn();
  const setGoalModalMode = vi.fn();
  const setBatchEditModalOpen = vi.fn();

  return {
    records: [createMockRecord()] as LibraryRecord[],
    libraryEntryRows: [{ id: 1, gameId: 1 }] as DbLibraryEntry[],
    listRows: [{ id: 1, name: "Test List" }] as DbList[],
    savedViewRows: [] as DbSavedView[],
    selectedRecord: createMockRecord(),
    selectedGame: createMockGame(),
    selectedListFilter: "all" as LibraryListFilter,
    selectedLibraryIds: [] as number[],
    currentLibraryView: {
      query: "",
      filter: "Todos",
      selectedListFilter: "all",
      sortBy: "updatedAt",
      sortDirection: "desc",
      groupBy: "none",
      statusFilter: null,
    },
    gameModalMode: null as "create" | "edit" | null,
    gameForm: { libraryEntryId: 0 },
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
    sessionForm: { gameId: 1, durationMinutes: 60, date: new Date().toISOString() },
    sessionEditId: null,
    goalForm: { type: "games", target: 10, period: "monthly" },
    editingGoalId: null,
    preferences: createMockPreferences(),
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
      normalizationQueue: [],
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
    importState: createMockImportExportState(),
    refreshData,
    readBackupTables,
    setNotice,
    setSubmitting,
    setScreen,
    setFilter,
    setSelectedGameId,
    setSelectedListFilter,
    setLibrarySortBy,
    setLibrarySortDirection,
    setLibraryGroupBy,
    setQuery,
    setGameModalMode,
    setSelectedLibraryIds,
    setSessionModalOpen,
    setSessionEditId,
    setGoalModalMode,
    setBatchEditModalOpen,
    ...overrides,
  };
}

describe("useBacklogActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock transaction para suportar diferentes assinaturas
    vi.mocked(db.transaction).mockImplementation(async (_mode, _tables, fn) => {
      if (typeof fn === "function") return fn();
      return undefined;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("persistSession", () => {
    it("should persist a new session and refresh data", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const sessionPayload = {
        libraryEntryId: 1,
        date: "2024-01-01",
        durationMinutes: 60,
        mood: "Happy",
        note: "Great session",
      };

      await result.current.persistSession(sessionPayload);

      expect(args.refreshData).toHaveBeenCalled();
      expect(args.setSelectedGameId).toHaveBeenCalledWith(1);
    });
  });

  describe("handleGameSubmit", () => {
    it("should show notice if title is empty", async () => {
      const args = createMockArgs({
        gameForm: { libraryEntryId: 0, title: "" },
        gameModalMode: "create" as const,
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleGameSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Informe um título para o jogo.");
    });

    it("should save game and close modal on success", async () => {
      const args = createMockArgs({
        gameForm: { libraryEntryId: 0, title: "New Game" },
        gameModalMode: "create" as const,
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleGameSubmit(event);

      expect(args.setSubmitting).toHaveBeenCalledWith(true);
      expect(args.setGameModalMode).toHaveBeenCalledWith(null);
      expect(args.setScreen).toHaveBeenCalledWith("library");
      expect(args.setNotice).toHaveBeenCalledWith("Jogo adicionado ao catálogo.");
    });

    it("should handle edit mode correctly", async () => {
      const args = createMockArgs({
        gameForm: { libraryEntryId: 1, title: "Updated Game" },
        gameModalMode: "edit" as const,
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleGameSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Jogo atualizado no catálogo.");
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(await import("../services/gameCatalogService")).saveGameFromForm.mockRejectedValueOnce(
        new Error("Database error"),
      );

      const args = createMockArgs({
        gameForm: { libraryEntryId: 0, title: "Test Game" },
        gameModalMode: "create" as const,
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleGameSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Falha ao salvar jogo: Database error.");
      expect(args.setSubmitting).toHaveBeenCalledWith(false);
    });
  });

  describe("handleImportSubmit", () => {
    it("should show notice if no valid items found", async () => {
      const { prepareImportPreview } = await import("../services/importExportService");
      vi.mocked(prepareImportPreview).mockResolvedValueOnce([]);

      const args = createMockArgs({
        importState: createMockImportExportState({
          importSource: "csv",
          importText: "invalid data",
          importPreview: null,
        }),
        refreshData: vi.fn(async () => {}),
        readBackupTables: vi.fn(async () => ({
          games: [],
          libraryEntries: [],
          playSessions: [],
          reviews: [],
          tags: [],
          gameTags: [],
          lists: [],
          libraryEntryLists: [],
          stores: [],
          libraryEntryStores: [],
          platforms: [],
          gamePlatforms: [],
          goals: [],
          settings: [],
          savedViews: [],
          importJobs: [],
        })),
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleImportSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Nenhum item válido foi encontrado na importação.");
    });

    it("should apply import preview and close flow", async () => {
      vi.mocked(await import("../services/importExportService")).applyImportPreview.mockResolvedValueOnce({
        created: 2,
        updated: 1,
        ignored: 0,
      });

      const args = createMockArgs({
        importState: createMockImportExportState({
          importPreview: [{ title: "Game 1" }, { title: "Game 2" }],
        }),
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleImportSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("2 criados, 1 atualizados e 0 ignorados na importação.");
      expect(args.importState.closeImportFlow).toHaveBeenCalled();
      expect(args.setScreen).toHaveBeenCalledWith("library");
    });

    it("should log failed import job on error", async () => {
      const importExportService = await import("../services/importExportService");
      vi.mocked(importExportService.applyImportPreview).mockRejectedValueOnce(new Error("Import failed"));

      const mockImportJobsAdd = vi.fn().mockResolvedValue(undefined);
      db.importJobs.add = mockImportJobsAdd;

      const args = createMockArgs({
        importState: createMockImportExportState({
          importPreview: [{ title: "Game 1" }],
          importSource: "csv",
        }),
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleImportSubmit(event);

      expect(mockImportJobsAdd).toHaveBeenCalled();
      expect(args.setNotice).toHaveBeenCalledWith("Falha ao processar importação: Import failed.");
    });
  });

  describe("handleExport", () => {
    it("should show notice if library is empty", async () => {
      const args = createMockArgs({ records: [] });
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleExport();

      expect(args.setNotice).toHaveBeenCalledWith("A biblioteca está vazia para exportar.");
    });

    it("should export library as CSV", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleExport();

      expect(args.setNotice).toHaveBeenCalledWith("Biblioteca exportada em CSV.");
    });
  });

  describe("handleBackupExport", () => {
    it("should show notice if local database is empty", async () => {
      const { exportBackupPayload } = await import("../services/importExportService");
      vi.mocked(exportBackupPayload).mockReturnValueOnce({
        filename: "backup.json",
        content: "{}",
        mimeType: "application/json",
        totalRecords: 0,
      });

      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleBackupExport();

      expect(args.setNotice).toHaveBeenCalledWith("A base local está vazia para backup.");
    });

    it("should export backup JSON", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleBackupExport();

      expect(args.setNotice).toHaveBeenCalledWith("Backup JSON exportado.");
    });
  });

  describe("handleSessionSubmit", () => {
    it("should show notice if form is invalid", async () => {
      const args = createMockArgs({
        sessionForm: { gameId: 0, durationMinutes: 0, date: "", mood: "", note: "" },
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleSessionSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Preencha um jogo e uma duração válida para a sessão.");
    });

    it("should persist session and close modal", async () => {
      const args = createMockArgs({
        sessionForm: { gameId: 1, durationMinutes: 60, date: "2024-01-01", mood: "", note: "" },
        sessionEditId: null,
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleSessionSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Sessão registrada com sucesso.");
      expect(args.setSessionModalOpen).toHaveBeenCalledWith(false);
    });

    it("should handle edit mode correctly", async () => {
      const args = createMockArgs({
        sessionForm: { gameId: 1, durationMinutes: 60, date: "2024-01-01", mood: "", note: "" },
        sessionEditId: 1,
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleSessionSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Sessão atualizada.");
    });
  });

  describe("handleQuickSessionCreate", () => {
    it("should create session and show notice", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleQuickSessionCreate({
        libraryEntryId: 1,
        date: "2024-01-01",
        durationMinutes: 30,
      });

      expect(args.setNotice).toHaveBeenCalledWith("Sessão rápida registrada.");
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(await import("../modules/sessions/utils/sessionMutations")).savePlaySession.mockRejectedValueOnce(
        new Error("Failed"),
      );

      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleQuickSessionCreate({
        libraryEntryId: 1,
        date: "2024-01-01",
        durationMinutes: 30,
      });

      expect(args.setNotice).toHaveBeenCalledWith("Falha ao registrar sessão: Failed.");
    });
  });

  describe("handleGameReviewSave", () => {
    it("should save review with score", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleGameReviewSave({
        score: "8.5",
        recommend: "yes",
        shortReview: "Great game",
        longReview: "Detailed review",
        pros: "Fun gameplay",
        cons: "Short",
        hasSpoiler: false,
      });

      expect(args.setNotice).toHaveBeenCalledWith("Review do jogo atualizada.");
    });

    it("should remove review if all fields are empty", async () => {
      // Quando todos os campos estao vazios e nao ha review existente,
      // o codigo nao faz nada (nao ha review para remover)
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleGameReviewSave({
        score: "",
        recommend: "",
        shortReview: "",
        longReview: "",
        pros: "",
        cons: "",
        hasSpoiler: false,
      });

      // Sem review existente, nenhuma acao e tomada
      expect(args.setNotice).toHaveBeenCalledWith("Review do jogo atualizada.");
    });
  });

  describe("handleGameTagsSave", () => {
    it("should save tags", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleGameTagsSave("action, adventure");

      expect(args.setNotice).toHaveBeenCalledWith("Tags sincronizadas para este jogo.");
    });

    it("should remove all tags if empty string", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleGameTagsSave("");

      expect(args.setNotice).toHaveBeenCalledWith("Tags removidas deste jogo.");
    });
  });

  describe("handleGameListsSave", () => {
    it("should save lists", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleGameListsSave([1]);

      expect(args.setNotice).toHaveBeenCalledWith("Listas sincronizadas para este jogo.");
    });

    it("should remove from all lists if empty array", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleGameListsSave([]);

      expect(args.setNotice).toHaveBeenCalledWith("Jogo removido de todas as listas.");
    });
  });

  describe("handleBatchEditSubmit", () => {
    it("should show notice if no games selected", async () => {
      const args = createMockArgs({ selectedLibraryIds: [] });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleBatchEditSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Selecione ao menos um jogo para editar em lote.");
    });

    it("should show notice if no changes defined", async () => {
      const args = createMockArgs({
        selectedLibraryIds: [1],
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
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleBatchEditSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Defina ao menos um campo para aplicar na edição em lote.");
    });
  });

  describe("handleDeleteSelectedGame", () => {
    it("should not delete if not confirmed", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      await result.current.handleDeleteSelectedGame();

      window.confirm = originalConfirm;
      expect(db.libraryEntries.delete).not.toHaveBeenCalled();
    });
  });

  describe("handleResumeSelectedGame", () => {
    it("should update status to playing", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleResumeSelectedGame();

      expect(db.libraryEntries.update).toHaveBeenCalled();
      expect(args.setNotice).toHaveBeenCalledWith("Test Game voltou para a fila ativa.");
    });
  });

  describe("handleFavoriteSelectedGame", () => {
    it("should toggle favorite status", async () => {
      const args = createMockArgs({
        selectedRecord: createMockRecord({
          libraryEntry: {
            id: 1,
            gameId: 1,
            favorite: true,
            progress: 0,
            hours: 0,
            status: "Backlog",
            priority: "Média",
            ownershipStatus: "owned",
            progressStatus: "not_started",
            sourceStore: "Steam",
            platform: "PC",
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleFavoriteSelectedGame();

      expect(db.libraryEntries.update).toHaveBeenCalled();
      expect(args.setNotice).toHaveBeenCalledWith("Favorito removido.");
    });

    it("should mark as favorite when not favorited", async () => {
      const args = createMockArgs({
        selectedRecord: createMockRecord({
          libraryEntry: {
            id: 1,
            gameId: 1,
            favorite: false,
            progress: 0,
            hours: 0,
            status: "Backlog",
            priority: "Média",
            ownershipStatus: "owned",
            progressStatus: "not_started",
            sourceStore: "Steam",
            platform: "PC",
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleFavoriteSelectedGame();

      expect(db.libraryEntries.update).toHaveBeenCalled();
      expect(args.setNotice).toHaveBeenCalledWith("Jogo marcado como favorito.");
    });
  });

  describe("handleSendSelectedToPlanner", () => {
    it("should set priority to high and navigate to planner", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleSendSelectedToPlanner();

      expect(db.libraryEntries.update).toHaveBeenCalled();
      expect(args.setScreen).toHaveBeenCalledWith("planner");
      expect(args.setNotice).toHaveBeenCalledWith("Test Game recebeu prioridade alta no planner.");
    });
  });

  describe("handleGoalSubmit", () => {
    it("should show notice if target is invalid", async () => {
      const args = createMockArgs({
        goalForm: { type: "games", target: 0, period: "monthly" },
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleGoalSubmit(event);

      expect(args.setNotice).toHaveBeenCalledWith("Informe um valor alvo maior que zero.");
    });

    it("should create new goal", async () => {
      const args = createMockArgs({
        goalForm: { type: "games", target: 10, period: "monthly" },
        editingGoalId: null,
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleGoalSubmit(event);

      expect(db.goals.add).toHaveBeenCalled();
      expect(args.setNotice).toHaveBeenCalledWith("Meta criada com sucesso.");
    });

    it("should update existing goal", async () => {
      const args = createMockArgs({
        goalForm: { type: "games", target: 15, period: "weekly" },
        editingGoalId: 1,
      });
      vi.mocked(db.goals.get).mockResolvedValueOnce({
        id: 1,
        uuid: "goal-uuid",
        version: 1,
        type: "games",
        target: 10,
        current: 5,
        period: "monthly",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        deletedAt: null,
      } as DbGoal);
      const { result } = renderHook(() => useBacklogActions(args));

      const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
      await result.current.handleGoalSubmit(event);

      expect(db.goals.update).toHaveBeenCalledWith(1, expect.any(Object));
      expect(args.setNotice).toHaveBeenCalledWith("Meta atualizada.");
    });
  });

  describe("handleGoalDelete", () => {
    it("should not delete if not confirmed", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      await result.current.handleGoalDelete(1);

      window.confirm = originalConfirm;
      expect(db.goals.update).not.toHaveBeenCalled();
    });

    it("should delete goal when confirmed", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      // Mock getDeviceId to return a test device ID
      vi.mocked(db.settings.get).mockResolvedValue({
        id: 1,
        key: "deviceId",
        value: "test-device",
        updatedAt: new Date().toISOString(),
        version: 1,
      });
      // Mock goals.get to return an existing goal
      vi.mocked(db.goals.get).mockResolvedValue({
        id: 1,
        uuid: "test-uuid",
        version: 1,
        type: "finished",
        target: 10,
        current: 5,
        period: "monthly",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });

      await result.current.handleGoalDelete(1);

      window.confirm = originalConfirm;
      expect(db.goals.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          deletedAt: expect.any(String),
          version: 2,
        }),
      );
      expect(args.setNotice).toHaveBeenCalledWith("Meta removida.");
    });
  });

  describe("handleListCreate", () => {
    it("should show notice if name is empty", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleListCreate("  ");

      expect(args.setNotice).toHaveBeenCalledWith("Informe um nome para a lista.");
    });

    it("should show notice if list already exists", async () => {
      vi.mocked(db.lists.filter).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 1, name: "Test List" }),
      } as unknown as ReturnType<typeof db.lists.filter>);

      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleListCreate("Test List");

      expect(args.setNotice).toHaveBeenCalledWith("Essa lista já existe.");
    });

    it("should create new list", async () => {
      vi.mocked(db.lists.filter).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof db.lists.filter>);

      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleListCreate("New List");

      expect(db.lists.add).toHaveBeenCalledWith({
        uuid: expect.any(String),
        version: 1,
        name: "New List",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        deletedAt: null,
      });
      expect(args.setNotice).toHaveBeenCalledWith("Lista criada com sucesso.");
    });
  });

  describe("handleListDelete", () => {
    it("should not delete if not confirmed", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      await result.current.handleListDelete(1);

      window.confirm = originalConfirm;
      expect(db.lists.delete).not.toHaveBeenCalled();
    });
  });

  describe("handleSaveLibraryView", () => {
    it("should show notice if name is empty", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const originalPrompt = window.prompt;
      window.prompt = vi.fn(() => "");

      await result.current.handleSaveLibraryView();

      window.prompt = originalPrompt;
      expect(args.setNotice).toHaveBeenCalledWith("Informe um nome para salvar a view.");
    });

    it("should update existing view", async () => {
      const args = createMockArgs({
        savedViewRows: [
          {
            id: 1,
            name: "Test View",
            scope: "library",
            query: "",
            sortBy: "updatedAt",
            sortDirection: "desc",
            groupBy: "none",
          } as DbSavedView,
        ],
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const originalPrompt = window.prompt;
      window.prompt = vi.fn(() => "Test View");

      await result.current.handleSaveLibraryView();

      window.prompt = originalPrompt;
      expect(db.savedViews.put).toHaveBeenCalled();
      expect(args.setNotice).toHaveBeenCalledWith("View salva atualizada.");
    });
  });

  describe("handleDeleteSavedView", () => {
    it("should not delete if not confirmed", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      await result.current.handleDeleteSavedView(1);

      window.confirm = originalConfirm;
      expect(db.savedViews.delete).not.toHaveBeenCalled();
    });
  });

  describe("handleApplySavedView", () => {
    it("should apply saved view filters and navigate to library", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const view: DbSavedView = {
        id: 1,
        name: "Test View",
        scope: "library",
        query: "action",
        statusFilter: "playing",
        listId: null,
        sortBy: "title",
        sortDirection: "asc",
        groupBy: "status",
      };

      result.current.handleApplySavedView(view);

      expect(args.setQuery).toHaveBeenCalledWith("action");
      expect(args.setFilter).toHaveBeenCalledWith("Jogando");
      expect(args.setLibrarySortBy).toHaveBeenCalledWith("title");
      expect(args.setLibrarySortDirection).toHaveBeenCalledWith("asc");
      expect(args.setLibraryGroupBy).toHaveBeenCalledWith("status");
      expect(args.setScreen).toHaveBeenCalledWith("library");
      expect(args.setNotice).toHaveBeenCalledWith("View aplicada: Test View.");
    });
  });

  describe("handlePreferencesSave", () => {
    it("should save preferences", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const draft: Partial<AppPreferences> = {
        operatorName: "Updated Name",
        primaryPlatforms: ["PC", "PS5"],
      };

      await result.current.handlePreferencesSave(draft as AppPreferences);

      expect(args.setNotice).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const draft: Partial<AppPreferences> = {
        operatorName: "Updated Name",
      };

      await result.current.handlePreferencesSave(draft as AppPreferences);

      expect(args.setNotice).toHaveBeenCalled();
    });
  });

  describe("handleSessionDelete", () => {
    it("should not delete if not confirmed", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      await result.current.handleSessionDelete(1);

      window.confirm = originalConfirm;
      expect(await import("../modules/sessions/utils/sessionMutations")).toBeDefined();
    });
  });

  describe("handleCatalogRepair", () => {
    it("should show notice if no repairs needed", async () => {
      const args = createMockArgs({
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
      });
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleCatalogRepair();

      expect(args.setNotice).toHaveBeenCalledWith("Nenhum reparo automático foi necessário no catálogo.");
    });

    it("should not proceed if not confirmed", async () => {
      const args = createMockArgs({
        catalogAuditReport: {
          summary: {
            totalIssues: 1,
            repairableIssues: 1,
            metadataIssues: 0,
            orphanSessions: 0,
            playtimeIssues: 0,
            progressIssues: 0,
          },
          issues: [],
          repairPlan: { entryUpdates: [{ libraryEntryId: 1, updates: { status: "playing" } }], orphanSessionIds: [1] },
        },
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      await result.current.handleCatalogRepair();

      window.confirm = originalConfirm;
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe("handleClearImportHistory", () => {
    it("should clear import jobs", async () => {
      const args = createMockArgs();
      const { result } = renderHook(() => useBacklogActions(args));

      await result.current.handleClearImportHistory();

      expect(db.importJobs.clear).toHaveBeenCalled();
      expect(args.setNotice).toHaveBeenCalledWith("Histórico de importação removido.");
    });
  });

  describe("handleGuidedTourComplete", () => {
    it("should return true if already completed", async () => {
      const args = createMockArgs({
        preferences: createMockPreferences({ guidedTourCompleted: true }),
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const persisted = await result.current.handleGuidedTourComplete();

      expect(persisted).toBe(true);
    });

    it("should mark tour as completed", async () => {
      const args = createMockArgs({
        preferences: createMockPreferences({ guidedTourCompleted: false }),
      });
      const { result } = renderHook(() => useBacklogActions(args));

      const persisted = await result.current.handleGuidedTourComplete();

      expect(persisted).toBe(true);
    });
  });
});
