import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry, PlaySession as DbPlaySession } from "./types";
import { normalizeGameTitle } from "./utils";

export function defaultGameToDbGame(game: Partial<DbGameMetadata>): DbGameMetadata {
  return {
    title: game.title ?? "",
    normalizedTitle: normalizeGameTitle(game.title ?? ""),
    platforms: game.platforms,
    genres: game.genres,
    estimatedTime: game.estimatedTime,
    difficulty: game.difficulty,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as DbGameMetadata;
}

export function defaultGameToDbLibraryEntry(game: Partial<DbGameMetadata>): DbLibraryEntry {
  return {
    gameId: 0,
    platform: game.platforms?.split(",")[0]?.trim() || "PC",
    sourceStore: "Manual",
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "not_started",
    playtimeMinutes: 0,
    completionPercent: 0,
    priority: "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as DbLibraryEntry;
}

export const defaultGames: Partial<DbGameMetadata>[] = [
  { title: "Cyberpunk 2077", genres: "RPG, Action", platforms: "PC, PS5", estimatedTime: "60h", difficulty: "Média" },
  { title: "Hades", genres: "Roguelike, Action", platforms: "PC, Switch", estimatedTime: "25h", difficulty: "Alta" },
  { title: "Final Fantasy VII Rebirth", genres: "RPG", platforms: "PS5", estimatedTime: "100h", difficulty: "Média" },
];

export const defaultSessions: Partial<DbPlaySession>[] = [];
