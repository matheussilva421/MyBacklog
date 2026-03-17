import { dbPriorityToPriority, dbStatusToStatus, mergePlatformList, normalizeGameTitle, priorityToDbPriority, statusToDbStatus } from "../../../backlog/shared";
import type { Game, LibraryRecord } from "../../../backlog/shared";
import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry } from "../../../core/types";
import type { GameFormState } from "../../../backlog/shared";

export function composeLibraryRecords(games: DbGameMetadata[], libraryEntries: DbLibraryEntry[]): LibraryRecord[] {
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
  const genre = game.genres?.split(",")[0]?.trim() || game.genres || "Catalogo tatico";
  return {
    id: libraryEntry.id ?? Date.now(),
    title: game.title,
    platform: libraryEntry.platform || game.platforms?.split(",")[0]?.trim() || "PC",
    genre,
    status: dbStatusToStatus(libraryEntry),
    progress: Math.max(0, Math.min(100, Math.round(libraryEntry.completionPercent || 0))),
    hours: Math.max(0, Math.round((libraryEntry.playtimeMinutes || 0) / 60)),
    eta: game.estimatedTime || "Sem dado",
    priority: dbPriorityToPriority(libraryEntry.priority),
    mood: libraryEntry.mood || "Tatico",
    score: typeof libraryEntry.personalRating === "number" ? Number(libraryEntry.personalRating) : 0,
    year: game.releaseYear || new Date(game.createdAt || Date.now()).getFullYear(),
    notes: libraryEntry.notes || "Sem leitura registrada no sistema.",
    difficulty: game.difficulty || "Media",
  };
}

export function createDbGameFromForm(form: GameFormState, current?: LibraryRecord): LibraryRecord {
  const progress = Math.max(0, Math.min(100, Math.round(Number(form.progress) || 0)));
  const hours = Math.max(0, Number(form.hours) || 0);
  const title = form.title.trim();
  const platform = form.platform.trim() || "PC";
  const now = new Date().toISOString();

  return {
    game: {
      id: current?.game.id,
      title,
      normalizedTitle: normalizeGameTitle(title),
      slug: current?.game.slug,
      coverUrl: current?.game.coverUrl,
      rawgId: current?.game.rawgId,
      genres: form.genre.trim() || undefined,
      estimatedTime: form.eta.trim() || undefined,
      difficulty: form.difficulty.trim() || undefined,
      releaseYear: form.year ? Number(form.year) : undefined,
      platforms: mergePlatformList(current?.game.platforms, platform),
      developer: current?.game.developer,
      publisher: current?.game.publisher,
      createdAt: current?.game.createdAt || now,
      updatedAt: now,
    },
    libraryEntry: {
      id: current?.libraryEntry.id,
      gameId: current?.game.id ?? 0,
      platform,
      sourceStore: current?.libraryEntry.sourceStore || "Manual",
      edition: current?.libraryEntry.edition,
      format: current?.libraryEntry.format || "digital",
      ownershipStatus: form.status === "Wishlist" ? "wishlist" : "owned",
      progressStatus: statusToDbStatus(form.status),
      purchaseDate: current?.libraryEntry.purchaseDate,
      pricePaid: current?.libraryEntry.pricePaid,
      playtimeMinutes: Math.round(hours * 60),
      completionPercent: form.status === "Terminado" ? 100 : progress,
      priority: priorityToDbPriority(form.priority),
      personalRating: form.score ? Number(form.score) : undefined,
      notes: form.notes.trim() || undefined,
      checklist: current?.libraryEntry.checklist,
      mood: form.mood.trim() || undefined,
      favorite: current?.libraryEntry.favorite ?? form.priority === "Alta",
      lastSessionAt: current?.libraryEntry.lastSessionAt,
      createdAt: current?.libraryEntry.createdAt || now,
      updatedAt: now,
    },
  };
}
