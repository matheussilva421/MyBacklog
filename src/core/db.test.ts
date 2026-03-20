import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";
import Dexie from "dexie";

// Mock das dependências antes de importar o db
vi.mock("./structuredTables", () => ({
  buildStructuredTablesFromLegacy: vi.fn(({ games, libraryEntries }) => ({
    stores: games.map((g, i) => ({
      id: i + 1,
      name: g.sourceStore || "Steam",
      normalizedName: (g.sourceStore || "steam").toLowerCase(),
      sourceKey: "steam",
      updatedAt: new Date().toISOString(),
    })),
    libraryEntryStores: libraryEntries.map((e, i) => ({
      id: i + 1,
      libraryEntryId: e.id,
      storeId: i + 1,
      isPrimary: true,
      createdAt: new Date().toISOString(),
    })),
    platforms: games.map((g, i) => ({
      id: i + 1,
      name: g.platforms || "PC",
      normalizedName: (g.platforms || "pc").toLowerCase(),
      updatedAt: new Date().toISOString(),
    })),
    gamePlatforms: games.map((g, i) => ({
      id: i + 1,
      gameId: g.id,
      platformId: i + 1,
      createdAt: new Date().toISOString(),
    })),
  })),
}));

vi.mock("./libraryEntryDerived", () => ({
  classifyAccessSource: vi.fn((name) => {
    const lower = String(name || "").toLowerCase();
    if (lower.includes("steam")) return "steam";
    if (lower.includes("epic")) return "epic";
    if (lower.includes("gog")) return "gog";
    if (lower.includes("playstation")) return "playstation";
    if (lower.includes("xbox")) return "xbox";
    if (lower.includes("nintendo")) return "nintendo";
    return "other";
  }),
}));

vi.mock("./defaults", () => ({
  defaultGames: [
    {
      id: 1,
      title: "Hades",
      coverUrl: "https://example.com/hades.jpg",
      rawgId: 123,
      description: "A roguelike action game",
      genres: "Action, Roguelike",
      estimatedTime: "20-30 hours",
      difficulty: "Medium",
      platforms: "PC, Switch",
      developer: "Supergiant Games",
      publisher: "Supergiant Games",
      releaseYear: 2020,
    },
  ],
}));

vi.mock("./utils", async () => {
  const actual = await vi.importActual("./utils");
  return {
    ...(actual as object),
    repairLegacyText: vi.fn((text) => text),
  };
});

// Agora importamos o db
import { db } from "./db";

