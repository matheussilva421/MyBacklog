import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry, PlaySession as DbPlaySession, Goal as DbGoal, List as DbList, Tag as DbTag, Review as DbReview, GameFormat, OwnershipStatus, Priority, ProgressStatus } from "../../../core/types";
import { normalizeGameTitle, mergePlatformList } from "../../../core/utils";
import { composeLibraryRecords } from "../../library/utils";
import type { BackupPayload, RestoreMode, ImportPreviewEntry, RestorePreview } from "../../../backlog/shared";

export type ImportSource = "csv" | "steam" | "playnite";

export type ImportPayload = {
  title: string;
  platform: string;
  sourceStore: string;
  format: GameFormat;
  ownershipStatus: OwnershipStatus;
  progressStatus: ProgressStatus;
  playtimeMinutes: number;
  completionPercent: number;
  priority: Priority;
  personalRating?: number;
  notes?: string;
  rawgId?: number;
  genres?: string;
  checklist?: string;
  estimatedTime?: string;
  mood?: string;
  difficulty?: string;
  releaseYear?: number;
  favorite?: boolean;
  coverUrl?: string;
  developer?: string;
  publisher?: string;
};

export function normalizeImportValue(value: string): string {
  return value.trim().toLowerCase();
}

export function createImportKey(title: string, platform: string): string {
  return `${normalizeImportValue(title)}::${normalizeImportValue(platform)}`;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvRows(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => normalizeImportValue(header));
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function parseMinutes(raw: string | number | undefined): number {
  if (typeof raw === "number") return Math.max(0, Math.round(raw));
  if (!raw) return 0;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function parseHoursToMinutes(raw: string | number | undefined): number {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 60)) : 0;
}

function mapOwnership(raw: string): OwnershipStatus {
  const value = normalizeImportValue(raw);
  if (["wishlist", "desejado"].includes(value)) return "wishlist";
  if (["subscription", "gamepass", "ps plus"].includes(value)) return "subscription";
  if (["borrowed", "emprestado"].includes(value)) return "borrowed";
  if (["emulated", "emulador"].includes(value)) return "emulated";
  return "owned";
}

function mapProgress(raw: string): ProgressStatus {
  const value = normalizeImportValue(raw);
  if (["playing", "jogando", "in progress"].includes(value)) return "playing";
  if (["paused", "pausado", "on hold"].includes(value)) return "paused";
  if (["finished", "terminado", "beaten"].includes(value)) return "finished";
  if (["completed_100", "100%", "platinado", "completed"].includes(value)) return "completed_100";
  if (["abandoned", "dropado", "dropped"].includes(value)) return "abandoned";
  if (["replay_later", "rejogar"].includes(value)) return "replay_later";
  if (["archived", "arquivado"].includes(value)) return "archived";
  return "not_started";
}

function mapPriority(raw: string): Priority {
  const value = normalizeImportValue(raw);
  if (["high", "alta"].includes(value)) return "high";
  if (["low", "baixa"].includes(value)) return "low";
  return "medium";
}

function defaultPayload(title: string): ImportPayload {
  return {
    title,
    platform: "PC",
    sourceStore: "Manual",
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "not_started",
    playtimeMinutes: 0,
    completionPercent: 0,
    priority: "medium",
  };
}

function fromCsvRows(rows: Array<Record<string, string>>, fallbackStore: string): ImportPayload[] {
  return rows
    .map((row) => {
      const title = row.title || row.name;
      if (!title) return null;
      const payload = defaultPayload(title);
      payload.platform = row.platform || row.plataforma || payload.platform;
      payload.sourceStore = row.sourcestore || row.loja || row.source || fallbackStore;
      payload.ownershipStatus = mapOwnership(row.ownershipstatus || row.ownership || row.posse || "");
      payload.progressStatus = mapProgress(row.progressstatus || row.progress || row.status || "");
      payload.priority = mapPriority(row.priority || row.prioridade || "");
      payload.genres = row.genres || row.generos || "";
      payload.notes = row.notes || row.notas || "";
      payload.personalRating = Number(row.personalrating || row.rating || row.userscore || 0) || undefined;
      payload.playtimeMinutes = parseMinutes(row.playtimeminutes || row.playtime_forever || row.playtime || 0);
      if (!payload.playtimeMinutes && row.playtimehours) payload.playtimeMinutes = parseHoursToMinutes(row.playtimehours);
      payload.completionPercent = Number(row.completionpercent || row.progresspercent || 0) || 0;
      payload.estimatedTime = row.estimatedtime || row.eta || undefined;
      payload.difficulty = row.difficulty || row.dificuldade || undefined;
      payload.releaseYear = Number(row.releaseyear || row.year || row.ano || 0) || undefined;
      payload.coverUrl = row.coverurl || row.cover || undefined;
      payload.developer = row.developer || row.studio || undefined;
      payload.publisher = row.publisher || row.publishers || undefined;
      return payload;
    })
    .filter((value): value is ImportPayload => Boolean(value));
}

