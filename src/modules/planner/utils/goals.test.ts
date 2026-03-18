import { describe, expect, it } from "vitest";
import { buildPlannerReason, computePlannerScore } from "./scoring";
import { createPlannerGoalSignals, resolveGoalRows } from "./goals";
import type { Game } from "../../../backlog/shared";
import type { Goal, LibraryEntry, PlaySession } from "../../../core/types";

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
    mood: "Noites com energia",
    score: 0,
    year: 2020,
    notes: "Mainline run",
    difficulty: "Média",
    ...partial,
  };
}

describe("planner goals", () => {
  it("resolves current goal progress from entries and sessions", () => {
    const goals: Goal[] = [
      { id: 1, type: "finished", target: 2, current: 0, period: "monthly" },
      { id: 2, type: "playtime", target: 10, current: 0, period: "monthly" },
      { id: 3, type: "backlog_reduction", target: 3, current: 0, period: "monthly" },
    ];
    const entries = [
      createEntry({ id: 1, progressStatus: "finished", lastSessionAt: "2026-03-05", updatedAt: "2026-03-05T00:00:00.000Z" }),
      createEntry({ id: 2, progressStatus: "playing", completionPercent: 15, lastSessionAt: "2026-03-08", updatedAt: "2026-03-08T00:00:00.000Z" }),
      createEntry({ id: 3, progressStatus: "not_started", updatedAt: "2026-03-02T00:00:00.000Z" }),
    ];
    const sessions = [createSession({ libraryEntryId: 2, durationMinutes: 240 }), createSession({ libraryEntryId: 1, durationMinutes: 180 })];

    const resolved = resolveGoalRows(goals, entries, sessions, new Date("2026-03-18T12:00:00.000Z"));

    expect(resolved.map((goal) => goal.current)).toEqual([1, 7, 2]);
    expect(resolved[0]?.progressPercent).toBe(50);
    expect(resolved[1]?.currentLabel).toBe("7.0h / 10h");
  });

  it("uses preferences and goal pressure to lift relevant games", () => {
    const resolvedGoals = resolveGoalRows(
      [{ id: 1, type: "finished", target: 3, current: 0, period: "monthly" }],
      [createEntry({ id: 1, progressStatus: "playing", completionPercent: 55, lastSessionAt: "2026-03-12" })],
      [createSession({ libraryEntryId: 1, durationMinutes: 120 })],
      new Date("2026-03-18T12:00:00.000Z"),
    );
    const signals = createPlannerGoalSignals(resolvedGoals);

    const preferredGame = createGame();
    const nonPreferredGame = createGame({
      id: 2,
      platform: "PS5",
      sourceStore: "PS Store",
      status: "Backlog",
      progress: 0,
      priority: "Baixa",
      mood: "Calmo",
    });

    const preferredScore = computePlannerScore(preferredGame, signals, {
      plannerPreference: "finish_active",
      primaryPlatforms: ["PC"],
      defaultStores: ["Steam"],
    });
    const nonPreferredScore = computePlannerScore(nonPreferredGame, signals, {
      plannerPreference: "finish_active",
      primaryPlatforms: ["PC"],
      defaultStores: ["Steam"],
    });

    expect(preferredScore).toBeGreaterThan(nonPreferredScore);
    expect(buildPlannerReason(preferredGame, signals, {
      plannerPreference: "finish_active",
      primaryPlatforms: ["PC"],
      defaultStores: ["Steam"],
    })).toContain("plataforma principal");
  });
});
