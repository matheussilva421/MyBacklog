import { describe, expect, it } from "vitest";
import { buildCatalogAuditReport } from "./catalogAudit";
import type { Game, LibraryEntry, PlaySession } from "../../../core/types";

function createGame(partial: Partial<Game> = {}): Game {
  return {
    id: 1,
    title: "Cyberpunk 2077",
    normalizedTitle: "cyberpunk 2077",
    genres: "RPG",
    estimatedTime: "14h",
    platforms: "PC",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...partial,
  };
}

function createEntry(partial: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: 1,
    gameId: 1,
    platform: "PC",
    sourceStore: "Steam",
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "finished",
    playtimeMinutes: 240,
    completionPercent: 100,
    priority: "high",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-18T00:00:00.000Z",
    ...partial,
  };
}

function createSession(partial: Partial<PlaySession> = {}): PlaySession {
  return {
    id: 10,
    libraryEntryId: 1,
    date: "2026-03-18",
    platform: "PC",
    durationMinutes: 90,
    completionPercent: 62,
    ...partial,
  };
}

describe("buildCatalogAuditReport", () => {
  it("detects repairable status, completion and playtime mismatches", () => {
    const report = buildCatalogAuditReport({
      games: [createGame()],
      libraryEntries: [createEntry()],
      sessions: [createSession(), createSession({ id: 11, date: "2026-03-12", durationMinutes: 45 })],
    });

    expect(report.summary.repairableIssues).toBe(3);
    expect(report.repairPlan.entryUpdates).toHaveLength(1);
    expect(report.repairPlan.entryUpdates[0]?.updates.progressStatus).toBe("playing");
    expect(report.repairPlan.entryUpdates[0]?.updates.completionPercent).toBe(62);
    expect(report.repairPlan.entryUpdates[0]?.updates.playtimeMinutes).toBe(135);
  });

  it("detects orphan sessions and missing metadata gaps", () => {
    const report = buildCatalogAuditReport({
      games: [createGame({ coverUrl: undefined, developer: undefined, publisher: undefined, releaseYear: undefined })],
      libraryEntries: [createEntry({ id: 1 })],
      sessions: [createSession({ id: 99, libraryEntryId: 999 })],
    });

    expect(report.summary.orphanSessions).toBe(1);
    expect(report.summary.metadataIssues).toBe(1);
    expect(report.repairPlan.orphanSessionIds).toEqual([99]);
  });

  it("does not flag platform metadata as missing when structured platform relations exist", () => {
    const report = buildCatalogAuditReport({
      games: [
        createGame({
          platforms: "",
          coverUrl: "https://example.com/hades.jpg",
          developer: "Supergiant Games",
          publisher: "Supergiant Games",
          releaseYear: 2020,
        }),
      ],
      libraryEntries: [createEntry({ id: 1, platform: "PC" })],
      sessions: [],
      platformRows: [
        {
          id: 1,
          name: "PC",
          normalizedName: "pc",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      gamePlatformRows: [{ id: 1, gameId: 1, platformId: 1, createdAt: "2026-03-01T00:00:00.000Z" }],
    });

    expect(report.summary.metadataIssues).toBe(0);
  });
});
