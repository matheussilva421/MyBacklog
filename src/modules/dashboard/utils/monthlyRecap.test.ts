import { describe, expect, it } from "vitest";
import { buildMonthlyRecap } from "./monthlyRecap";
import type { Game } from "../../../backlog/shared";
import type { LibraryEntry, PlaySession } from "../../../core/types";

function createGame(partial: Partial<Game>): Game {
  return {
    id: 1,
    title: "Cyberpunk 2077",
    platform: "PC",
    sourceStore: "Steam",
    genre: "RPG",
    status: "Jogando",
    progress: 62,
    hours: 40,
    eta: "14h",
    priority: "Alta",
    mood: "Imersivo",
    score: 9.4,
    year: 2020,
    notes: "Mainline",
    difficulty: "Media",
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
    playtimeMinutes: 600,
    completionPercent: 40,
    priority: "high",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...partial,
  };
}

function createSession(partial: Partial<PlaySession>): PlaySession {
  return {
    libraryEntryId: 1,
    date: "2026-03-10",
    platform: "PC",
    durationMinutes: 120,
    ...partial,
  };
}

describe("buildMonthlyRecap", () => {
  it("summarizes current month hours, completions and top game", () => {
    const recap = buildMonthlyRecap(
      [createGame({ id: 1, title: "Cyberpunk 2077" }), createGame({ id: 2, title: "Balatro" })],
      [
        createEntry({
          id: 1,
          progressStatus: "finished",
          updatedAt: "2026-03-09T00:00:00.000Z",
          createdAt: "2026-03-02T00:00:00.000Z",
        }),
      ],
      [
        createSession({ libraryEntryId: 1, durationMinutes: 180, date: "2026-03-04" }),
        createSession({ libraryEntryId: 1, durationMinutes: 240, date: "2026-03-11" }),
        createSession({ libraryEntryId: 2, durationMinutes: 60, date: "2026-03-12" }),
      ],
      new Date("2026-03-31T12:00:00.000Z"),
    );

    expect(recap.isMonthEnd).toBe(true);
    expect(recap.totalHours).toBe(8);
    expect(recap.completedGames).toBe(1);
    expect(recap.topGameTitle).toBe("Cyberpunk 2077");
    expect(recap.totalSessions).toBe(3);
  });
});
