import { describe, expect, it } from "vitest";
import { buildPersonalBadges } from "./personalBadges";
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

describe("buildPersonalBadges", () => {
  it("unlocks marathon and eclectic badges when requirements are met", () => {
    const games = [
      createGame({ genre: "RPG" }),
      createGame({ id: 2, title: "Hades", genre: "Roguelike" }),
      createGame({ id: 3, title: "Balatro", genre: "Card Game" }),
      createGame({ id: 4, title: "Celeste", genre: "Platformer" }),
      createGame({ id: 5, title: "Alan Wake 2", genre: "Survival Horror" }),
      createGame({ id: 6, title: "Sea of Stars", genre: "JRPG" }),
      createGame({ id: 7, title: "Tetris Effect", genre: "Puzzle" }),
      createGame({ id: 8, title: "FIFA", genre: "Sports" }),
      createGame({ id: 9, title: "Forza", genre: "Racing" }),
      createGame({ id: 10, title: "Disco Elysium", genre: "Adventure" }),
      createGame({ id: 11, title: "Street Fighter 6", genre: "Fighting" }),
    ];
    const sessions = [
      createSession({ durationMinutes: 360, date: "2026-03-10" }),
      createSession({ durationMinutes: 300, date: "2026-03-12" }),
    ];

    const badges = buildPersonalBadges(games, [createEntry({ progressStatus: "playing" })], sessions);

    expect(badges.find((badge) => badge.key === "maratonista")?.unlocked).toBe(true);
    expect(badges.find((badge) => badge.key === "ecletico")?.unlocked).toBe(true);
  });

  it("tracks rolling finish progress for backlog badge", () => {
    const entries = [
      createEntry({ id: 1, progressStatus: "finished", updatedAt: "2026-03-01T00:00:00.000Z" }),
      createEntry({ id: 2, progressStatus: "finished", updatedAt: "2026-03-02T00:00:00.000Z" }),
      createEntry({ id: 3, progressStatus: "finished", updatedAt: "2026-03-03T00:00:00.000Z" }),
    ];

    const badges = buildPersonalBadges([createGame({})], entries, []);
    const backlogBadge = badges.find((badge) => badge.key === "furador-backlog");

    expect(backlogBadge?.unlocked).toBe(false);
    expect(backlogBadge?.progress).toBe(3);
  });
});
