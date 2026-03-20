import { describe, expect, it } from "vitest";
import type { BackupPayload } from "../../../backlog/shared";
import type {
  Game,
  LibraryEntry,
  LibraryEntryList,
  List,
  Setting,
} from "../../../core/types";
import { applyRawgMetadataToImportPayload } from "./rawg";
import {
  buildImportPreview,
  buildRestorePreview,
  parseBackupText,
  parseImportText,
  recordToImportPayload,
} from "./importExport";

function createGame(partial: Partial<Game>): Game {
  return {
    title: "Fallback",
    normalizedTitle: "fallback",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function createEntry(partial: Partial<LibraryEntry>): LibraryEntry {
  return {
    gameId: 1,
    platform: "PC",
    sourceStore: "Steam",
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "not_started",
    playtimeMinutes: 0,
    completionPercent: 0,
    priority: "medium",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("importExport", () => {
  it("applies platform and store defaults during import parsing", () => {
    const parsed = parseImportText(
      "csv",
      ["title,progressStatus,playtimeMinutes", "A Short Hike,playing,120"].join("\n"),
      { platform: "Switch", sourceStore: "Nintendo eShop" },
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.platform).toBe("Switch");
    expect(parsed[0]?.sourceStore).toBe("Nintendo eShop");
    expect(parsed[0]?.platforms).toEqual(["Switch"]);
    expect(parsed[0]?.stores).toEqual(["Nintendo eShop"]);
    expect(parsed[0]?.progressStatus).toBe("playing");
    expect(parsed[0]?.playtimeMinutes).toBe(120);
  });

  it("marks exact matches as existing and title-only collisions as review", () => {
    const existingRecords = [
      {
        game: createGame({ id: 1, title: "Cyberpunk 2077", normalizedTitle: "cyberpunk 2077", platforms: "PC" }),
        libraryEntry: createEntry({ id: 11, gameId: 1, platform: "PC", sourceStore: "Steam" }),
      },
      {
        game: createGame({ id: 2, title: "Sea of Stars", normalizedTitle: "sea of stars", platforms: "Switch" }),
        libraryEntry: createEntry({ id: 12, gameId: 2, platform: "Switch", sourceStore: "Nintendo eShop" }),
      },
    ];

    const preview = buildImportPreview(
      [
        {
          title: "Cyberpunk 2077",
          platform: "PC",
          platforms: ["PC"],
          sourceStore: "Steam",
          stores: ["Steam"],
          format: "digital",
          ownershipStatus: "owned",
          progressStatus: "playing",
          playtimeMinutes: 300,
          completionPercent: 50,
          priority: "high",
        },
        {
          title: "Sea of Stars",
          platform: "PC",
          platforms: ["PC"],
          sourceStore: "Steam",
          stores: ["Steam"],
          format: "digital",
          ownershipStatus: "owned",
          progressStatus: "not_started",
          playtimeMinutes: 0,
          completionPercent: 0,
          priority: "medium",
        },
      ],
      existingRecords,
    );

    const exactMatch = preview.find((entry) => entry.payload.title === "Cyberpunk 2077");
    const reviewMatch = preview.find((entry) => entry.payload.title === "Sea of Stars");

    expect(exactMatch?.status).toBe("existing");
    expect(exactMatch?.action).toBe("update");
    expect(exactMatch?.selectedMatchId).toBe(11);
    expect(exactMatch?.confidenceScore).toBe(100);

    expect(reviewMatch?.status).toBe("review");
    expect(reviewMatch?.action).toBe("create");
    expect(reviewMatch?.matchCandidates).toHaveLength(1);
    expect(reviewMatch?.matchCandidates[0]?.entryId).toBe(12);
    expect(reviewMatch?.matchCandidates[0]?.score).toBeLessThan(78);
    expect(reviewMatch?.gameCandidates).toHaveLength(1);
    expect(reviewMatch?.gameCandidates[0]?.gameId).toBe(2);
    expect(reviewMatch?.reviewReasons).toContain(
      "O catálogo já possui metadado deste jogo; você pode só vincular uma nova entrada.",
    );
    expect(reviewMatch?.maintenanceSignals).toContain("Título coincide, mas a plataforma local diverge.");
  });

  it("preselects high-confidence assisted merges when title, platform overlap and store overlap agree", () => {
    const preview = buildImportPreview(
      [
        {
          title: "Hades",
          platform: "Steam Deck",
          platforms: ["Steam Deck", "PC"],
          sourceStore: "Steam",
          stores: ["Steam"],
          format: "digital",
          ownershipStatus: "owned",
          progressStatus: "playing",
          playtimeMinutes: 240,
          completionPercent: 35,
          priority: "medium",
          releaseYear: 2020,
          developer: "Supergiant Games",
        },
      ],
      [
        {
          game: createGame({
            id: 4,
            title: "Hades",
            normalizedTitle: "hades",
            releaseYear: 2020,
            developer: "Supergiant Games",
            platforms: "PC, Switch",
          }),
          libraryEntry: createEntry({ id: 41, gameId: 4, platform: "PC", sourceStore: "Steam" }),
        },
      ],
    );

    expect(preview).toHaveLength(1);
    expect(preview[0]?.status).toBe("existing");
    expect(preview[0]?.suggestedAction).toBe("update");
    expect(preview[0]?.action).toBe("update");
    expect(preview[0]?.selectedMatchId).toBe(41);
    expect(preview[0]?.confidenceScore).toBe(100);
    expect(preview[0]?.overlapPlatforms).toContain("PC");
    expect(preview[0]?.overlapStores).toContain("Steam");
  });

  it("treats structured platform overlap as exact entry match during preview", () => {
    const preview = buildImportPreview(
      [
        {
          title: "Hades",
          platform: "Steam Deck",
          platforms: ["Steam Deck", "PC"],
          sourceStore: "Steam",
          stores: ["Steam"],
          format: "digital",
          ownershipStatus: "owned",
          progressStatus: "playing",
          playtimeMinutes: 180,
          completionPercent: 25,
          priority: "medium",
        },
      ],
      [
        {
          game: createGame({
            id: 7,
            title: "Hades",
            normalizedTitle: "hades",
            platforms: "PC",
          }),
          libraryEntry: createEntry({ id: 70, gameId: 7, platform: "PC", sourceStore: "Steam" }),
          structuredPlatforms: ["PC", "Steam Deck"],
          structuredStores: ["Steam"],
        },
      ],
    );

    expect(preview[0]?.status).toBe("existing");
    expect(preview[0]?.action).toBe("update");
    expect(preview[0]?.selectedMatchId).toBe(70);
    expect(preview[0]?.confidenceScore).toBe(100);
  });

  it("counts settings, stores and list relations in restore preview", () => {
    const payload: BackupPayload = {
      version: 6,
      exportedAt: "2026-03-01T00:00:00.000Z",
      source: "mybacklog",
      games: [createGame({ id: 10, title: "Hades", normalizedTitle: "hades" })],
      libraryEntries: [createEntry({ id: 20, gameId: 10, platform: "PC" })],
      stores: [
        {
          id: 21,
          name: "Steam",
          normalizedName: "steam",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      libraryEntryStores: [
        {
          id: 22,
          libraryEntryId: 20,
          storeId: 21,
          isPrimary: true,
          createdAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      platforms: [
        {
          id: 23,
          name: "PC",
          normalizedName: "pc",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      gamePlatforms: [{ id: 24, gameId: 10, platformId: 23, createdAt: "2026-03-01T00:00:00.000Z" }],
      playSessions: [],
      reviews: [],
      lists: [{ id: 30, name: "Campanha principal", createdAt: "2026-03-01T00:00:00.000Z" }],
      libraryEntryLists: [{ id: 31, libraryEntryId: 20, listId: 30, createdAt: "2026-03-01T00:00:00.000Z" }],
      tags: [],
      gameTags: [],
      goals: [],
      settings: [{ id: 40, key: "displayName", value: "Matheus", updatedAt: "2026-03-01T00:00:00.000Z" }],
      savedViews: [],
    };

    const preview = buildRestorePreview(payload, "merge", {
      games: [createGame({ id: 1, title: "Hades", normalizedTitle: "hades" })],
      libraryEntries: [createEntry({ id: 2, gameId: 1, platform: "PC" })],
      stores: [
        {
          id: 4,
          name: "Steam",
          normalizedName: "steam",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ],
      libraryEntryStores: [
        {
          id: 6,
          libraryEntryId: 2,
          storeId: 4,
          isPrimary: true,
          createdAt: "2026-02-01T00:00:00.000Z",
        },
      ],
      platforms: [
        {
          id: 7,
          name: "PC",
          normalizedName: "pc",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ],
      gamePlatforms: [{ id: 8, gameId: 1, platformId: 7, createdAt: "2026-02-01T00:00:00.000Z" }],
      playSessions: [],
      reviews: [],
      lists: [{ id: 3, name: "Campanha principal", createdAt: "2026-02-01T00:00:00.000Z" }] as List[],
      libraryEntryLists: [] as LibraryEntryList[],
      tags: [],
      gameTags: [],
      goals: [],
      settings: [{ id: 5, key: "displayName", value: "Operador", updatedAt: "2026-02-01T00:00:00.000Z" }] as Setting[],
      savedViews: [],
    });

    const settingsRow = preview.items.find((item) => item.label === "Configurações");
    const listRelationRow = preview.items.find((item) => item.label === "Relações de lista");
    const storeRow = preview.items.find((item) => item.label === "Stores");

    expect(settingsRow).toEqual({ label: "Configurações", create: 0, update: 1, skip: 0 });
    expect(listRelationRow).toEqual({ label: "Relações de lista", create: 1, update: 0, skip: 0 });
    expect(storeRow).toEqual({ label: "Stores", create: 0, update: 1, skip: 0 });
  });

  it("counts restore entry as update when structured platform overlap identifies the same record", () => {
    const payload: BackupPayload = {
      version: 6,
      exportedAt: "2026-03-01T00:00:00.000Z",
      source: "mybacklog",
      games: [createGame({ id: 10, title: "Hades", normalizedTitle: "hades", platforms: "PC" })],
      libraryEntries: [createEntry({ id: 20, gameId: 10, platform: "Steam Deck", sourceStore: "Steam" })],
      stores: [
        {
          id: 21,
          name: "Steam",
          normalizedName: "steam",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      libraryEntryStores: [
        {
          id: 22,
          libraryEntryId: 20,
          storeId: 21,
          isPrimary: true,
          createdAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      platforms: [
        {
          id: 23,
          name: "PC",
          normalizedName: "pc",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
        {
          id: 24,
          name: "Steam Deck",
          normalizedName: "steam deck",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      gamePlatforms: [
        { id: 25, gameId: 10, platformId: 23, createdAt: "2026-03-01T00:00:00.000Z" },
        { id: 26, gameId: 10, platformId: 24, createdAt: "2026-03-01T00:00:00.000Z" },
      ],
      playSessions: [],
      reviews: [],
      lists: [],
      libraryEntryLists: [],
      tags: [],
      gameTags: [],
      goals: [],
      settings: [],
      savedViews: [],
    };

    const preview = buildRestorePreview(payload, "merge", {
      games: [createGame({ id: 1, title: "Hades", normalizedTitle: "hades", platforms: "" })],
      libraryEntries: [createEntry({ id: 2, gameId: 1, platform: "PC", sourceStore: "Steam" })],
      stores: [
        {
          id: 4,
          name: "Steam",
          normalizedName: "steam",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ],
      libraryEntryStores: [
        {
          id: 6,
          libraryEntryId: 2,
          storeId: 4,
          isPrimary: true,
          createdAt: "2026-02-01T00:00:00.000Z",
        },
      ],
      platforms: [
        {
          id: 7,
          name: "PC",
          normalizedName: "pc",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
        {
          id: 8,
          name: "Steam Deck",
          normalizedName: "steam deck",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ],
      gamePlatforms: [
        { id: 9, gameId: 1, platformId: 7, createdAt: "2026-02-01T00:00:00.000Z" },
        { id: 10, gameId: 1, platformId: 8, createdAt: "2026-02-01T00:00:00.000Z" },
      ],
      playSessions: [],
      reviews: [],
      lists: [],
      libraryEntryLists: [],
      tags: [],
      gameTags: [],
      goals: [],
      settings: [],
      savedViews: [],
    });

    const entryRow = preview.items.find((item) => item.label === "Biblioteca");

    expect(entryRow).toEqual({ label: "Biblioteca", create: 0, update: 1, skip: 0 });
  });

  it("exports structured store and platform relations when available", () => {
    const payload = recordToImportPayload(
      {
        game: createGame({ id: 10, title: "Hades", normalizedTitle: "hades", platforms: "PC" }),
        libraryEntry: createEntry({ id: 20, gameId: 10, platform: "PC", sourceStore: "Steam" }),
      },
      {
        storeRows: [
          {
            id: 1,
            name: "Steam",
            normalizedName: "steam",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
          {
            id: 2,
            name: "Epic Games Store",
            normalizedName: "epic games store",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
        ],
        libraryEntryStoreRows: [
          { id: 31, libraryEntryId: 20, storeId: 1, isPrimary: true, createdAt: "2026-03-01T00:00:00.000Z" },
          { id: 32, libraryEntryId: 20, storeId: 2, isPrimary: false, createdAt: "2026-03-01T00:00:00.000Z" },
        ],
        platformRows: [
          {
            id: 5,
            name: "PC",
            normalizedName: "pc",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
          {
            id: 6,
            name: "Steam Deck",
            normalizedName: "steam deck",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
        ],
        gamePlatformRows: [
          { id: 41, gameId: 10, platformId: 5, createdAt: "2026-03-01T00:00:00.000Z" },
          { id: 42, gameId: 10, platformId: 6, createdAt: "2026-03-01T00:00:00.000Z" },
        ],
      },
    );

    expect(payload.sourceStore).toBe("Steam");
    expect(payload.stores).toEqual(["Steam", "Epic Games Store"]);
    expect(payload.platforms).toEqual(["PC", "Steam Deck"]);
  });

  it("applies RAWG enrichment without overwriting manual metadata", () => {
    const payload = {
      title: "Hades",
      platform: "PC",
      platforms: ["PC"],
      sourceStore: "Steam",
      stores: ["Steam"],
      format: "digital" as const,
      ownershipStatus: "owned" as const,
      progressStatus: "playing" as const,
      playtimeMinutes: 120,
      completionPercent: 35,
      priority: "high" as const,
      genres: "Roguelike",
      developer: "Supergiant Games",
    };

    const enriched = applyRawgMetadataToImportPayload(payload, {
      rawgId: 123,
      coverUrl: "https://example.com/hades.jpg",
      genres: "Action, Roguelike",
      releaseYear: 2020,
      platforms: "PC, Switch",
      developer: "RAWG Dev",
      publisher: "RAWG Pub",
    });

    expect(enriched.rawgId).toBe(123);
    expect(enriched.coverUrl).toBe("https://example.com/hades.jpg");
    expect(enriched.genres).toBe("Roguelike");
    expect(enriched.developer).toBe("Supergiant Games");
    expect(enriched.publisher).toBe("RAWG Pub");
  });

  it("hydrates structured tables when reading a legacy backup", () => {
    const payload = parseBackupText(
      JSON.stringify({
        version: 4,
        exportedAt: "2026-03-01T00:00:00.000Z",
        source: "mybacklog",
        games: [createGame({ id: 1, title: "Hades", normalizedTitle: "hades", platforms: "PC, Switch" })],
        libraryEntries: [
          createEntry({
            id: 2,
            gameId: 1,
            platform: "PC",
            sourceStore: "Steam",
            completionDate: "2026-03-01",
          }),
        ],
      }),
    );

    expect(payload).not.toBeNull();
    expect(payload?.stores).toHaveLength(1);
    expect(payload?.libraryEntryStores).toHaveLength(1);
    expect(payload?.platforms).toHaveLength(2);
    expect(payload?.gamePlatforms).toHaveLength(2);
    expect(payload?.libraryEntries[0]?.completionDate).toBe("2026-03-01");
  });
});
