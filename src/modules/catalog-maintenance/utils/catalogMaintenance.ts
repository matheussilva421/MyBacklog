import { deriveProgressStatus, recalculateLibraryEntryFromSessions } from "../../../core/catalogIntegrity";
import type {
  Game,
  GameTag,
  LibraryEntry,
  LibraryEntryList,
  List,
  PlaySession,
  Review,
  Tag,
} from "../../../core/types";
import { buildCatalogAuditReport, type CatalogAuditReport } from "../../settings/utils/catalogAudit";

export type CatalogDuplicateSuggestion = "merge" | "keep" | "ignore";

export type CatalogDuplicateCandidate = {
  libraryEntryId: number;
  gameId: number;
  title: string;
  platform: string;
  sourceStore: string;
  releaseYear?: number;
  developer?: string;
  publisher?: string;
  completionPercent: number;
  playtimeMinutes: number;
  progressStatus: string;
  favorite: boolean;
  updatedAt: string;
  sessionCount: number;
  hasReview: boolean;
  tagCount: number;
  listCount: number;
};

export type CatalogDuplicateGroup = {
  id: string;
  key: string;
  title: string;
  platform: string;
  releaseYear?: number;
  reasons: string[];
  suggestedAction: CatalogDuplicateSuggestion;
  suggestedPrimaryEntryId: number;
  mergeableEntryIds: number[];
  candidates: CatalogDuplicateCandidate[];
};

export type CatalogMetadataQueueItem = {
  id: string;
  gameId: number;
  title: string;
  releaseYear?: number;
  representativeEntryId: number;
  linkedEntries: number;
  missingFields: string[];
  rawgId?: number;
  coverUrl?: string;
  platforms: string[];
  developer?: string;
  publisher?: string;
};

export type CatalogMaintenanceSummary = {
  totalIssues: number;
  structuralIssues: number;
  repairableStructuralIssues: number;
  duplicateGroups: number;
  duplicateEntries: number;
  metadataQueue: number;
  orphanSessions: number;
};

export type CatalogMaintenanceReport = {
  summary: CatalogMaintenanceSummary;
  audit: CatalogAuditReport;
  duplicateGroups: CatalogDuplicateGroup[];
  metadataQueue: CatalogMetadataQueueItem[];
};

const metadataLabels: Record<string, string> = {
  coverUrl: "capa",
  genres: "gêneros",
  estimatedTime: "ETA",
  platforms: "plataformas",
  developer: "estúdio",
  publisher: "publisher",
  releaseYear: "ano",
};

function summarizeMetadataGaps(game: Game): string[] {
  return [
    "coverUrl",
    "genres",
    "estimatedTime",
    "platforms",
    "developer",
    "publisher",
    "releaseYear",
  ].filter((field) => {
    const value = game[field as keyof Game];
    if (typeof value === "number") return !Number.isFinite(value);
    return !String(value || "").trim();
  });
}