export function parseImportText(source: ImportSource, text: string): ImportPayload[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if ((source === "playnite" || source === "steam") && (trimmed.startsWith("[") || trimmed.startsWith("{"))) {
    const jsonData = JSON.parse(trimmed);
    const list = Array.isArray(jsonData) ? jsonData : jsonData.games ?? jsonData.items ?? [];
    if (!Array.isArray(list)) return [];
    return list
      .map((item: Record<string, unknown>) => {
        const title = String(item.name ?? item.title ?? item.Name ?? "").trim();
        if (!title) return null;
        const payload = defaultPayload(title);
        payload.platform = String(item.platform ?? item.platforms ?? item.Platforms ?? payload.platform)
          .split(",")[0]
          .trim() || payload.platform;
        payload.sourceStore = String(
          item.sourceStore ?? item.store ?? item.Source ?? (source === "steam" ? "Steam" : "Playnite"),
        );
        payload.ownershipStatus = mapOwnership(String(item.ownershipStatus ?? item.Owned ?? "owned"));
        payload.progressStatus = mapProgress(String(item.progressStatus ?? item.CompletionStatus ?? "not_started"));
        payload.playtimeMinutes = parseMinutes(
          (item.playtimeMinutes ?? item.playtime_forever ?? item.Playtime) as string | number | undefined,
        );
        if (!payload.playtimeMinutes) {
          payload.playtimeMinutes = parseHoursToMinutes(item.HoursPlayed as string | number | undefined);
        }
        payload.personalRating = Number(item.personalRating ?? item.UserScore ?? 0) || undefined;
        payload.notes = String(item.notes ?? item.Notes ?? "") || undefined;
        payload.genres = String(item.genres ?? item.Genres ?? "") || undefined;
        payload.estimatedTime = String(item.estimatedTime ?? item.ETA ?? "") || undefined;
        payload.difficulty = String(item.difficulty ?? item.Difficulty ?? "") || undefined;
        payload.releaseYear = Number(item.releaseYear ?? item.Year ?? 0) || undefined;
        payload.coverUrl = String(item.coverUrl ?? item.background_image ?? "") || undefined;
        payload.developer = String(item.developer ?? item.Developer ?? "") || undefined;
        payload.publisher = String(item.publisher ?? item.Publisher ?? "") || undefined;
        return payload;
      })
      .filter((value): value is ImportPayload => Boolean(value));
  }

  const rows = parseCsvRows(trimmed);
  return fromCsvRows(rows, source === "steam" ? "Steam" : source === "playnite" ? "Playnite" : "CSV");
}

export function dedupeImport(
  incoming: ImportPayload[],
  existing: Array<Pick<ImportPayload, "title" | "platform">>,
): { toCreate: ImportPayload[]; duplicates: number } {
  const existingMap = new Map(existing.map((game) => [createImportKey(game.title, game.platform), game]));
  const batchMap = new Map<string, ImportPayload>();
  let duplicates = 0;

  for (const item of incoming) {
    const key = createImportKey(item.title, item.platform);
    if (existingMap.has(key) || batchMap.has(key)) {
      duplicates += 1;
      const previous = batchMap.get(key);
      if (previous) {
        previous.playtimeMinutes = Math.max(previous.playtimeMinutes, item.playtimeMinutes);
        previous.completionPercent = Math.max(previous.completionPercent, item.completionPercent);
      }
      continue;
    }
    batchMap.set(key, item);
  }

  return { toCreate: Array.from(batchMap.values()), duplicates };
}

