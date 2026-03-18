import { describe, expect, it } from "vitest";
import { buildImportPreview, buildRestorePreview, parseImportText } from "./importExport";
import { applyRawgMetadataToImportPayload } from "./rawg";
import type { BackupPayload } from "../../../backlog/shared";
import type { Game, LibraryEntry, LibraryEntryList, List, Setting } from "../../../core/types";

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
          sourceStore: "Steam",
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
          sourceStore: "Steam",
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

    expect(reviewMatch?.status).toBe("review");
    expect(reviewMatch?.action).toBe("create");
    expect(reviewMatch?.matchCandidates).toHaveLength(1);
    expect(reviewMatch?.matchCandidates[0]?.entryId).toBe(12);
  });

  it("counts settings and list relations in restore preview", () => {
    const payload: BackupPayload = {
      version: 4,
      exportedAt: "2026-03-01T00:00:00.000Z",
      source: "mybacklog",
      games: [createGame({ id: 10, title: "Hades", normalizedTitle: "hades" })],
      libraryEntries: [createEntry({ id: 20, gameId: 10, platform: "PC" })],
      playSessions: [],
      reviews: [],
      lists: [{ id: 30, name: "Campanha principal", createdAt: "2026-03-01T00:00:00.000Z" }],
      libraryEntryLists: [{ id: 31, libraryEntryId: 20, listId: 30, createdAt: "2026-03-01T00:00:00.000Z" }],
      tags: [],
      gameTags: [],
      goals: [],
      settings: [{ id: 40, key: "displayName", value: "Matheus", updatedAt: "2026-03-01T00:00:00.000Z" }],
    };

    const preview = buildRestorePreview(payload, "merge", {
      games: [createGame({ id: 1, title: "Hades", normalizedTitle: "hades" })],
      libraryEntries: [createEntry({ id: 2, gameId: 1, platform: "PC" })],
      playSessions: [],
      reviews: [],
      lists: [{ id: 3, name: "Campanha principal", createdAt: "2026-02-01T00:00:00.000Z" }] as List[],
      libraryEntryLists: [] as LibraryEntryList[],
      tags: [],
      gameTags: [],
      goals: [],
      settings: [{ id: 5, key: "displayName", value: "Operador", updatedAt: "2026-02-01T00:00:00.000Z" }] as Setting[],
    });

    const settingsRow = preview.items.find((item) => item.label === "Configurações");
    const listRelationRow = preview.items.find((item) => item.label === "Relações de lista");

    expect(settingsRow).toEqual({ label: "Configurações", create: 0, update: 1, skip: 0 });
    expect(listRelationRow).toEqual({ label: "Relações de lista", create: 1, update: 0, skip: 0 });
  });

  it("applies RAWG enrichment without overwriting manual metadata", () => {
    const payload = {
      title: "Hades",
      platform: "PC",
      sourceStore: "Steam",
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
});