function buildMetadataQueue(args: {
  games: Game[];
  libraryEntries: LibraryEntry[];
}): CatalogMetadataQueueItem[] {
  const { games, libraryEntries } = args;
  const entriesByGameId = new Map<number, LibraryEntry[]>();

  for (const entry of libraryEntries) {
    const current = entriesByGameId.get(entry.gameId);
    if (current) current.push(entry);
    else entriesByGameId.set(entry.gameId, [entry]);
  }

  const items: CatalogMetadataQueueItem[] = [];
  for (const game of games) {
    if (game.id == null) continue;
    const missingFields = summarizeMetadataGaps(game);
    if (missingFields.length === 0) continue;
    const linkedEntries = entriesByGameId.get(game.id) ?? [];
    const representative = [...linkedEntries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (!representative?.id) continue;

    items.push({
      id: `metadata-${game.id}`,
      gameId: game.id,
      title: game.title,
      releaseYear: game.releaseYear,
      representativeEntryId: representative.id,
      linkedEntries: linkedEntries.length,
      missingFields: missingFields.map((field) => metadataLabels[field] || field),
      rawgId: game.rawgId,
      coverUrl: game.coverUrl,
      platforms: String(game.platforms || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      developer: game.developer,
      publisher: game.publisher,
    });
  }

  return items.sort((left, right) => {
    if (left.missingFields.length !== right.missingFields.length) {
      return right.missingFields.length - left.missingFields.length;
    }
    return left.title.localeCompare(right.title, "pt-BR");
  });
}

function countByLibraryEntry<T extends { libraryEntryId: number }>(rows: T[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row.libraryEntryId, (counts.get(row.libraryEntryId) ?? 0) + 1);
  }
  return counts;
}

function buildDuplicateReasons(candidates: CatalogDuplicateCandidate[]): string[] {
  const reasons: string[] = ["Título normalizado e plataforma coincidem."];
  const years = Array.from(new Set(candidates.map((candidate) => candidate.releaseYear).filter(Boolean)));
  const developers = Array.from(
    new Set(candidates.map((candidate) => candidate.developer?.trim().toLowerCase()).filter(Boolean)),
  );
  const publishers = Array.from(
    new Set(candidates.map((candidate) => candidate.publisher?.trim().toLowerCase()).filter(Boolean)),
  );

  if (years.length <= 1) reasons.push("Ano compatível entre os registros.");
  if (developers.length <= 1 && developers.length > 0) reasons.push("Estúdio compatível entre os registros.");
  if (publishers.length <= 1 && publishers.length > 0) reasons.push("Publisher compatível entre os registros.");
  return reasons;
}

function getDuplicateSuggestion(candidates: CatalogDuplicateCandidate[]): CatalogDuplicateSuggestion {
  const years = Array.from(new Set(candidates.map((candidate) => candidate.releaseYear).filter(Boolean)));
  const developers = Array.from(
    new Set(candidates.map((candidate) => candidate.developer?.trim().toLowerCase()).filter(Boolean)),
  );
  const publishers = Array.from(
    new Set(candidates.map((candidate) => candidate.publisher?.trim().toLowerCase()).filter(Boolean)),
  );

  if (years.length <= 1 && (developers.length <= 1 || publishers.length <= 1)) return "merge";
  if (years.length > 1 && developers.length > 1 && publishers.length > 1) return "ignore";
  return "keep";
}

function pickPrimaryCandidate(candidates: CatalogDuplicateCandidate[]): CatalogDuplicateCandidate {
  return [...candidates].sort((left, right) => {
    if (left.favorite !== right.favorite) return Number(right.favorite) - Number(left.favorite);
    if (left.hasReview !== right.hasReview) return Number(right.hasReview) - Number(left.hasReview);
    if (left.sessionCount !== right.sessionCount) return right.sessionCount - left.sessionCount;
    if (left.playtimeMinutes !== right.playtimeMinutes) return right.playtimeMinutes - left.playtimeMinutes;
    if (left.completionPercent !== right.completionPercent) return right.completionPercent - left.completionPercent;
    return right.updatedAt.localeCompare(left.updatedAt);
  })[0];
}

function buildDuplicateGroups(args: {
  games: Game[];
  libraryEntries: LibraryEntry[];
  sessions: PlaySession[];
  reviews: Review[];
  libraryEntryLists: LibraryEntryList[];
  gameTags: GameTag[];
}): CatalogDuplicateGroup[] {
  const { games, libraryEntries, sessions, reviews, libraryEntryLists, gameTags } = args;
  const gameById = new Map(games.map((game) => [game.id, game] as const));
  const sessionCounts = countByLibraryEntry(sessions);
  const reviewEntryIds = new Set(reviews.map((review) => review.libraryEntryId));
  const listCounts = countByLibraryEntry(libraryEntryLists);
  const tagCounts = countByLibraryEntry(gameTags);
  const groups = new Map<string, CatalogDuplicateCandidate[]>();

  for (const entry of libraryEntries) {
    if (!entry.id) continue;
    const game = gameById.get(entry.gameId);
    if (!game?.id) continue;
    const platformKey = entry.platform.trim().toLowerCase();
    const groupKey = `${game.normalizedTitle}::${platformKey}`;
    const current = groups.get(groupKey) ?? [];
    current.push({
      libraryEntryId: entry.id,
      gameId: game.id,
      title: game.title,
      platform: entry.platform,
      sourceStore: entry.sourceStore,
      releaseYear: game.releaseYear,
      developer: game.developer,
      publisher: game.publisher,
      completionPercent: entry.completionPercent,
      playtimeMinutes: entry.playtimeMinutes,
      progressStatus: entry.progressStatus,
      favorite: Boolean(entry.favorite),
      updatedAt: entry.updatedAt,
      sessionCount: sessionCounts.get(entry.id) ?? 0,
      hasReview: reviewEntryIds.has(entry.id),
      tagCount: tagCounts.get(entry.id) ?? 0,
      listCount: listCounts.get(entry.id) ?? 0,
    });
    groups.set(groupKey, current);
  }

  return Array.from(groups.entries())
    .filter(([, candidates]) => candidates.length > 1)
    .map(([key, candidates]) => {
      const primary = pickPrimaryCandidate(candidates);
      const suggestedAction = getDuplicateSuggestion(candidates);
      const [first] = candidates;
      return {
        id: `duplicate-${key}`,
        key,
        title: first.title,
        platform: first.platform,
        releaseYear: first.releaseYear,
        reasons: buildDuplicateReasons(candidates),
        suggestedAction,
        suggestedPrimaryEntryId: primary.libraryEntryId,
        mergeableEntryIds: candidates
          .map((candidate) => candidate.libraryEntryId)
          .filter((libraryEntryId) => libraryEntryId !== primary.libraryEntryId),
        candidates: [...candidates].sort((left, right) => {
          if (left.libraryEntryId === primary.libraryEntryId) return -1;
          if (right.libraryEntryId === primary.libraryEntryId) return 1;
          return right.updatedAt.localeCompare(left.updatedAt);
        }),
      } satisfies CatalogDuplicateGroup;
    })
    .sort((left, right) => left.title.localeCompare(right.title, "pt-BR"));
}

export function buildCatalogMaintenanceReport(args: {
  games: Game[];
  libraryEntries: LibraryEntry[];
  sessions: PlaySession[];
  reviews: Review[];
  lists: List[];
  libraryEntryLists: LibraryEntryList[];
  tags: Tag[];
  gameTags: GameTag[];
}): CatalogMaintenanceReport {
  const audit = buildCatalogAuditReport({
    games: args.games,
    libraryEntries: args.libraryEntries,
    sessions: args.sessions,
  });

  const duplicateGroups = buildDuplicateGroups({
    games: args.games,
    libraryEntries: args.libraryEntries,
    sessions: args.sessions,
    reviews: args.reviews,
    libraryEntryLists: args.libraryEntryLists,
    gameTags: args.gameTags,
  });
  const metadataQueue = buildMetadataQueue({
    games: args.games,
    libraryEntries: args.libraryEntries,
  });

  return {
    summary: {
      totalIssues: audit.summary.totalIssues + duplicateGroups.length + metadataQueue.length,
      structuralIssues: audit.summary.totalIssues,
      repairableStructuralIssues: audit.summary.repairableIssues,
      duplicateGroups: duplicateGroups.length,
      duplicateEntries: duplicateGroups.reduce((total, group) => total + group.candidates.length, 0),
      metadataQueue: metadataQueue.length,
      orphanSessions: audit.summary.orphanSessions,
    },
    audit,
    duplicateGroups,
    metadataQueue,
  };
}

function pickPreferredText(primary?: string, secondary?: string): string | undefined {
  const left = primary?.trim();
  const right = secondary?.trim();
  if (left && right) return left.length >= right.length ? left : right;
  return left || right || undefined;
}

function mergeCsvValues(primary?: string, secondary?: string): string | undefined {
  const values = Array.from(
    new Set(
      [primary, secondary]
        .flatMap((value) => String(value || "").split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
  return values.length > 0 ? values.join(", ") : undefined;
}

export function mergeGameMetadata(primary: Game, duplicate: Game): Game {
  return {
    ...primary,
    slug: primary.slug || duplicate.slug,
    coverUrl: primary.coverUrl || duplicate.coverUrl,
    rawgId: primary.rawgId ?? duplicate.rawgId,
    genres: mergeCsvValues(primary.genres, duplicate.genres),
    estimatedTime: pickPreferredText(primary.estimatedTime, duplicate.estimatedTime),
    difficulty: pickPreferredText(primary.difficulty, duplicate.difficulty),
    releaseYear: primary.releaseYear ?? duplicate.releaseYear,
    platforms: mergeCsvValues(primary.platforms, duplicate.platforms),
    developer: pickPreferredText(primary.developer, duplicate.developer),
    publisher: pickPreferredText(primary.publisher, duplicate.publisher),
    updatedAt: new Date().toISOString(),
  };
}

function pickOwnershipStatus(current: LibraryEntry["ownershipStatus"], incoming: LibraryEntry["ownershipStatus"]) {
  const rank: Record<LibraryEntry["ownershipStatus"], number> = {
    owned: 5,
    subscription: 4,
    borrowed: 3,
    emulated: 2,
    wishlist: 1,
  };
  return rank[incoming] > rank[current] ? incoming : current;
}

function pickPriority(current: LibraryEntry["priority"], incoming: LibraryEntry["priority"]) {
  const rank: Record<LibraryEntry["priority"], number> = { low: 1, medium: 2, high: 3 };
  return rank[incoming] > rank[current] ? incoming : current;
}

export function mergeLibraryEntries(
  primary: LibraryEntry,
  duplicates: LibraryEntry[],
  mergedSessions: PlaySession[],
): LibraryEntry {
  const combined = duplicates.reduce(
    (current, duplicate) => ({
      ...current,
      sourceStore: pickPreferredText(current.sourceStore, duplicate.sourceStore) || current.sourceStore,
      edition: pickPreferredText(current.edition, duplicate.edition),
      format: current.format === "digital" ? current.format : duplicate.format,
      ownershipStatus: pickOwnershipStatus(current.ownershipStatus, duplicate.ownershipStatus),
      purchaseDate: current.purchaseDate || duplicate.purchaseDate,
      pricePaid: current.pricePaid ?? duplicate.pricePaid,
      priority: pickPriority(current.priority, duplicate.priority),
      personalRating: current.personalRating ?? duplicate.personalRating,
      notes: pickPreferredText(current.notes, duplicate.notes),
      checklist: mergeCsvValues(current.checklist, duplicate.checklist),
      mood: pickPreferredText(current.mood, duplicate.mood),
      favorite: Boolean(current.favorite || duplicate.favorite),
      updatedAt: new Date().toISOString(),
    }),
    { ...primary },
  );

  const recalculated = recalculateLibraryEntryFromSessions(combined, mergedSessions);
  const reviewBackedStatus = deriveProgressStatus({
    currentStatus: combined.progressStatus,
    completionPercent: recalculated.completionPercent,
    playtimeMinutes: recalculated.playtimeMinutes,
    hasSessions: mergedSessions.length > 0,
  });

  return {
    ...combined,
    playtimeMinutes: recalculated.playtimeMinutes,
    completionPercent: recalculated.completionPercent,
    lastSessionAt: recalculated.lastSessionAt,
    progressStatus: reviewBackedStatus,
  };
}

function mergeTextBlock(primary?: string, duplicate?: string): string | undefined {
  const parts = Array.from(
    new Set(
      [primary, duplicate]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

export function mergeReviewRecords(primary?: Review, duplicate?: Review): Review | undefined {
  if (!primary && !duplicate) return undefined;
  if (!primary) return duplicate;
  if (!duplicate) return primary;

  return {
    ...primary,
    score: primary.score ?? duplicate.score,
    shortReview: mergeTextBlock(primary.shortReview, duplicate.shortReview),
    longReview: mergeTextBlock(primary.longReview, duplicate.longReview),
    pros: mergeTextBlock(primary.pros, duplicate.pros),
    cons: mergeTextBlock(primary.cons, duplicate.cons),
    recommend: primary.recommend ?? duplicate.recommend,
    hasSpoiler: Boolean(primary.hasSpoiler || duplicate.hasSpoiler),
  };
}
