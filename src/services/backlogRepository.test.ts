import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  shouldSeedDefaultLibrary,
  createFreshStartLocalSettings,
  seedDefaultLibrary,
  readBacklogDataSnapshot,
  clearBacklogDataForFreshStart,
  readBackupTables,
  emptyBacklogDataSnapshot,
} from "./backlogRepository";
import { db } from "../core/db";
import { syncSettingsKeys } from "../modules/sync-center/utils/syncStorage";

// Helper para mock de cadeias de metodos Dexie (orderBy().reverse().toArray())
type DexieOrderByChain = {
  reverse: () => { toArray: vi.Mock<Promise<unknown[]>> };
};

function createDexieOrderByMock(): DexieOrderByChain {
  return {
    reverse: vi.fn().mockReturnValue({
      toArray: vi.fn(),
    }),
  };
}

// Mock do db para testes que não precisam de IndexedDB real
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
      clear: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
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
      clear: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
    },
    reviews: {
      add: vi.fn(),
      put: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
      })),
      delete: vi.fn(),
      toArray: vi.fn(),
      clear: vi.fn(),
    },
    tags: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      filter: vi.fn(() => ({
        first: vi.fn(),
      })),
      clear: vi.fn(),
    },
    gameTags: {
      add: vi.fn(),
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
      clear: vi.fn(),
    },
    lists: {
      add: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      clear: vi.fn(),
    },
    libraryEntryLists: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    goals: {
      add: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      clear: vi.fn(),
    },
    settings: {
      add: vi.fn(),
      put: vi.fn(),
      bulkPut: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      clear: vi.fn(),
    },
    savedViews: {
      add: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      clear: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
    },
    importJobs: {
      add: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      clear: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
    },
    stores: {
      add: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn(),
      clear: vi.fn(),
    },
    libraryEntryStores: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    platforms: {
      add: vi.fn(),
      toArray: vi.fn(),
      clear: vi.fn(),
    },
    gamePlatforms: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
          delete: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    playSessions: {
      add: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      clear: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
    },
    transaction: vi.fn(),
  },
}));

// Mock do syncStructuredRelationsForRecord
vi.mock("../core/structuredDataSync", () => ({
  syncStructuredRelationsForRecord: vi.fn(),
}));

// Mock do defaultGames
vi.mock("../backlog/shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    defaultGames: [
      {
        id: 1,
        title: "Hades",
        coverUrl: "https://example.com/hades.jpg",
        rawgId: 123,
        platform: "PC",
        sourceStore: "Steam",
        ownershipStatus: "owned",
        progressStatus: "not_started",
        priority: "high",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ],
  };
});

