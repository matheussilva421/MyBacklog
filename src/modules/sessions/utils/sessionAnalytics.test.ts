import { describe, expect, it } from "vitest";
import type { Game } from "../../../backlog/shared";
import type { PlaySession } from "../../../core/types";
import {
  buildSessionCadence,
  buildSessionHistoryGroups,
  buildSessionMonthlyHours,
  buildSessionOverview,
  filterSessionsByPeriod,
} from "./sessionAnalytics";

function createGame(partial: Partial<Game>): Game {
  return {
    id: 1,
    title: "Cyberpunk 2077",
    platform: "PC",
    sourceStore: "Steam",
    genre: "RPG",
    status: "Jogando",
    progress: 40,
    hours: 18,
    eta: "20h",
    priority: "Alta",
    mood: "Energia",
    score: 0,
    year: 2020,
    notes: "Mainline run",
    difficulty: "Media",
    ...partial,
  };
}

function createSession(partial: Partial<PlaySession>): PlaySession {
  return {
    libraryEntryId: 1,
    date: "2026-03-18",
    platform: "PC",
    durationMinutes: 90,
    note: "Boas side quests",
    ...partial,
  };
}

describe("sessionAnalytics", () => {
  it("builds cadence from recent sessions", () => {
    const cadence = buildSessionCadence(
      [
        createSession({ date: "2026-03-18", durationMinutes: 110 }),
        createSession({ date: "2026-03-16", durationMinutes: 95 }),
        createSession({ date: "2026-03-09", durationMinutes: 70 }),
      ],
      new Date("2026-03-18T12:00:00.000Z"),
    );

    expect(cadence.sessions7d).toBe(2);
    expect(cadence.sessions30d).toBe(3);
    expect(cadence.label).toBe("Ritmo quente");
    expect(cadence.streakWeeks).toBeGreaterThanOrEqual(2);
  });

  it("groups history by game and summarizes totals", () => {
    const games = [
      createGame({ id: 1, title: "Cyberpunk 2077" }),
      createGame({ id: 2, title: "Alan Wake 2", platform: "PS5", sourceStore: "PS Store" }),
    ];
    const sessions = [
      createSession({ libraryEntryId: 1, durationMinutes: 120 }),
      createSession({ libraryEntryId: 1, date: "2026-03-12", durationMinutes: 60, note: "" }),
      createSession({ libraryEntryId: 2, date: "2026-03-10", platform: "PS5", durationMinutes: 45 }),
    ];

    const groups = buildSessionHistoryGroups(games, sessions, new Date("2026-03-18T12:00:00.000Z"));
    const overview = buildSessionOverview(groups);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.game.title).toBe("Cyberpunk 2077");
    expect(groups[0]?.noteCount).toBe(1);
    expect(overview.totalSessions).toBe(3);
    expect(overview.totalMinutes).toBe(225);
  });

  it("filters sessions by period and builds monthly hours", () => {
    const sessions = [
      createSession({ date: "2026-03-18", durationMinutes: 120 }),
      createSession({ date: "2026-02-08", durationMinutes: 180 }),
      createSession({ date: "2025-11-18", durationMinutes: 90 }),
    ];

    const filtered = filterSessionsByPeriod(sessions, "30d", new Date("2026-03-18T12:00:00.000Z"));
    const monthly = buildSessionMonthlyHours(sessions, 3, new Date("2026-03-18T12:00:00.000Z"));

    expect(filtered).toHaveLength(1);
    expect(monthly.map((entry) => entry.total)).toEqual([0, 3, 2]);
  });
});
