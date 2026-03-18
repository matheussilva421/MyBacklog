import { dbPriorityToPriority, dbStatusToStatus } from "../../backlog/shared";
import type { Game, LibraryRecord } from "../../backlog/shared";
import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry } from "../../core/types";

export function composeLibraryRecords(
  games: DbGameMetadata[],
  libraryEntries: DbLibraryEntry[],
): LibraryRecord[] {
  const gameMap = new Map(games.map((game) => [game.id, game]));
  return libraryEntries
    .map((libraryEntry) => {
      const game = gameMap.get(libraryEntry.gameId);
      if (!game) return null;
      return { game, libraryEntry };
    })
    .filter((record): record is LibraryRecord => Boolean(record));
}

export function dbGameToUiGame(record: LibraryRecord): Game {
  const { game, libraryEntry } = record;
  const genre = game.genres?.split(",")[0]?.trim() || game.genres || "Catálogo tático";

  return {
    id: libraryEntry.id ?? Date.now(),
    title: game.title,
    platform: libraryEntry.platform || game.platforms?.split(",")[0]?.trim() || "PC",
    sourceStore: libraryEntry.sourceStore || "Manual",
    genre,
    status: dbStatusToStatus(libraryEntry),
    progress: Math.max(0, Math.min(100, Math.round(libraryEntry.completionPercent || 0))),
    hours: Math.max(0, Math.round((libraryEntry.playtimeMinutes || 0) / 60)),
    eta: game.estimatedTime || "Sem dado",
    priority: dbPriorityToPriority(libraryEntry.priority),
    mood: libraryEntry.mood || "Tático",
    score:
      typeof libraryEntry.personalRating === "number" ? Number(libraryEntry.personalRating) : 0,
    year: game.releaseYear || new Date(game.createdAt || Date.now()).getFullYear(),
    notes: libraryEntry.notes || "Sem leitura registrada no sistema.",
    difficulty: game.difficulty || "Média",
  };
}