function escapeCsv(value: string | number | undefined): string {
  if (value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function gamesToCsv(records: ImportPayload[]): string {
  const headers = [
    "title",
    "platform",
    "sourceStore",
    "ownershipStatus",
    "progressStatus",
    "priority",
    "playtimeMinutes",
    "completionPercent",
    "personalRating",
    "genres",
    "estimatedTime",
    "difficulty",
    "releaseYear",
    "developer",
    "publisher",
    "notes",
  ];

  const rows = records.map((record) =>
    headers
      .map((header) => escapeCsv((record as unknown as Record<string, string | number | undefined>)[header]))
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
export function recordToImportPayload(record: { game: DbGameMetadata; libraryEntry: DbLibraryEntry }): ImportPayload {
  const { game, libraryEntry } = record;
  return {
    title: game.title,
    platform: libraryEntry.platform,
    sourceStore: libraryEntry.sourceStore,
    format: libraryEntry.format,
    ownershipStatus: libraryEntry.ownershipStatus,
    progressStatus: libraryEntry.progressStatus,
    playtimeMinutes: libraryEntry.playtimeMinutes,
    completionPercent: libraryEntry.completionPercent,
    priority: libraryEntry.priority,
    personalRating: libraryEntry.personalRating,
    notes: libraryEntry.notes,
    rawgId: game.rawgId,
    genres: game.genres,
    checklist: libraryEntry.checklist,
    estimatedTime: game.estimatedTime,
    mood: libraryEntry.mood,
    difficulty: game.difficulty,
    releaseYear: game.releaseYear,
    favorite: libraryEntry.favorite,
    coverUrl: game.coverUrl,
    developer: game.developer,
    publisher: game.publisher,
  };
}

function progressStatusWeight(status: ProgressStatus): number {
  switch (status) {
    case "completed_100": return 6;
    case "finished": return 5;
    case "playing": return 4;
    case "paused": return 3;
    case "replay_later": return 2;
    case "abandoned": return 1;
    case "archived": return 0;
    default: return 2;
  }
}

function priorityWeight(priority: Priority): number {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function mergeOwnershipStatus(current: OwnershipStatus, incoming: OwnershipStatus): OwnershipStatus {
  if (current === "owned" || incoming === "owned") return "owned";
  if (current === "subscription" || incoming === "subscription") return "subscription";
  if (current === "borrowed" || incoming === "borrowed") return "borrowed";
  if (current === "emulated" || incoming === "emulated") return "emulated";
  return "wishlist";
}

function pickProgressStatus(left: ProgressStatus, right: ProgressStatus, completionPercent: number): ProgressStatus {
  if (completionPercent >= 100) return "finished";
  return progressStatusWeight(right) > progressStatusWeight(left) ? right : left;
}

function mergeImportPayloads(current: ImportPayload, incoming: ImportPayload): ImportPayload {
  const completionPercent = Math.max(current.completionPercent || 0, incoming.completionPercent || 0);
  return {
    ...current,
    ...incoming,
    title: current.title || incoming.title,
    platform: incoming.platform || current.platform,
    sourceStore: incoming.sourceStore || current.sourceStore,
    format: incoming.format || current.format,
    ownershipStatus: mergeOwnershipStatus(current.ownershipStatus, incoming.ownershipStatus),
    progressStatus: pickProgressStatus(current.progressStatus, incoming.progressStatus, completionPercent),
    playtimeMinutes: Math.max(current.playtimeMinutes || 0, incoming.playtimeMinutes || 0),
    completionPercent,
    priority: priorityWeight(incoming.priority) > priorityWeight(current.priority) ? incoming.priority : current.priority,
    personalRating: incoming.personalRating ?? current.personalRating,
    notes: incoming.notes || current.notes,
    rawgId: incoming.rawgId ?? current.rawgId,
    genres: incoming.genres || current.genres,
    checklist: incoming.checklist || current.checklist,
    estimatedTime: incoming.estimatedTime || current.estimatedTime,
    mood: incoming.mood || current.mood,
    difficulty: incoming.difficulty || current.difficulty,
    releaseYear: incoming.releaseYear ?? current.releaseYear,
    favorite: current.favorite ?? incoming.favorite,
    coverUrl: incoming.coverUrl || current.coverUrl,
    developer: incoming.developer || current.developer,
    publisher: incoming.publisher || current.publisher,
  };
}

export function buildImportPreview(parsed: ImportPayload[], existingRecords: Array<{ game: DbGameMetadata; libraryEntry: DbLibraryEntry }>): ImportPreviewEntry[] {
  const existingMap = new Map(
    existingRecords.map((record) => [createImportKey(record.game.title, record.libraryEntry.platform), record]),
  );
  const previewMap = new Map<string, ImportPreviewEntry>();

  for (const item of parsed) {
    const key = createImportKey(item.title, item.platform);
    const current = previewMap.get(key);
    if (current) {
      current.payload = mergeImportPayloads(current.payload, item);
      current.duplicateCount += 1;
      continue;
    }

    const existing = existingMap.get(key);
    previewMap.set(key, {
      id: `${key}-${previewMap.size + 1}`,
      key,
      payload: item,
      status: existing ? "existing" : "new",
      action: existing ? "update" : "create",
      existingId: existing?.libraryEntry.id,
      existingTitle: existing?.game.title,
      duplicateCount: 0,
    });
  }

  return Array.from(previewMap.values()).sort((left, right) => {
    if (left.status !== right.status) return left.status === "new" ? -1 : 1;
    return left.payload.title.localeCompare(right.payload.title, "pt-BR");
  });
}

export function createDbGameFromImport(item: ImportPayload, currentGame?: DbGameMetadata, currentEntry?: DbLibraryEntry): { game: DbGameMetadata; libraryEntry: DbLibraryEntry } {
  const now = new Date().toISOString();
  return {
    game: {
      id: currentGame?.id,
      title: item.title.trim(),
      normalizedTitle: normalizeGameTitle(item.title),
      slug: currentGame?.slug,
      coverUrl: item.coverUrl || currentGame?.coverUrl,
      rawgId: item.rawgId ?? currentGame?.rawgId,
      genres: item.genres || currentGame?.genres,
      estimatedTime: item.estimatedTime || currentGame?.estimatedTime || (item.playtimeMinutes ? `${Math.max(1, Math.round(item.playtimeMinutes / 60))}h` : "Sem dado"),
      difficulty: item.difficulty || currentGame?.difficulty || "Média",
      releaseYear: item.releaseYear ?? currentGame?.releaseYear,
      platforms: mergePlatformList(currentGame?.platforms, item.platform),
      developer: item.developer || currentGame?.developer,
      publisher: item.publisher || currentGame?.publisher,
      createdAt: currentGame?.createdAt || now,
      updatedAt: now,
    },
    libraryEntry: {
      id: currentEntry?.id,
      gameId: currentGame?.id as number,
      platform: item.platform.trim() || currentEntry?.platform || "PC",
      sourceStore: item.sourceStore || currentEntry?.sourceStore || "Importado",
      edition: currentEntry?.edition,
      format: item.format || currentEntry?.format || "digital",
      ownershipStatus: item.ownershipStatus || currentEntry?.ownershipStatus || "owned",
      progressStatus: item.progressStatus || currentEntry?.progressStatus || "not_started",
      purchaseDate: currentEntry?.purchaseDate,
      pricePaid: currentEntry?.pricePaid,
      playtimeMinutes: Math.max(item.playtimeMinutes || 0, currentEntry?.playtimeMinutes || 0),
      completionPercent: Math.max(item.completionPercent || 0, currentEntry?.completionPercent || 0),
      priority: item.priority || currentEntry?.priority || "medium",
      personalRating: item.personalRating ?? currentEntry?.personalRating,
      notes: item.notes || currentEntry?.notes,
      checklist: item.checklist || currentEntry?.checklist,
      mood: item.mood || currentEntry?.mood || "Importado",
      favorite: item.favorite ?? currentEntry?.favorite ?? item.priority === "high",
      lastSessionAt: currentEntry?.lastSessionAt,
      createdAt: currentEntry?.createdAt || now,
      updatedAt: now,
    },
  };
}

export function mergeImportedGame(existing: { game: DbGameMetadata; libraryEntry: DbLibraryEntry }, incoming: ImportPayload): { game: DbGameMetadata; libraryEntry: DbLibraryEntry } {
  const merged = createDbGameFromImport(incoming, existing.game, existing.libraryEntry);
  const completionPercent = Math.max(existing.libraryEntry.completionPercent || 0, incoming.completionPercent || 0);
  const priority = priorityWeight(incoming.priority) > priorityWeight(existing.libraryEntry.priority) ? incoming.priority : existing.libraryEntry.priority;

  return {
    game: {
      ...existing.game,
      ...merged.game,
      normalizedTitle: normalizeGameTitle(incoming.title || existing.game.title),
      platforms: mergePlatformList(existing.game.platforms, incoming.platform),
      updatedAt: new Date().toISOString(),
    },
    libraryEntry: {
      ...existing.libraryEntry,
      ...merged.libraryEntry,
      gameId: existing.game.id ?? merged.libraryEntry.gameId,
      ownershipStatus: mergeOwnershipStatus(existing.libraryEntry.ownershipStatus, incoming.ownershipStatus),
      progressStatus: pickProgressStatus(existing.libraryEntry.progressStatus, incoming.progressStatus, completionPercent),
      completionPercent,
      playtimeMinutes: Math.max(existing.libraryEntry.playtimeMinutes || 0, incoming.playtimeMinutes || 0),
      priority,
      favorite: Boolean(existing.libraryEntry.favorite || incoming.favorite || priority === "high"),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function buildRestorePreview(
  payload: BackupPayload,
  mode: RestoreMode,
  tables: {
    games: DbGameMetadata[];
    libraryEntries: DbLibraryEntry[];
    playSessions: DbPlaySession[];
    reviews: DbReview[];
    lists: DbList[];
    tags: DbTag[];
    gameTags: Array<{ libraryEntryId: number; tagId: number }>;
    goals: DbGoal[];
  },
): RestorePreview {
  const { games, libraryEntries, playSessions, reviews, lists, tags, gameTags, goals } = tables;

  const currentGames = games;
  const currentEntries = libraryEntries;
  const currentSessions = new Set(playSessions.map((s) => `${s.libraryEntryId}::${s.date}::${s.durationMinutes}::${(s.note || "").trim().toLowerCase()}::${s.completionPercent ?? ""}`));
  const currentReviewsByEntry = new Map(reviews.map((r) => [r.libraryEntryId, r]));
  const currentListsByName = new Map(lists.map((l) => [l.name.trim().toLowerCase(), l]));
  const currentTagsByName = new Map(tags.map((t) => [t.name.trim().toLowerCase(), t]));
  const currentGameTags = new Set(gameTags.map((gt) => `${gt.libraryEntryId}::${gt.tagId}`));
  const currentGoalsByKey = new Map(goals.map((g) => [`${g.type}::${g.period}`, g]));
  const currentEntryByKey = new Map(
    composeLibraryRecords(currentGames, currentEntries).map((record) => [
      createImportKey(record.game.title, record.libraryEntry.platform),
      record.libraryEntry,
    ]),
  );

  const payloadGamesById = new Map(payload.games.map((game) => [game.id, game]));
  const resolvedEntryIdByPayloadId = new Map<number, number>();
  const resolvedTagIdByPayloadId = new Map<number, number>();

  let gameCreate = 0;
  let gameUpdate = 0;
  let gameSkip = 0;
  const currentGamesByName = new Map(currentGames.map((game) => [game.normalizedTitle, game]));
  for (const game of payload.games) {
    if (currentGamesByName.has(normalizeGameTitle(game.title))) gameUpdate += 1;
    else gameCreate += 1;
  }

  let entryCreate = 0;
  let entryUpdate = 0;
  let entrySkip = 0;
  const seenEntryKeys = new Set<string>();
  for (const entry of payload.libraryEntries) {
    const payloadGame = payloadGamesById.get(entry.gameId);
    const title = payloadGame?.title;
    if (!title) {
      entrySkip += 1;
      continue;
    }
    const key = createImportKey(title, entry.platform);
    if (seenEntryKeys.has(key)) {
      entrySkip += 1;
      continue;
    }
    seenEntryKeys.add(key);
    const existing = currentEntryByKey.get(key);
    if (existing?.id != null && entry.id != null) resolvedEntryIdByPayloadId.set(entry.id, existing.id);
    if (existing) entryUpdate += 1;
    else entryCreate += 1;
  }

  let sessionCreate = 0;
  let sessionSkip = 0;
  for (const session of payload.playSessions) {
    const targetEntryId = resolvedEntryIdByPayloadId.get(session.libraryEntryId);
    if (!targetEntryId) {
      sessionSkip += 1;
      continue;
    }
    const signature = `${targetEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`;
    if (currentSessions.has(signature)) sessionSkip += 1;
    else sessionCreate += 1;
  }

  let reviewCreate = 0;
  let reviewUpdate = 0;
  let reviewSkip = 0;
  const seenReviewEntries = new Set<number>();
  for (const review of payload.reviews) {
    const targetEntryId = resolvedEntryIdByPayloadId.get(review.libraryEntryId);
    if (!targetEntryId || seenReviewEntries.has(targetEntryId)) {
      reviewSkip += 1;
      continue;
    }
    seenReviewEntries.add(targetEntryId);
    if (currentReviewsByEntry.has(targetEntryId)) reviewUpdate += 1;
    else reviewCreate += 1;
  }

  let listCreate = 0;
  let listUpdate = 0;
  let listSkip = 0;
  const seenLists = new Set<string>();
  for (const list of payload.lists) {
    const key = list.name.trim().toLowerCase();
    if (!key || seenLists.has(key)) {
      listSkip += 1;
      continue;
    }
    seenLists.add(key);
    if (currentListsByName.has(key)) listUpdate += 1;
    else listCreate += 1;
  }

  let tagCreate = 0;
  let tagUpdate = 0;
  let tagSkip = 0;
  const seenTags = new Set<string>();
  for (const tag of payload.tags) {
    const key = tag.name.trim().toLowerCase();
    if (!key || seenTags.has(key)) {
      tagSkip += 1;
      continue;
    }
    seenTags.add(key);
    const existing = currentTagsByName.get(key);
    if (existing?.id != null && tag.id != null) resolvedTagIdByPayloadId.set(tag.id, existing.id);
    if (existing) tagUpdate += 1;
    else tagCreate += 1;
  }

  let gameTagCreate = 0;
  let gameTagSkip = 0;
  const seenPairs = new Set<string>();
  for (const entry of payload.gameTags) {
    const targetEntryId = resolvedEntryIdByPayloadId.get(entry.libraryEntryId);
    const targetTagId = resolvedTagIdByPayloadId.get(entry.tagId);
    if (!targetEntryId || !targetTagId) {
      gameTagSkip += 1;
      continue;
    }
    const key = `${targetEntryId}::${targetTagId}`;
    if (currentGameTags.has(key) || seenPairs.has(key)) gameTagSkip += 1;
    else {
      seenPairs.add(key);
      gameTagCreate += 1;
    }
  }

  let goalCreate = 0;
  let goalUpdate = 0;
  let goalSkip = 0;
  const seenGoals = new Set<string>();
  for (const goal of payload.goals) {
    const key = `${goal.type}::${goal.period}`;
    if (seenGoals.has(key)) {
      goalSkip += 1;
      continue;
    }
    seenGoals.add(key);
    if (currentGoalsByKey.has(key)) goalUpdate += 1;
    else goalCreate += 1;
  }

  return {
    mode,
    payload,
    exportedAt: payload.exportedAt,
    source: payload.source,
    items: [
      { label: "Jogos", create: gameCreate, update: gameUpdate, skip: gameSkip },
      { label: "Biblioteca", create: entryCreate, update: entryUpdate, skip: entrySkip },
      { label: "Sessões", create: sessionCreate, update: 0, skip: sessionSkip },
      { label: "Reviews", create: reviewCreate, update: reviewUpdate, skip: reviewSkip },
      { label: "Listas", create: listCreate, update: listUpdate, skip: listSkip },
      { label: "Tags", create: tagCreate, update: tagUpdate, skip: tagSkip },
      { label: "Relacoes tag", create: gameTagCreate, update: 0, skip: gameTagSkip },
      { label: "Metas", create: goalCreate, update: goalUpdate, skip: goalSkip },
    ],
  };
}
export function parseBackupText(text: string): BackupPayload | null {
  try {
    const data = JSON.parse(text);
    if (
      typeof data !== "object" ||
      data === null ||
      typeof data.version !== "number" ||
      typeof data.exportedAt !== "string" ||
      !Array.isArray(data.games) ||
      !Array.isArray(data.libraryEntries)
    ) {
      return null;
    }
    return {
      ...data,
      playSessions: Array.isArray(data.playSessions) ? data.playSessions : [],
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
      lists: Array.isArray(data.lists) ? data.lists : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      gameTags: Array.isArray(data.gameTags) ? data.gameTags : [],
      goals: Array.isArray(data.goals) ? data.goals : [],
    };
  } catch {
    return null;
  }
}
