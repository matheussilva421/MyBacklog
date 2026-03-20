import { dbPriorityToPriority, dbStatusToStatus } from "../../backlog/shared";
import { getPrimaryCsvToken, repairLegacyText } from "../../core/utils";
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
  const title = repairLegacyText(game.title) || game.title;
  const platform = repairLegacyText(libraryEntry.platform) || repairLegacyText(getPrimaryCsvToken(game.platforms, "PC")) || "PC";
  const genre = repairLegacyText(getPrimaryCsvToken(game.genres, "Catálogo tático")) || "Catálogo tático";
  const catalogPlatforms = repairLegacyText(game.platforms) || undefined;
  const sourceStore = repairLegacyText(libraryEntry.sourceStore) || "Manual";
  const eta = repairLegacyText(game.estimatedTime) || "Sem dado";
  const mood = repairLegacyText(libraryEntry.mood) || "Tático";
  const notes = repairLegacyText(libraryEntry.notes) || "Sem leitura registrada no sistema.";
  const difficulty = repairLegacyText(game.difficulty) || "Média";
  const developer = repairLegacyText(game.developer) || undefined;
  const publisher = repairLegacyText(game.publisher) || undefined;
  const description = repairLegacyText(game.description) || undefined;

  return {
    id: libraryEntry.id ?? Date.now(),
    title,
    platform,
    catalogPlatforms,
    sourceStore,
    genre,
    status: dbStatusToStatus(libraryEntry),
    progress: Math.max(0, Math.min(100, Math.round(libraryEntry.completionPercent || 0))),
    hours: Math.max(0, Math.round((libraryEntry.playtimeMinutes || 0) / 60)),
    eta,
    priority: dbPriorityToPriority(libraryEntry.priority),
    mood,
    score:
      typeof libraryEntry.personalRating === "number" ? Number(libraryEntry.personalRating) : 0,
    year: game.releaseYear || new Date(game.createdAt || Date.now()).getFullYear(),
    notes,
    description,
    difficulty,
    completionDate: libraryEntry.completionDate,
    coverUrl: game.coverUrl,
    rawgId: game.rawgId,
    developer,
    publisher,
  };
}
