import { describe, expect, it } from "vitest";
import type {
  Game,
  GameTag,
  LibraryEntry,
  LibraryEntryList,
  List,
  PlaySession,
  Review,
  Tag,
} from "../../../core/types";
import { buildCatalogMaintenanceReport } from "./catalogMaintenance";

function createGame(partial: Partial<Game>): Game {
  return {
    title: "Fallback",
    normalizedTitle: "fallback",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
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
    progressStatus: "playing",
    playtimeMinutes: 120,
    completionPercent: 40,
    priority: "medium",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...partial,
  };
}

describe("catalogMaintenance", () => {
  it("builds duplicate groups with merge suggestion and metadata queue", () => {
    const games: Game[] = [
      createGame({
        id: 1,
        title: "Cyberpunk 2077",
        normalizedTitle: "cyberpunk 2077",
        releaseYear: 2020,
        developer: "CD Projekt RED",
        publisher: "CD Projekt",
        genres: "",
      }),
      createGame({
        id: 2,
        title: "Cyberpunk 2077",
        normalizedTitle: "cyberpunk 2077",
        releaseYear: 2020,
        developer: "CD Projekt RED",
        publisher: "CD Projekt",
        genres: "RPG",
        coverUrl: "https://example.com/cp.jpg",
      }),
    ];

    const libraryEntries: LibraryEntry[] = [
      createEntry({ id: 11, gameId: 1, platform: "PC", sourceStore: "Steam", favorite: true }),
      createEntry({ id: 12, gameId: 2, platform: "PC", sourceStore: "GOG", completionPercent: 62, playtimeMinutes: 320 }),
    ];

    const sessions: PlaySession[] = [
      { id: 91, libraryEntryId: 11, date: "2026-03-18", platform: "PC", durationMinutes: 120, completionPercent: 40 },
      { id: 92, libraryEntryId: 12, date: "2026-03-17", platform: "PC", durationMinutes: 200, completionPercent: 62 },
    ];

    const reviews: Review[] = [{ id: 10, libraryEntryId: 11, score: 9.5, shortReview: "Excelente" }];
    const lists: List[] = [];
    const libraryEntryLists: LibraryEntryList[] = [{ id: 1, libraryEntryId: 11, listId: 2, createdAt: "2026-03-01T00:00:00.000Z" }];
    const tags: Tag[] = [];
    const gameTags: GameTag[] = [{ id: 1, libraryEntryId: 12, tagId: 7 }];

    const report = buildCatalogMaintenanceReport({
      games,
      libraryEntries,
      sessions,
      reviews,
      lists,
      libraryEntryLists,
      tags,
      gameTags,
    });

    expect(report.duplicateGroups).toHaveLength(1);
    expect(report.duplicateGroups[0]?.suggestedAction).toBe("merge");
    expect(report.duplicateGroups[0]?.suggestedPrimaryEntryId).toBe(11);
    expect(report.metadataQueue).toHaveLength(2);
    expect(report.metadataQueue.some((item) => item.missingFields.includes("gêneros"))).toBe(true);
  });
});
