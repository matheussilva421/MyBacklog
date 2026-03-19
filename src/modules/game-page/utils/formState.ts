import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry } from "../../../core/types";
import { mergePlatformList, normalizeGameTitle, priorityToDbPriority, statusToDbStatus } from "../../../backlog/shared";
import type { Game, GameFormState } from "../../../backlog/shared";

type GameFormDefaults = {
  platform?: string;
  sourceStore?: string;
};

export function createGameFormState(game?: Game, defaults?: GameFormDefaults): GameFormState {
  return {
    title: game?.title ?? "",
    platform: game?.platform ?? defaults?.platform ?? "PC",
    sourceStore: game?.sourceStore ?? defaults?.sourceStore ?? "Manual",
    genre: game?.genre ?? "",
    status: game?.status ?? "Backlog",
    priority: game?.priority ?? "Média",
    progress: game ? String(game.progress) : "0",
    hours: game ? String(game.hours) : "0",
    eta: game?.eta ?? "12h",
    score: game ? String(game.score) : "",
    year: game ? String(game.year) : String(new Date().getFullYear()),
    mood: game?.mood ?? "",
    difficulty: game?.difficulty ?? "Média",
    notes: game?.notes ?? "",
  };
}

export function createDbGameFromForm(form: GameFormState, current?: { game: DbGameMetadata; libraryEntry: DbLibraryEntry }): { game: DbGameMetadata; libraryEntry: DbLibraryEntry } {
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
      sourceStore: form.sourceStore.trim() || current?.libraryEntry.sourceStore || "Manual",
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
