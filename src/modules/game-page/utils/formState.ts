import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry } from "../../../core/types";
import { mergePlatformList, normalizeGameTitle, priorityToDbPriority, statusToDbStatus } from "../../../backlog/shared";
import type { Game, GameFormState } from "../../../backlog/shared";
import { deriveCompletionDate } from "../../../core/catalogIntegrity";
import { generateUuid, getPrimaryCsvToken, splitCsvTokens } from "../../../core/utils";

type GameFormDefaults = {
  platform?: string;
  sourceStore?: string;
};

function parseOptionalFiniteNumber(value: string, fallback?: number): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalFiniteInteger(value: string, fallback?: number): number | undefined {
  const parsed = parseOptionalFiniteNumber(value, fallback);
  return typeof parsed === "number" ? Math.trunc(parsed) : parsed;
}

export function createGameFormState(game?: Game, defaults?: GameFormDefaults): GameFormState {
  const platforms = splitCsvTokens(
    game?.platforms ?? game?.catalogPlatforms ?? game?.platform ?? defaults?.platform ?? "PC",
  );
  const stores = splitCsvTokens(game?.stores ?? game?.sourceStore ?? defaults?.sourceStore ?? "Manual");

  return {
    title: game?.title ?? "",
    platform: game?.platform ?? getPrimaryCsvToken(platforms, defaults?.platform ?? "PC"),
    platforms,
    catalogPlatforms: platforms.join(", "),
    sourceStore: game?.sourceStore ?? getPrimaryCsvToken(stores, defaults?.sourceStore ?? "Manual"),
    stores,
    genre: game?.genre ?? "",
    status: game?.status ?? "Backlog",
    priority: game?.priority ?? "Média",
    progress: game ? Number(game.progress) : 0,
    hours: game ? Number(game.hours) : 0,
    eta: game?.eta ?? "12h",
    score: game ? String(game.score) : "",
    year: game ? String(game.year) : String(new Date().getFullYear()),
    mood: game?.mood ?? "",
    difficulty: game?.difficulty ?? "Média",
    coverUrl: game?.coverUrl ?? "",
    rawgId: game?.rawgId != null ? String(game.rawgId) : "",
    developer: game?.developer ?? "",
    publisher: game?.publisher ?? "",
    description: game?.description ?? "",
    notes: game?.notes ?? "",
    startedAt: game?.startedAt ?? "",
    purchaseDate: game?.purchaseDate ?? "",
    pricePaid: game?.pricePaid != null ? String(game.pricePaid) : "",
    targetPrice: game?.targetPrice != null ? String(game.targetPrice) : "",
    currency: game?.currency ?? "BRL",
    storeLink: game?.storeLink ?? "",
  };
}

export function createDbGameFromForm(
  form: GameFormState,
  current?: { game: DbGameMetadata; libraryEntry: DbLibraryEntry },
): { game: DbGameMetadata; libraryEntry: DbLibraryEntry } {
  const progress = Math.max(0, Math.min(100, Math.round(Number(form.progress) || 0)));
  const hours = Math.max(0, form.hours || 0);
  const rawgId = parseOptionalFiniteInteger(form.rawgId, current?.game.rawgId);
  const releaseYear = parseOptionalFiniteInteger(form.year, current?.game.releaseYear);
  const pricePaid = parseOptionalFiniteNumber(form.pricePaid, current?.libraryEntry.pricePaid);
  const targetPrice = parseOptionalFiniteNumber(form.targetPrice, current?.libraryEntry.targetPrice);
  const personalRating = parseOptionalFiniteNumber(form.score, current?.libraryEntry.personalRating);
  const title = form.title.trim();
  const structuredPlatforms = splitCsvTokens([form.platform, ...(form.platforms ?? []), form.catalogPlatforms]);
  const platform = getPrimaryCsvToken(structuredPlatforms, form.platform.trim() || "PC");
  const structuredStores = splitCsvTokens([form.sourceStore, ...(form.stores ?? [])]);
  const now = new Date().toISOString();
  const progressStatus = statusToDbStatus(form.status);
  const completionPercent = form.status === "Terminado" ? 100 : progress;
  const ownershipStatus = form.status === "Wishlist" ? "wishlist" : "owned";

  return {
    game: {
      id: current?.game.id,
      uuid: current?.game.uuid || generateUuid(),
      version: current?.game.version || 1,
      title,
      normalizedTitle: normalizeGameTitle(title),
      slug: current?.game.slug,
      coverUrl: form.coverUrl.trim() || current?.game.coverUrl,
      rawgId,
      description: form.description.trim() || current?.game.description,
      genres: form.genre.trim() || undefined,
      estimatedTime: form.eta.trim() || undefined,
      difficulty: form.difficulty.trim() || undefined,
      releaseYear,
      platforms: mergePlatformList(current?.game.platforms, structuredPlatforms.join(", ")),
      developer: form.developer.trim() || current?.game.developer,
      publisher: form.publisher.trim() || current?.game.publisher,
      createdAt: current?.game.createdAt || now,
      updatedAt: now,
    },
    libraryEntry: {
      id: current?.libraryEntry.id,
      uuid: current?.libraryEntry.uuid || generateUuid(),
      version: current?.libraryEntry.version || 1,
      gameId: current?.game.id ?? 0,
      platform,
      sourceStore: getPrimaryCsvToken(structuredStores, current?.libraryEntry.sourceStore || "Manual"),
      edition: current?.libraryEntry.edition,
      format: current?.libraryEntry.format || "digital",
      ownershipStatus,
      progressStatus,
      purchaseDate: form.purchaseDate.trim() || current?.libraryEntry.purchaseDate,
      pricePaid,
      targetPrice,
      currency: form.currency.trim() || current?.libraryEntry.currency,
      storeLink: form.storeLink.trim() || current?.libraryEntry.storeLink,
      startedAt: form.startedAt.trim() || current?.libraryEntry.startedAt,
      playtimeMinutes: Math.round(hours * 60),
      completionPercent,
      priority: priorityToDbPriority(form.priority),
      personalRating,
      notes: form.notes.trim() || undefined,
      checklist: current?.libraryEntry.checklist,
      mood: form.mood.trim() || undefined,
      favorite: current?.libraryEntry.favorite ?? form.priority === "Alta",
      lastSessionAt: current?.libraryEntry.lastSessionAt,
      completionDate: deriveCompletionDate({
        currentCompletionDate: current?.libraryEntry.completionDate,
        completionPercent,
        progressStatus,
        completedAt: current?.libraryEntry.lastSessionAt,
        fallbackDate: now,
      }),
      createdAt: current?.libraryEntry.createdAt || now,
      updatedAt: now,
    },
  };
}