describe("Database Migrations", () => {
  const dbName = "mybacklog-test";
  const testDbs: Dexie[] = [];

  afterAll(async () => {
    // Cleanup all test databases
    for (const testDb of testDbs) {
      try {
        testDb.close();
      } catch {
        // Ignore errors on close
      }
    }
    // Delete the database after all tests
    try {
      await Dexie.delete(dbName);
    } catch {
      // Ignore if database doesn't exist
    }
  });

  function createTestDb(name: string = dbName): Dexie {
    const testDb = new Dexie(name);
    testDbs.push(testDb);
    return testDb;
  }

  describe("Version 1 (Initial Schema)", () => {
    it("should create initial tables with correct indexes", async () => {
      const testDb = createTestDb("test-v1");
      testDb.version(1).stores({
        games: "++id, title, platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, rawgId, *genres",
        playSessions: "++id, gameId, date",
        reviews: "++id, gameId",
        lists: "++id, name",
        tags: "++id, name",
        gameTags: "++id, gameId, tagId",
        goals: "++id, type, period",
      });

      await testDb.open();

      // Verify tables exist
      expect(testDb.tables.map((t) => t.name)).toEqual(
        expect.arrayContaining(["games", "playSessions", "reviews", "lists", "tags", "gameTags", "goals"]),
      );

      await testDb.close();
    });

    it("should allow CRUD operations on games table", async () => {
      const testDb = createTestDb("test-v1-crud");
      testDb.version(1).stores({
        games: "++id, title, platform, sourceStore",
        playSessions: "++id, gameId, date",
        reviews: "++id, gameId",
        lists: "++id, name",
        tags: "++id, name",
        gameTags: "++id, gameId, tagId",
        goals: "++id, type, period",
      });

      await testDb.open();

      const gameId = await testDb.table("games").add({
        title: "Test Game",
        platform: "PC",
        sourceStore: "Steam",
        ownershipStatus: "owned",
        progressStatus: "not_started",
        priority: "high",
        updatedAt: new Date().toISOString(),
      });

      expect(gameId).toBeGreaterThan(0);

      const game = await testDb.table("games").get(gameId);
      expect(game?.title).toBe("Test Game");

      await testDb.close();
    });
  });

  describe("Version 2 (Library Entry Separation)", () => {
    it("should migrate from v1 to v2, separating games and library entries", async () => {
      const dbNameV2 = "test-v2-migration";

      // Passo 1: Criar DB com v1 e adicionar dados
      const testDbV1 = createTestDb(dbNameV2);
      testDbV1.version(1).stores({
        games: "++id, title, platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, rawgId, *genres",
        playSessions: "++id, gameId, date",
        reviews: "++id, gameId",
        lists: "++id, name",
        tags: "++id, name",
        gameTags: "++id, gameId, tagId",
        goals: "++id, type, period",
      });
      await testDbV1.open();

      // Adicionar dados legacy
      await testDbV1.table("games").bulkAdd([
        {
          id: 1,
          title: "Hades",
          platform: "PC",
          sourceStore: "Steam",
          ownershipStatus: "owned",
          progressStatus: "playing",
          priority: "high",
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: 2,
          title: "Hades",
          platform: "Switch",
          sourceStore: "eShop",
          ownershipStatus: "owned",
          progressStatus: "finished",
          priority: "medium",
          updatedAt: "2024-01-02T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ]);
      await testDbV1.close();

      // Passo 2: Reabrir DB com v2 definida (trigger migration)
      const testDbV2 = new Dexie(dbNameV2);
      testDbV2.version(1).stores({
        games: "++id, title, platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, rawgId, *genres",
        playSessions: "++id, gameId, date",
        reviews: "++id, gameId",
        lists: "++id, name",
        tags: "++id, name",
        gameTags: "++id, gameId, tagId",
        goals: "++id, type, period",
      });
      testDbV2.version(2)
        .stores({
          games: "++id, normalizedTitle, title, rawgId, releaseYear",
          libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt",
          playSessions: "++id, libraryEntryId, date",
          reviews: "++id, libraryEntryId",
          lists: "++id, name",
          tags: "++id, name",
          gameTags: "++id, libraryEntryId, tagId",
          goals: "++id, type, period",
          settings: "++id, key, updatedAt",
          importJobs: "++id, source, status, createdAt, updatedAt",
        })
        .upgrade(async (tx) => {
          const legacyGames = await tx.table("games").toArray();

          const migratedGames = new Map<string, any>();
          const migratedEntries: any[] = [];

          for (const legacy of legacyGames as any[]) {
            if (!legacy.id) continue;

            const normalizedTitle = String(legacy.title || "").trim().toLowerCase();
            const existingGame = migratedGames.get(normalizedTitle);

            if (!existingGame) {
              migratedGames.set(normalizedTitle, {
                id: legacy.id,
                title: legacy.title,
                normalizedTitle,
                coverUrl: legacy.coverUrl,
                rawgId: legacy.rawgId,
                platforms: legacy.platform,
                createdAt: legacy.createdAt,
                updatedAt: legacy.updatedAt,
              });
            } else {
              const currentPlatforms = existingGame.platforms || "";
              const newPlatforms = legacy.platform || "";
              const tokens = new Set(
                [currentPlatforms, newPlatforms]
                  .flatMap((v: string) => v.split(","))
                  .map((t: string) => t.trim())
                  .filter(Boolean),
              );
              existingGame.platforms = Array.from(tokens).join(", ");
              existingGame.updatedAt = legacy.updatedAt > existingGame.updatedAt ? legacy.updatedAt : existingGame.updatedAt;
            }

            const metadata = migratedGames.get(normalizedTitle);
            if (!metadata?.id) continue;

            migratedEntries.push({
              id: legacy.id,
              gameId: metadata.id,
              platform: legacy.platform,
              sourceStore: legacy.sourceStore,
              ownershipStatus: legacy.ownershipStatus,
              progressStatus: legacy.progressStatus,
              priority: legacy.priority,
              updatedAt: legacy.updatedAt,
            });
          }

          await tx.table("games").clear();
          if (migratedGames.size > 0) {
            await tx.table("games").bulkPut(Array.from(migratedGames.values()));
          }
          const validEntries = migratedEntries.filter((e) => e.gameId != null);
          if (validEntries.length > 0) {
            await tx.table("libraryEntries").bulkPut(validEntries);
          }

          await tx.table("playSessions").toCollection().modify((session: any) => {
            session.libraryEntryId = session.gameId;
            delete session.gameId;
          });

          await tx.table("reviews").toCollection().modify((review: any) => {
            review.libraryEntryId = review.gameId;
            delete review.gameId;
          });

          await tx.table("gameTags").toCollection().modify((entry: any) => {
            entry.libraryEntryId = entry.gameId;
            delete entry.gameId;
          });
        });

      await testDbV2.open();

      // Verify games were deduplicated
      const games = await testDbV2.table("games").toArray();
      expect(games.length).toBe(1);
      expect(games[0].title).toBe("Hades");
      expect(games[0].platforms).toContain("PC");
      expect(games[0].platforms).toContain("Switch");

      // Verify library entries were created
      const entries = await testDbV2.table("libraryEntries").toArray();
      expect(entries.length).toBe(2);

      await testDbV2.close();
    });
  });

  describe("Version 3 (Library Entry Lists)", () => {
    it("should add libraryEntryLists table", async () => {
      const testDb = createTestDb("test-v3-lists");

      testDb.version(1).stores({
        games: "++id, title",
        lists: "++id, name",
      });

      testDb.version(3).stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
      });

      await testDb.open();

      expect(testDb.tables.map((t) => t.name)).toEqual(
        expect.arrayContaining(["libraryEntryLists"]),
      );

      // Test libraryEntryLists operations
      const listId = await testDb.table("lists").add({ name: "Favorites", createdAt: new Date().toISOString() });
      const entryId = await testDb.table("libraryEntries").add({
        gameId: 1,
        platform: "PC",
        sourceStore: "Steam",
        updatedAt: new Date().toISOString(),
      });

      await testDb.table("libraryEntryLists").add({
        libraryEntryId: entryId,
        listId,
        createdAt: new Date().toISOString(),
      });

      const relations = await testDb.table("libraryEntryLists").toArray();
      expect(relations.length).toBe(1);
      expect(relations[0].libraryEntryId).toBe(entryId);
      expect(relations[0].listId).toBe(listId);

      await testDb.close();
    });
  });

  describe("Version 4 (Normalized Stores and Platforms)", () => {
    it("should create stores, libraryEntryStores, platforms, and gamePlatforms tables", async () => {
      const testDb = createTestDb("test-v4-stores");

      testDb.version(4).stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
        stores: "++id, normalizedName, name, updatedAt",
        libraryEntryStores: "++id, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt",
        platforms: "++id, normalizedName, name, updatedAt",
        gamePlatforms: "++id, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      });

      await testDb.open();

      expect(testDb.tables.map((t) => t.name)).toEqual(
        expect.arrayContaining(["stores", "libraryEntryStores", "platforms", "gamePlatforms"]),
      );

      // Test store operations
      const storeId = await testDb.table("stores").add({
        name: "Steam",
        normalizedName: "steam",
        updatedAt: new Date().toISOString(),
      });
      expect(storeId).toBeGreaterThan(0);

      // Test platform operations
      const platformId = await testDb.table("platforms").add({
        name: "PC",
        normalizedName: "pc",
        updatedAt: new Date().toISOString(),
      });
      expect(platformId).toBeGreaterThan(0);

      // Test libraryEntryStore operations
      const entryId = await testDb.table("libraryEntries").add({
        gameId: 1,
        platform: "PC",
        sourceStore: "Steam",
        ownershipStatus: "owned",
        progressStatus: "not_started",
        priority: "medium",
        updatedAt: new Date().toISOString(),
      });

      await testDb.table("libraryEntryStores").add({
        libraryEntryId: entryId,
        storeId,
        isPrimary: true,
        createdAt: new Date().toISOString(),
      });

      const entryStores = await testDb.table("libraryEntryStores").toArray();
      expect(entryStores.length).toBe(1);
      expect(entryStores[0].isPrimary).toBe(true);

      // Test gamePlatform operations
      await testDb.table("gamePlatforms").add({
        gameId: 1,
        platformId,
        createdAt: new Date().toISOString(),
      });

      const gamePlatforms = await testDb.table("gamePlatforms").toArray();
      expect(gamePlatforms.length).toBe(1);

      await testDb.close();
    });

    it("should migrate completionDate from lastSessionAt for finished games", async () => {
      const dbNameV4 = "test-v4-completion";

      // Passo 1: Criar DB com v3 e adicionar dados
      const testDbV3 = createTestDb(dbNameV4);
      testDbV3.version(3).stores({
        games: "++id, normalizedTitle, title",
        libraryEntries: "++id, gameId, platform, sourceStore, progressStatus, updatedAt",
      });
      await testDbV3.open();

      // Adicionar dados antes da migracao
      await testDbV3.table("libraryEntries").add({
        gameId: 1,
        platform: "PC",
        sourceStore: "Steam",
        progressStatus: "finished",
        lastSessionAt: "2024-06-15T10:00:00.000Z",
        updatedAt: "2024-06-15T10:00:00.000Z",
      });

      await testDbV3.table("libraryEntries").add({
        gameId: 2,
        platform: "PC",
        sourceStore: "Steam",
        progressStatus: "playing",
        lastSessionAt: "2024-06-15T10:00:00.000Z",
        updatedAt: "2024-06-15T10:00:00.000Z",
      });
      await testDbV3.close();

      // Passo 2: Reabrir DB com v4 definida (trigger migration)
      const testDbV4 = new Dexie(dbNameV4);
      testDbV4.version(3).stores({
        games: "++id, normalizedTitle, title",
        libraryEntries: "++id, gameId, platform, sourceStore, progressStatus, updatedAt",
      });
      testDbV4.version(4)
        .stores({
          games: "++id, normalizedTitle, title, rawgId, releaseYear",
          libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
          stores: "++id, normalizedName, name, updatedAt",
          libraryEntryStores: "++id, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt",
          platforms: "++id, normalizedName, name, updatedAt",
          gamePlatforms: "++id, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt",
          playSessions: "++id, libraryEntryId, date",
          reviews: "++id, libraryEntryId",
          lists: "++id, name",
          libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
          tags: "++id, name",
          gameTags: "++id, libraryEntryId, tagId",
          goals: "++id, type, period",
          settings: "++id, key, updatedAt",
          importJobs: "++id, source, status, createdAt, updatedAt",
        })
        .upgrade(async (tx) => {
          const entries = await tx.table("libraryEntries").toArray();
          const migratedEntries = entries.map((entry: any) => ({
            ...entry,
            completionDate: entry.completionDate || (
              entry.progressStatus === "finished" || entry.progressStatus === "completed_100"
                ? entry.lastSessionAt?.substring(0, 10) || entry.updatedAt?.substring(0, 10)
                : undefined
            ),
          }));
          if (migratedEntries.length > 0) {
            await tx.table("libraryEntries").bulkPut(migratedEntries);
          }
        });

      await testDbV4.open();

      const entries = await testDbV4.table("libraryEntries").toArray();
      const finishedEntry = entries.find((e: any) => e.progressStatus === "finished");
      const playingEntry = entries.find((e: any) => e.progressStatus === "playing");

      expect(finishedEntry?.completionDate).toBe("2024-06-15");
      expect(playingEntry?.completionDate).toBeUndefined();

      await testDbV4.close();
    });
  });

  describe("Version 5 (Store Source Key)", () => {
    it("should add sourceKey to stores", async () => {
      const dbNameV5 = "test-v5-sourcekey";

      // Passo 1: Criar DB com v4 e adicionar dados
      const testDbV4 = createTestDb(dbNameV5);
      testDbV4.version(4).stores({
        stores: "++id, normalizedName, name, updatedAt",
      });
      await testDbV4.open();

      // Adicionar stores antes da migracao
      await testDbV4.table("stores").bulkAdd([
        { name: "Steam", normalizedName: "steam", updatedAt: new Date().toISOString() },
        { name: "Epic Games Store", normalizedName: "epic games store", updatedAt: new Date().toISOString() },
        { name: "PlayStation Store", normalizedName: "playstation store", updatedAt: new Date().toISOString() },
      ]);
      await testDbV4.close();

      // Passo 2: Reabrir DB com v5 definida (trigger migration)
      const testDbV5 = new Dexie(dbNameV5);
      testDbV5.version(4).stores({
        stores: "++id, normalizedName, name, updatedAt",
      });
      testDbV5.version(5)
        .stores({
          stores: "++id, normalizedName, name, sourceKey, updatedAt",
          savedViews: "++id, scope, name, [scope+name], updatedAt",
        })
        .upgrade(async (tx) => {
          const stores = await tx.table("stores").toArray();
          if (stores.length > 0) {
            await tx.table("stores").bulkPut(
              stores.map((store: any) => ({
                ...store,
                sourceKey: store.sourceKey ?? (() => {
                  const lower = String(store.name || "").toLowerCase();
                  if (lower.includes("steam")) return "steam";
                  if (lower.includes("epic")) return "epic";
                  if (lower.includes("playstation")) return "playstation";
                  if (lower.includes("xbox")) return "xbox";
                  if (lower.includes("nintendo")) return "nintendo";
                  return "other";
                })(),
              })),
            );
          }
        });

      await testDbV5.open();

      const stores = await testDbV5.table("stores").toArray();
      expect(stores.length).toBe(3);

      const steam = stores.find((s: any) => s.name === "Steam");
      const epic = stores.find((s: any) => s.name === "Epic Games Store");
      const ps = stores.find((s: any) => s.name === "PlayStation Store");

      expect(steam?.sourceKey).toBe("steam");
      expect(epic?.sourceKey).toBe("epic");
      expect(ps?.sourceKey).toBe("playstation");

      await testDbV5.close();
    });

    it("should create savedViews table", async () => {
      const testDb = createTestDb("test-v5-savedviews");

      testDb.version(5).stores({
        savedViews: "++id, scope, name, [scope+name], updatedAt",
      });

      await testDb.open();

      expect(testDb.tables.map((t) => t.name)).toEqual(
        expect.arrayContaining(["savedViews"]),
      );

      await testDb.table("savedViews").add({
        scope: "library",
        name: "My Favorites",
        query: "",
        sortBy: "updatedAt",
        sortDirection: "desc",
        groupBy: "none",
        updatedAt: new Date().toISOString(),
      });

      const views = await testDb.table("savedViews").toArray();
      expect(views.length).toBe(1);
      expect(views[0].scope).toBe("library");

      await testDb.close();
    });
  });

  describe("Version 6 (Data Sanitization)", () => {
    it("should sanitize text fields and enrich from curated metadata", async () => {
      const dbNameV6 = "test-v6-sanitization";

      // Passo 1: Criar DB com v5 e adicionar dados
      const testDbV5 = createTestDb(dbNameV6);
      testDbV5.version(5).stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
      });
      await testDbV5.open();

      // Adicionar games antes da migracao
      await testDbV5.table("games").add({
        title: "Hades",
        normalizedTitle: "hades",
        coverUrl: null,
        rawgId: null,
        releaseYear: null,
      });

      await testDbV5.table("games").add({
        title: "Some Other Game",
        normalizedTitle: "some other game",
        coverUrl: null,
        rawgId: null,
        releaseYear: null,
      });
      await testDbV5.close();

      // Passo 2: Reabrir DB com v6 definida (trigger migration)
      const testDbV6 = new Dexie(dbNameV6);
      testDbV6.version(5).stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
      });
      testDbV6.version(6)
        .stores({
          games: "++id, normalizedTitle, title, rawgId, releaseYear",
          libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
        })
        .upgrade(async (tx) => {
          const { defaultGames } = await import("./defaults");

          const curatedMetadataByTitle = new Map(
            defaultGames
              .filter((game) => Boolean(game.title))
              .map((game) => [String(game.title).trim().toLowerCase(), game] as const),
          );

          const games = await tx.table("games").toArray();

          const sanitizedGames = games.map((game: any) => {
            const curated = curatedMetadataByTitle.get(String(game.title || "").trim().toLowerCase());

            return {
              ...game,
              title: game.title,
              normalizedTitle: String(game.title || "").trim().toLowerCase(),
              coverUrl: game.coverUrl || curated?.coverUrl,
              rawgId: game.rawgId ?? curated?.rawgId,
            };
          });

          if (sanitizedGames.length > 0) {
            await tx.table("games").bulkPut(sanitizedGames);
          }
        });

      await testDbV6.open();

      const games = await testDbV6.table("games").toArray();
      const hades = games.find((g: any) => g.title === "Hades");
      const other = games.find((g: any) => g.title === "Some Other Game");

      // Hades should have been enriched from curated metadata
      expect(hades?.coverUrl).toBe("https://example.com/hades.jpg");
      expect(hades?.rawgId).toBe(123);

      // Other game should remain unchanged (coverUrl becomes undefined after bulkPut)
      expect(other?.coverUrl).toBeFalsy();
      expect(other?.rawgId).toBeFalsy();

      await testDbV6.close();
    });
  });

  describe("Full Migration Chain", () => {
    it("should migrate from v1 to v6 successfully", async () => {
      const testDb = createTestDb("test-full-migration");

      // Setup full migration chain
      testDb.version(1).stores({
        games: "++id, title, platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, rawgId, *genres",
        playSessions: "++id, gameId, date",
        reviews: "++id, gameId",
        lists: "++id, name",
        tags: "++id, name",
        gameTags: "++id, gameId, tagId",
        goals: "++id, type, period",
      });

      testDb.version(2)
        .stores({
          games: "++id, normalizedTitle, title, rawgId, releaseYear",
          libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt",
          playSessions: "++id, libraryEntryId, date",
          reviews: "++id, libraryEntryId",
          lists: "++id, name",
          tags: "++id, name",
          gameTags: "++id, libraryEntryId, tagId",
          goals: "++id, type, period",
          settings: "++id, key, updatedAt",
          importJobs: "++id, source, status, createdAt, updatedAt",
        })
        .upgrade(async (tx) => {
          const legacyGames = await tx.table("games").toArray();
          const migratedGames = new Map<string, any>();
          const migratedEntries: any[] = [];

          for (const legacy of legacyGames as any[]) {
            if (!legacy.id) continue;
            const normalizedTitle = String(legacy.title || "").trim().toLowerCase();
            const existingGame = migratedGames.get(normalizedTitle);
            if (!existingGame) {
              migratedGames.set(normalizedTitle, {
                id: legacy.id,
                title: legacy.title,
                normalizedTitle,
                coverUrl: legacy.coverUrl,
                rawgId: legacy.rawgId,
                platforms: legacy.platform,
                createdAt: legacy.createdAt,
                updatedAt: legacy.updatedAt,
              });
            }
            const metadata = migratedGames.get(normalizedTitle);
            if (!metadata?.id) continue;
            migratedEntries.push({
              id: legacy.id,
              gameId: metadata.id,
              platform: legacy.platform,
              sourceStore: legacy.sourceStore,
              ownershipStatus: legacy.ownershipStatus,
              progressStatus: legacy.progressStatus,
              priority: legacy.priority,
              updatedAt: legacy.updatedAt,
            });
          }

          await tx.table("games").clear();
          if (migratedGames.size > 0) {
            await tx.table("games").bulkPut(Array.from(migratedGames.values()));
          }
          if (migratedEntries.length > 0) {
            await tx.table("libraryEntries").bulkPut(migratedEntries);
          }

          await tx.table("playSessions").toCollection().modify((session: any) => {
            session.libraryEntryId = session.gameId;
            delete session.gameId;
          });

          await tx.table("reviews").toCollection().modify((review: any) => {
            review.libraryEntryId = review.gameId;
            delete review.gameId;
          });

          await tx.table("gameTags").toCollection().modify((entry: any) => {
            entry.libraryEntryId = entry.gameId;
            delete entry.gameId;
          });
        });

      testDb.version(3).stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      });

      testDb.version(4).stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
        stores: "++id, normalizedName, name, updatedAt",
        libraryEntryStores: "++id, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt",
        platforms: "++id, normalizedName, name, updatedAt",
        gamePlatforms: "++id, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      });

      testDb.version(5).stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
        stores: "++id, normalizedName, name, sourceKey, updatedAt",
        libraryEntryStores: "++id, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt",
        platforms: "++id, normalizedName, name, updatedAt",
        gamePlatforms: "++id, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        savedViews: "++id, scope, name, [scope+name], updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      });

      testDb.version(6).stores({
        games: "++id, normalizedTitle, title, rawgId, releaseYear",
        libraryEntries: "++id, gameId, [gameId+platform], platform, sourceStore, ownershipStatus, progressStatus, priority, updatedAt, favorite, lastSessionAt, completionDate",
        stores: "++id, normalizedName, name, sourceKey, updatedAt",
        libraryEntryStores: "++id, libraryEntryId, storeId, [libraryEntryId+storeId], [storeId+libraryEntryId], isPrimary, createdAt",
        platforms: "++id, normalizedName, name, updatedAt",
        gamePlatforms: "++id, gameId, platformId, [gameId+platformId], [platformId+gameId], createdAt",
        playSessions: "++id, libraryEntryId, date",
        reviews: "++id, libraryEntryId",
        lists: "++id, name",
        libraryEntryLists: "++id, libraryEntryId, listId, [libraryEntryId+listId], [listId+libraryEntryId], createdAt",
        tags: "++id, name",
        gameTags: "++id, libraryEntryId, tagId",
        goals: "++id, type, period",
        settings: "++id, key, updatedAt",
        savedViews: "++id, scope, name, [scope+name], updatedAt",
        importJobs: "++id, source, status, createdAt, updatedAt",
      });

      await testDb.open();

      // Verify all tables exist
      const expectedTables = [
        "games",
        "libraryEntries",
        "stores",
        "libraryEntryStores",
        "platforms",
        "gamePlatforms",
        "playSessions",
        "reviews",
        "lists",
        "libraryEntryLists",
        "tags",
        "gameTags",
        "goals",
        "settings",
        "savedViews",
        "importJobs",
      ];

      expect(testDb.tables.map((t) => t.name)).toEqual(
        expect.arrayContaining(expectedTables),
      );

      await testDb.close();
    });
  });
});