describe("backlogRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("shouldSeedDefaultLibrary", () => {
    it("returns false when seedIfEmpty is false", () => {
      const result = shouldSeedDefaultLibrary({
        seedIfEmpty: false,
        libraryEntryCount: 0,
        settingRows: [],
      });

      expect(result).toBe(false);
    });

    it("returns false when library has entries", () => {
      const result = shouldSeedDefaultLibrary({
        seedIfEmpty: false,
        libraryEntryCount: 5,
        settingRows: [],
      });

      expect(result).toBe(false);
    });

    it("returns true when library is empty and seedIfEmpty is true", () => {
      const result = shouldSeedDefaultLibrary({
        seedIfEmpty: true,
        libraryEntryCount: 0,
        settingRows: [],
      });

      expect(result).toBe(true);
    });

    it("returns false when skipDefaultSeed setting is true", () => {
      const result = shouldSeedDefaultLibrary({
        seedIfEmpty: true,
        libraryEntryCount: 0,
        settingRows: [{ key: syncSettingsKeys.skipDefaultSeed, value: "true" }],
      });

      expect(result).toBe(false);
    });

    it("returns true when skipDefaultSeed setting is false", () => {
      const result = shouldSeedDefaultLibrary({
        seedIfEmpty: true,
        libraryEntryCount: 0,
        settingRows: [{ key: syncSettingsKeys.skipDefaultSeed, value: "false" }],
      });

      expect(result).toBe(true);
    });

    it("bloqueia o seed padrão quando existe marcador de fresh start", () => {
      const shouldSeed = shouldSeedDefaultLibrary({
        seedIfEmpty: true,
        libraryEntryCount: 0,
        settingRows: createFreshStartLocalSettings("2026-03-20T12:00:00.000Z"),
      });

      expect(shouldSeed).toBe(false);
    });

    it("continua semeando quando a base está vazia e nenhum marcador foi persistido", () => {
      const shouldSeed = shouldSeedDefaultLibrary({
        seedIfEmpty: true,
        libraryEntryCount: 0,
        settingRows: [],
      });

      expect(shouldSeed).toBe(true);
    });
  });

  describe("createFreshStartLocalSettings", () => {
    it("creates settings with skipDefaultSeed set to true", () => {
      const testDate = "2024-06-15T10:00:00.000Z";
      const result = createFreshStartLocalSettings(testDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: syncSettingsKeys.skipDefaultSeed,
        value: "true",
        updatedAt: testDate,
      });
    });

    it("uses current timestamp when not provided", () => {
      const result = createFreshStartLocalSettings();

      expect(result).toHaveLength(1);
      expect(result[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe("seedDefaultLibrary", () => {
    it("seeds default games using transaction", async () => {
      const mockGameId = 1;
      const mockLibraryEntryId = 1;

      vi.mocked(db.games.add).mockResolvedValue(mockGameId);
      vi.mocked(db.libraryEntries.add).mockResolvedValue(mockLibraryEntryId);
      vi.mocked(db.transaction).mockImplementation(async (_mode, _tables, fn) => {
        if (typeof fn === "function") {
          return fn();
        }
        return undefined;
      });

      await seedDefaultLibrary();

      expect(db.transaction).toHaveBeenCalled();
      expect(db.games.add).toHaveBeenCalled();
      expect(db.libraryEntries.add).toHaveBeenCalled();
    });

    it("throws error when transaction fails", async () => {
      vi.mocked(db.transaction).mockRejectedValue(new Error("Transaction failed"));

      await expect(seedDefaultLibrary()).rejects.toThrow(
        "Falha ao semear a biblioteca padrão. A transação local foi revertida: Transaction failed",
      );
    });
  });

  describe("readBacklogDataSnapshot", () => {
    beforeEach(() => {
      const emptyOrderByMock = createDexieOrderByMock();
      vi.mocked(db.libraryEntries.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.playSessions.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.importJobs.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.savedViews.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
    });

    it("returns empty snapshot when no data exists", async () => {
      const emptyOrderByMock = createDexieOrderByMock();
      emptyOrderByMock.reverse().toArray.mockResolvedValue([]);

      vi.mocked(db.libraryEntries.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.settings.toArray).mockResolvedValue([]);
      vi.mocked(db.games.toArray).mockResolvedValue([]);
      vi.mocked(db.playSessions.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.reviews.toArray).mockResolvedValue([]);
      vi.mocked(db.tags.toArray).mockResolvedValue([]);
      vi.mocked(db.gameTags.toArray).mockResolvedValue([]);
      vi.mocked(db.goals.toArray).mockResolvedValue([]);
      vi.mocked(db.lists.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntryLists.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntryStores.toArray).mockResolvedValue([]);
      vi.mocked(db.stores.toArray).mockResolvedValue([]);
      vi.mocked(db.platforms.toArray).mockResolvedValue([]);
      vi.mocked(db.gamePlatforms.toArray).mockResolvedValue([]);
      vi.mocked(db.savedViews.toArray).mockResolvedValue([]);
      vi.mocked(db.importJobs.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);

      const result = await readBacklogDataSnapshot(false);

      expect(result).toEqual(emptyBacklogDataSnapshot);
    });

    it("seeds default library when seedIfEmpty is true and library is empty", async () => {
      // Configurar mocks para que seedDefaultLibrary funcione
      vi.mocked(db.transaction).mockImplementation(async (_mode, _tables, fn) => {
        if (typeof fn === "function") {
          vi.mocked(db.games.add).mockResolvedValue(1);
          vi.mocked(db.libraryEntries.add).mockResolvedValue(1);
          return fn();
        }
        return undefined;
      });

      const emptyOrderByMock = createDexieOrderByMock();
      emptyOrderByMock.reverse().toArray
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 1, gameId: 1, updatedAt: "2024-01-01T00:00:00.000Z" }]);

      vi.mocked(db.libraryEntries.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.settings.toArray).mockResolvedValue([]);
      vi.mocked(db.games.toArray).mockResolvedValue([{ id: 1, title: "Hades", updatedAt: "2024-01-01T00:00:00.000Z" }]);
      vi.mocked(db.playSessions.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.reviews.toArray).mockResolvedValue([]);
      vi.mocked(db.tags.toArray).mockResolvedValue([]);
      vi.mocked(db.gameTags.toArray).mockResolvedValue([]);
      vi.mocked(db.goals.toArray).mockResolvedValue([]);
      vi.mocked(db.lists.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntryLists.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntryStores.toArray).mockResolvedValue([]);
      vi.mocked(db.stores.toArray).mockResolvedValue([]);
      vi.mocked(db.platforms.toArray).mockResolvedValue([]);
      vi.mocked(db.gamePlatforms.toArray).mockResolvedValue([]);
      vi.mocked(db.savedViews.toArray).mockResolvedValue([]);
      vi.mocked(db.importJobs.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);

      // Verifica que a biblioteca foi semeada (libraryEntries tem dados apos o seed)
      const result = await readBacklogDataSnapshot(true);

      expect(result.libraryEntryRows.length).toBeGreaterThan(0);
    });

    it("returns data sorted by updatedAt descending for games", async () => {
      const emptyOrderByMock = createDexieOrderByMock();
      emptyOrderByMock.reverse().toArray.mockResolvedValue([]);

      vi.mocked(db.libraryEntries.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.settings.toArray).mockResolvedValue([]);
      const games = [
        { id: 1, title: "Game 1", updatedAt: "2024-01-01T00:00:00.000Z" },
        { id: 2, title: "Game 2", updatedAt: "2024-01-03T00:00:00.000Z" },
        { id: 3, title: "Game 3", updatedAt: "2024-01-02T00:00:00.000Z" },
      ];
      vi.mocked(db.games.toArray).mockResolvedValue(games);
      vi.mocked(db.playSessions.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);
      vi.mocked(db.reviews.toArray).mockResolvedValue([]);
      vi.mocked(db.tags.toArray).mockResolvedValue([]);
      vi.mocked(db.gameTags.toArray).mockResolvedValue([]);
      vi.mocked(db.goals.toArray).mockResolvedValue([]);
      vi.mocked(db.lists.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntryLists.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntryStores.toArray).mockResolvedValue([]);
      vi.mocked(db.stores.toArray).mockResolvedValue([]);
      vi.mocked(db.platforms.toArray).mockResolvedValue([]);
      vi.mocked(db.gamePlatforms.toArray).mockResolvedValue([]);
      vi.mocked(db.savedViews.toArray).mockResolvedValue([]);
      vi.mocked(db.importJobs.orderBy).mockReturnValue(emptyOrderByMock as DexieOrderByChain);

      const result = await readBacklogDataSnapshot(false);

      expect(result.gameRows[0].title).toBe("Game 2");
      expect(result.gameRows[1].title).toBe("Game 3");
      expect(result.gameRows[2].title).toBe("Game 1");
    });
  });

  describe("clearBacklogDataForFreshStart", () => {
    beforeEach(() => {
      vi.mocked(db.transaction).mockImplementation(async (_mode, _tables, fn) => {
        if (typeof fn === "function") {
          return fn();
        }
        return undefined;
      });
    });

    it("clears all tables in transaction", async () => {
      await clearBacklogDataForFreshStart();

      expect(db.transaction).toHaveBeenCalled();
      expect(db.gamePlatforms.clear).toHaveBeenCalled();
      expect(db.platforms.clear).toHaveBeenCalled();
      expect(db.libraryEntryStores.clear).toHaveBeenCalled();
      expect(db.stores.clear).toHaveBeenCalled();
      expect(db.libraryEntryLists.clear).toHaveBeenCalled();
      expect(db.gameTags.clear).toHaveBeenCalled();
      expect(db.reviews.clear).toHaveBeenCalled();
      expect(db.playSessions.clear).toHaveBeenCalled();
      expect(db.goals.clear).toHaveBeenCalled();
      expect(db.tags.clear).toHaveBeenCalled();
      expect(db.lists.clear).toHaveBeenCalled();
      expect(db.libraryEntries.clear).toHaveBeenCalled();
      expect(db.games.clear).toHaveBeenCalled();
      expect(db.settings.clear).toHaveBeenCalled();
      expect(db.savedViews.clear).toHaveBeenCalled();
      expect(db.importJobs.clear).toHaveBeenCalled();
    });

    it("sets fresh start settings after clearing", async () => {
      await clearBacklogDataForFreshStart();

      expect(db.settings.bulkPut).toHaveBeenCalledWith([
        {
          key: syncSettingsKeys.skipDefaultSeed,
          value: "true",
          updatedAt: expect.any(String),
        },
      ]);
    });
  });

  describe("readBackupTables", () => {
    beforeEach(() => {
      vi.mocked(db.games.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntries.toArray).mockResolvedValue([]);
      vi.mocked(db.stores.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntryStores.toArray).mockResolvedValue([]);
      vi.mocked(db.platforms.toArray).mockResolvedValue([]);
      vi.mocked(db.gamePlatforms.toArray).mockResolvedValue([]);
      vi.mocked(db.playSessions.toArray).mockResolvedValue([]);
      vi.mocked(db.reviews.toArray).mockResolvedValue([]);
      vi.mocked(db.lists.toArray).mockResolvedValue([]);
      vi.mocked(db.libraryEntryLists.toArray).mockResolvedValue([]);
      vi.mocked(db.tags.toArray).mockResolvedValue([]);
      vi.mocked(db.gameTags.toArray).mockResolvedValue([]);
      vi.mocked(db.goals.toArray).mockResolvedValue([]);
      vi.mocked(db.settings.toArray).mockResolvedValue([]);
      vi.mocked(db.savedViews.toArray).mockResolvedValue([]);
    });

    it("reads all tables and returns as BackupTables", async () => {
      const mockGames = [{ id: 1, title: "Hades" }];
      const mockEntries = [{ id: 1, gameId: 1 }];
      const mockStores = [{ id: 1, name: "Steam" }];

      vi.mocked(db.games.toArray).mockResolvedValue(mockGames);
      vi.mocked(db.libraryEntries.toArray).mockResolvedValue(mockEntries);
      vi.mocked(db.stores.toArray).mockResolvedValue(mockStores);

      const result = await readBackupTables();

      expect(result.games).toEqual(mockGames);
      expect(result.libraryEntries).toEqual(mockEntries);
      expect(result.stores).toEqual(mockStores);
      expect(result.platforms).toEqual([]);
      expect(result.gamePlatforms).toEqual([]);
      expect(result.playSessions).toEqual([]);
      expect(result.reviews).toEqual([]);
      expect(result.lists).toEqual([]);
      expect(result.libraryEntryLists).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.gameTags).toEqual([]);
      expect(result.goals).toEqual([]);
      expect(result.settings).toEqual([]);
      expect(result.savedViews).toEqual([]);
    });

    it("reads all tables in parallel", async () => {
      await readBackupTables();

      expect(db.games.toArray).toHaveBeenCalled();
      expect(db.libraryEntries.toArray).toHaveBeenCalled();
      expect(db.stores.toArray).toHaveBeenCalled();
      expect(db.libraryEntryStores.toArray).toHaveBeenCalled();
      expect(db.platforms.toArray).toHaveBeenCalled();
      expect(db.gamePlatforms.toArray).toHaveBeenCalled();
      expect(db.playSessions.toArray).toHaveBeenCalled();
      expect(db.reviews.toArray).toHaveBeenCalled();
      expect(db.lists.toArray).toHaveBeenCalled();
      expect(db.libraryEntryLists.toArray).toHaveBeenCalled();
      expect(db.tags.toArray).toHaveBeenCalled();
      expect(db.gameTags.toArray).toHaveBeenCalled();
      expect(db.goals.toArray).toHaveBeenCalled();
      expect(db.settings.toArray).toHaveBeenCalled();
      expect(db.savedViews.toArray).toHaveBeenCalled();
    });
  });
});
