import type {
  Game as DbGameMetadata,
  GamePlatform as DbGamePlatform,
  LibraryEntry as DbLibraryEntry,
  LibraryEntryStore as DbLibraryEntryStore,
  LibraryEntryList as DbLibraryEntryList,
  Platform as DbPlatform,
  PlaySession as DbPlaySession,
  Goal as DbGoal,
  List as DbList,
  Review as DbReview,
  SavedView as DbSavedView,
  Setting as DbSetting,
  Store as DbStore,
  Tag as DbTag,
  OwnershipStatus,
  Priority,
  ProgressStatus,
} from "../../../core/types";
import { deriveCompletionDate } from "../../../core/catalogIntegrity";
import { getPrimaryCsvToken, mergePlatformList, normalizeGameTitle, splitCsvTokens, toDateInputValue } from "../../../core/utils";
import { composeLibraryRecords } from "../../library/utils";
import { buildStructuredTablesFromLegacy } from "../../../core/structuredTables";
import type {
  BackupPayload,
  ImportGameCandidate,
  ImportMatchCandidate,
  ImportPayload,
  ImportPreviewEntry,
  ImportRawgCandidate,
  ImportSource,
  RestoreMode,
  RestorePreview,
} from "../../../backlog/shared";

type ImportDefaults = {
  platform?: string;
  sourceStore?: string;
};

function parseOptionalDate(value: string | undefined): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  try {
    return toDateInputValue(raw);
  } catch {
    return undefined;
  }
}

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

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
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
  const parsed = Number(String(raw).replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function parseHoursToMinutes(raw: string | number | undefined): number {
  const parsed = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 60)) : 0;
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

function defaultPayload(title: string, defaults?: ImportDefaults): ImportPayload {
  const platform = defaults?.platform || "PC";
  const sourceStore = defaults?.sourceStore || "Manual";
  return {
    title,
    platform,
    sourceStore,
    platforms: splitCsvTokens(platform),
    stores: splitCsvTokens(sourceStore),
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "not_started",
    playtimeMinutes: 0,
    completionPercent: 0,
    priority: "medium",
  };
}

function defaultStoreForSource(source: ImportSource, defaults?: ImportDefaults): string {
  if (defaults?.sourceStore?.trim()) return defaults.sourceStore.trim();
  if (source === "steam") return "Steam";
  if (source === "playnite") return "Playnite";
  return "CSV";
}

function applyImportDefaults(payload: ImportPayload, defaults?: ImportDefaults): ImportPayload {
  const platform = payload.platform.trim() || defaults?.platform || "PC";
  const sourceStore = payload.sourceStore.trim() || defaults?.sourceStore || "Manual";
  return {
    ...payload,
    platform,
    sourceStore,
    platforms: splitCsvTokens(payload.platforms && payload.platforms.length > 0 ? payload.platforms : platform),
    stores: splitCsvTokens(payload.stores && payload.stores.length > 0 ? payload.stores : sourceStore),
  };
}

function fromCsvRows(rows: Array<Record<string, string>>, source: ImportSource, defaults?: ImportDefaults): ImportPayload[] {
  const fallbackStore = defaultStoreForSource(source, defaults);
  return rows
    .map((row) => {
      const title = row.title || row.name;
      if (!title) return null;

      const payload = defaultPayload(title, defaults);
      payload.platform = row.platform || row.plataforma || getPrimaryCsvToken(row.platforms || row.plataformas, payload.platform);
      payload.platforms = splitCsvTokens(row.platforms || row.plataformas || payload.platform);
      payload.sourceStore = row.sourcestore || row.loja || row.source || getPrimaryCsvToken(row.stores || row.lojas, fallbackStore);
      payload.stores = splitCsvTokens(row.stores || row.lojas || payload.sourceStore);
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
      payload.completionDate = parseOptionalDate(row.completiondate || row.dataconclusao || row.finishedat);
      payload.coverUrl = row.coverurl || row.cover || undefined;
      payload.developer = row.developer || row.studio || undefined;
      payload.publisher = row.publisher || row.publishers || undefined;
      return applyImportDefaults(payload, defaults);
    })
    .filter((value): value is ImportPayload => Boolean(value));
}

export function parseImportText(source: ImportSource, text: string, defaults?: ImportDefaults): ImportPayload[] {
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

        const payload = defaultPayload(title, defaults);
        payload.platform =
          getPrimaryCsvToken(
            String(item.platform ?? item.platforms ?? item.Platforms ?? payload.platform),
            payload.platform,
          ) ||
          payload.platform;
        payload.platforms = splitCsvTokens(
          Array.isArray(item.platforms)
            ? item.platforms.map((value) => String(value))
            : String(item.platforms ?? item.Platforms ?? payload.platform),
        );
        payload.sourceStore = String(
          item.sourceStore ??
            item.store ??
            item.Source ??
            getPrimaryCsvToken(
              Array.isArray(item.stores) ? item.stores.map((value) => String(value)) : String(item.stores ?? ""),
              defaultStoreForSource(source, defaults),
            ),
        );
        payload.stores = splitCsvTokens(
          Array.isArray(item.stores)
            ? item.stores.map((value) => String(value))
            : String(item.stores ?? payload.sourceStore),
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
        payload.completionDate = parseOptionalDate(String(item.completionDate ?? item.finishedAt ?? ""));
        payload.coverUrl = String(item.coverUrl ?? item.background_image ?? "") || undefined;
        payload.developer = String(item.developer ?? item.Developer ?? "") || undefined;
        payload.publisher = String(item.publisher ?? item.Publisher ?? "") || undefined;
        return applyImportDefaults(payload, defaults);
      })
      .filter((value): value is ImportPayload => Boolean(value));
  }

  const rows = parseCsvRows(trimmed);
  return fromCsvRows(rows, source, defaults);
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
    "platforms",
    "sourceStore",
    "stores",
    "ownershipStatus",
    "progressStatus",
    "priority",
    "playtimeMinutes",
    "completionPercent",
    "completionDate",
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
    platforms: splitCsvTokens(game.platforms),
    sourceStore: libraryEntry.sourceStore,
    stores: splitCsvTokens(libraryEntry.sourceStore),
    format: libraryEntry.format,
    ownershipStatus: libraryEntry.ownershipStatus,
    progressStatus: libraryEntry.progressStatus,
    playtimeMinutes: libraryEntry.playtimeMinutes,
    completionPercent: libraryEntry.completionPercent,
    completionDate: libraryEntry.completionDate,
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
    case "completed_100":
      return 6;
    case "finished":
      return 5;
    case "playing":
      return 4;
    case "paused":
      return 3;
    case "replay_later":
      return 2;
    case "abandoned":
      return 1;
    case "archived":
      return 0;
    default:
      return 2;
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
  const progressStatus = pickProgressStatus(current.progressStatus, incoming.progressStatus, completionPercent);
  return {
    ...current,
    ...incoming,
    title: current.title || incoming.title,
    platform: getPrimaryCsvToken([current.platform, incoming.platform], current.platform || incoming.platform || "PC"),
    platforms: splitCsvTokens([...(current.platforms ?? []), ...(incoming.platforms ?? []), current.platform, incoming.platform]),
    sourceStore: getPrimaryCsvToken(
      [current.sourceStore, incoming.sourceStore],
      current.sourceStore || incoming.sourceStore || "Manual",
    ),
    stores: splitCsvTokens([...(current.stores ?? []), ...(incoming.stores ?? []), current.sourceStore, incoming.sourceStore]),
    format: incoming.format || current.format,
    ownershipStatus: mergeOwnershipStatus(current.ownershipStatus, incoming.ownershipStatus),
    progressStatus,
    playtimeMinutes: Math.max(current.playtimeMinutes || 0, incoming.playtimeMinutes || 0),
    completionPercent,
    completionDate: deriveCompletionDate({
      currentCompletionDate: current.completionDate ?? incoming.completionDate,
      completionPercent,
      progressStatus,
      completedAt: incoming.completionDate,
    }),
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

function createMatchCandidate(record: { game: DbGameMetadata; libraryEntry: DbLibraryEntry }, confidence: "exact" | "title"): ImportMatchCandidate {
  return {
    entryId: record.libraryEntry.id ?? 0,
    title: record.game.title,
    platform: record.libraryEntry.platform,
    sourceStore: record.libraryEntry.sourceStore,
    confidence,
  };
}

function createGameCandidate(record: { game: DbGameMetadata; libraryEntry: DbLibraryEntry }, confidence: "exact" | "metadata"): ImportGameCandidate {
  return {
    gameId: record.game.id ?? 0,
    title: record.game.title,
    releaseYear: record.game.releaseYear,
    platforms: String(record.game.platforms || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    developer: record.game.developer,
    publisher: record.game.publisher,
    confidence,
  };
}

export function buildImportPreview(
  parsed: ImportPayload[],
  existingRecords: Array<{ game: DbGameMetadata; libraryEntry: DbLibraryEntry }>,
): ImportPreviewEntry[] {
  const existingExactMap = new Map(
    existingRecords.map((record) => [createImportKey(record.game.title, record.libraryEntry.platform), record] as const),
  );
  const existingByTitle = new Map<string, Array<{ game: DbGameMetadata; libraryEntry: DbLibraryEntry }>>();
  const uniqueGamesByTitle = new Map<string, Map<number, ImportGameCandidate>>();
  for (const record of existingRecords) {
    const normalizedTitle = normalizeGameTitle(record.game.title);
    const current = existingByTitle.get(normalizedTitle) ?? [];
    current.push(record);
    existingByTitle.set(normalizedTitle, current);

    const currentGames = uniqueGamesByTitle.get(normalizedTitle) ?? new Map<number, ImportGameCandidate>();
    if ((record.game.id ?? 0) > 0 && !currentGames.has(record.game.id!)) {
      currentGames.set(record.game.id!, createGameCandidate(record, "metadata"));
    }
    uniqueGamesByTitle.set(normalizedTitle, currentGames);
  }

  const previewMap = new Map<string, ImportPreviewEntry>();

  for (const item of parsed) {
    const key = createImportKey(item.title, item.platform);
    const current = previewMap.get(key);
    if (current) {
      current.payload = mergeImportPayloads(current.payload, item);
      current.duplicateCount += 1;
      continue;
    }

    const exactRecord = existingExactMap.get(key);
    const normalizedTitle = normalizeGameTitle(item.title);
    const titleCandidates = (existingByTitle.get(normalizedTitle) ?? [])
      .map((record) =>
        exactRecord?.libraryEntry.id === record.libraryEntry.id ? createMatchCandidate(record, "exact") : createMatchCandidate(record, "title"),
      )
      .filter((candidate) => candidate.entryId > 0);
    const gameCandidates = Array.from(uniqueGamesByTitle.get(normalizedTitle)?.values() ?? []).map((candidate) =>
      exactRecord?.game.id === candidate.gameId ? { ...candidate, confidence: "exact" as const } : candidate,
    );

    const hasExactMatch = exactRecord?.libraryEntry.id != null;
    const reviewReasons: string[] = [];
    if (hasExactMatch) reviewReasons.push("Já existe uma entrada com o mesmo título e plataforma.");
    if (!hasExactMatch && titleCandidates.length > 0) {
      reviewReasons.push("Há entradas parecidas na biblioteca que podem ser atualizadas.");
    }
    if (!hasExactMatch && gameCandidates.length > 0) {
      reviewReasons.push("O catálogo já possui metadado deste jogo; você pode só vincular uma nova entrada.");
    }
    if (item.coverUrl || item.genres || item.developer || item.publisher || item.releaseYear) {
      reviewReasons.push("A importação já traz metadado útil para enriquecer o catálogo.");
    }

    const selectedGameId =
      !hasExactMatch && titleCandidates.length === 0 && gameCandidates.length === 1 ? gameCandidates[0]?.gameId ?? null : null;
    const suggestedAction = hasExactMatch ? "update" : "create";
    previewMap.set(key, {
      id: `${key}-${previewMap.size + 1}`,
      key,
      payload: item,
      status: hasExactMatch ? "existing" : titleCandidates.length > 0 ? "review" : "new",
      action: suggestedAction,
      suggestedAction,
      existingId: exactRecord?.libraryEntry.id,
      existingTitle: exactRecord?.game.title,
      duplicateCount: 0,
      matchCandidates: titleCandidates,
      selectedMatchId: exactRecord?.libraryEntry.id ?? null,
      gameCandidates,
      selectedGameId,
      rawgCandidates: [],
      selectedRawgId: null,
      enrichmentStatus: "idle",
      reviewReasons,
    });
  }

  return Array.from(previewMap.values()).sort((left, right) => {
    const statusRank = { new: 0, review: 1, existing: 2 };
    if (left.status !== right.status) return statusRank[left.status] - statusRank[right.status];
    return left.payload.title.localeCompare(right.payload.title, "pt-BR");
  });
}

export function attachRawgCandidatesToPreview(
  preview: ImportPreviewEntry[],
  candidateMap: Map<string, ImportRawgCandidate[]>,
): ImportPreviewEntry[] {
  return preview.map((entry) => {
    const candidates = candidateMap.get(entry.key) ?? [];
    const bestCandidate = candidates[0];
    const selectedRawgId = bestCandidate && bestCandidate.score >= 88 ? bestCandidate.rawgId : entry.selectedRawgId;

    return {
      ...entry,
      rawgCandidates: candidates,
      selectedRawgId,
      enrichmentStatus:
        candidates.length === 0
          ? "missing"
          : selectedRawgId != null
            ? "matched"
            : "ambiguous",
    };
  });
}

export function createDbGameFromImport(
  item: ImportPayload,
  currentGame?: DbGameMetadata,
  currentEntry?: DbLibraryEntry,
): { game: DbGameMetadata; libraryEntry: DbLibraryEntry } {
  const now = new Date().toISOString();
  const platforms = splitCsvTokens([...(item.platforms ?? []), item.platform]);
  const stores = splitCsvTokens([...(item.stores ?? []), item.sourceStore]);
  const progressStatus = item.progressStatus || currentEntry?.progressStatus || "not_started";
  const completionPercent = Math.max(item.completionPercent || 0, currentEntry?.completionPercent || 0);
  return {
    game: {
      id: currentGame?.id,
      title: item.title.trim(),
      normalizedTitle: normalizeGameTitle(item.title),
      slug: currentGame?.slug,
      coverUrl: item.coverUrl || currentGame?.coverUrl,
      rawgId: item.rawgId ?? currentGame?.rawgId,
      genres: item.genres || currentGame?.genres,
      estimatedTime:
        item.estimatedTime ||
        currentGame?.estimatedTime ||
        (item.playtimeMinutes ? `${Math.max(1, Math.round(item.playtimeMinutes / 60))}h` : "Sem dado"),
      difficulty: item.difficulty || currentGame?.difficulty || "Média",
      releaseYear: item.releaseYear ?? currentGame?.releaseYear,
      platforms: mergePlatformList(currentGame?.platforms, platforms.join(", ")),
      developer: item.developer || currentGame?.developer,
      publisher: item.publisher || currentGame?.publisher,
      createdAt: currentGame?.createdAt || now,
      updatedAt: now,
    },
    libraryEntry: {
      id: currentEntry?.id,
      gameId: currentGame?.id as number,
      platform: getPrimaryCsvToken(platforms, currentEntry?.platform || "PC"),
      sourceStore: getPrimaryCsvToken(stores, currentEntry?.sourceStore || "Importado"),
      edition: currentEntry?.edition,
      format: item.format || currentEntry?.format || "digital",
      ownershipStatus: item.ownershipStatus || currentEntry?.ownershipStatus || "owned",
      progressStatus,
      purchaseDate: currentEntry?.purchaseDate,
      pricePaid: currentEntry?.pricePaid,
      playtimeMinutes: Math.max(item.playtimeMinutes || 0, currentEntry?.playtimeMinutes || 0),
      completionPercent,
      priority: item.priority || currentEntry?.priority || "medium",
      personalRating: item.personalRating ?? currentEntry?.personalRating,
      notes: item.notes || currentEntry?.notes,
      checklist: item.checklist || currentEntry?.checklist,
      mood: item.mood || currentEntry?.mood || "Importado",
      favorite: item.favorite ?? currentEntry?.favorite ?? item.priority === "high",
      lastSessionAt: currentEntry?.lastSessionAt,
      completionDate: deriveCompletionDate({
        currentCompletionDate: currentEntry?.completionDate ?? item.completionDate,
        completionPercent,
        progressStatus,
        completedAt: item.completionDate ?? currentEntry?.lastSessionAt,
        fallbackDate: now,
      }),
      createdAt: currentEntry?.createdAt || now,
      updatedAt: now,
    },
  };
}

export function mergeImportedGame(
  existing: { game: DbGameMetadata; libraryEntry: DbLibraryEntry },
  incoming: ImportPayload,
): { game: DbGameMetadata; libraryEntry: DbLibraryEntry } {
  const merged = createDbGameFromImport(incoming, existing.game, existing.libraryEntry);
  const completionPercent = Math.max(existing.libraryEntry.completionPercent || 0, incoming.completionPercent || 0);
  const priority = priorityWeight(incoming.priority) > priorityWeight(existing.libraryEntry.priority)
    ? incoming.priority
    : existing.libraryEntry.priority;
  const progressStatus = pickProgressStatus(existing.libraryEntry.progressStatus, incoming.progressStatus, completionPercent);
  const completionDate = deriveCompletionDate({
    currentCompletionDate: existing.libraryEntry.completionDate ?? incoming.completionDate,
    completionPercent,
    progressStatus,
    completedAt: incoming.completionDate ?? existing.libraryEntry.lastSessionAt,
    fallbackDate: new Date().toISOString(),
  });

  return {
    game: {
      ...existing.game,
      ...merged.game,
      normalizedTitle: normalizeGameTitle(incoming.title || existing.game.title),
      platforms: mergePlatformList(
        existing.game.platforms,
        splitCsvTokens([...(incoming.platforms ?? []), incoming.platform]).join(", "),
      ),
      updatedAt: new Date().toISOString(),
    },
    libraryEntry: {
      ...existing.libraryEntry,
      ...merged.libraryEntry,
      gameId: existing.game.id ?? merged.libraryEntry.gameId,
      ownershipStatus: mergeOwnershipStatus(existing.libraryEntry.ownershipStatus, incoming.ownershipStatus),
      progressStatus,
      completionPercent,
      completionDate,
      playtimeMinutes: Math.max(existing.libraryEntry.playtimeMinutes || 0, incoming.playtimeMinutes || 0),
      priority,
      favorite: Boolean(existing.libraryEntry.favorite || incoming.favorite || priority === "high"),
      updatedAt: new Date().toISOString(),
    },
  };
}

type RestoreTables = {
  games: DbGameMetadata[];
  libraryEntries: DbLibraryEntry[];
  stores: DbStore[];
  libraryEntryStores: DbLibraryEntryStore[];
  platforms: DbPlatform[];
  gamePlatforms: DbGamePlatform[];
  playSessions: DbPlaySession[];
  reviews: DbReview[];
  lists: DbList[];
  libraryEntryLists: DbLibraryEntryList[];
  tags: DbTag[];
  gameTags: Array<{ libraryEntryId: number; tagId: number }>;
  goals: DbGoal[];
  settings: DbSetting[];
  savedViews: DbSavedView[];
};

export function buildRestorePreview(payload: BackupPayload, mode: RestoreMode, tables: RestoreTables): RestorePreview {
  const {
    games,
    libraryEntries,
    stores,
    libraryEntryStores: currentLibraryEntryStores,
    platforms,
    gamePlatforms: currentGamePlatforms,
    playSessions,
    reviews,
    lists,
    libraryEntryLists,
    tags,
    gameTags,
    goals,
    settings,
    savedViews,
  } = tables;

  const currentSessions = new Set(
    playSessions.map(
      (session) =>
        `${session.libraryEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`,
    ),
  );
  const currentReviewsByEntry = new Map(reviews.map((review) => [review.libraryEntryId, review]));
  const currentStoresByName = new Map(stores.map((store) => [store.name.trim().toLowerCase(), store]));
  const currentPlatformsByName = new Map(platforms.map((platform) => [platform.name.trim().toLowerCase(), platform]));
  const currentLibraryEntryStoreSet = new Set(
    currentLibraryEntryStores.map((relation) => `${relation.libraryEntryId}::${relation.storeId}`),
  );
  const currentGamePlatformSet = new Set(
    currentGamePlatforms.map((relation) => `${relation.gameId}::${relation.platformId}`),
  );
  const currentListsByName = new Map(lists.map((list) => [list.name.trim().toLowerCase(), list]));
  const currentLibraryEntryLists = new Set(libraryEntryLists.map((entry) => `${entry.libraryEntryId}::${entry.listId}`));
  const currentTagsByName = new Map(tags.map((tag) => [tag.name.trim().toLowerCase(), tag]));
  const currentGameTags = new Set(gameTags.map((entry) => `${entry.libraryEntryId}::${entry.tagId}`));
  const currentGoalsByKey = new Map(goals.map((goal) => [`${goal.type}::${goal.period}`, goal]));
  const currentSettingsByKey = new Map(settings.map((setting) => [setting.key, setting]));
  const currentSavedViewsByKey = new Map(
    savedViews.map((view) => [`${view.scope}::${view.name.trim().toLowerCase()}`, view]),
  );
  const currentEntryByKey = new Map(
    composeLibraryRecords(games, libraryEntries).map((record) => [
      createImportKey(record.game.title, record.libraryEntry.platform),
      record.libraryEntry,
    ]),
  );

  const payloadGamesById = new Map(payload.games.map((game) => [game.id, game]));
  const resolvedEntryIdByPayloadId = new Map<number, number>();
  const resolvedGameIdByPayloadId = new Map<number, number>();
  const resolvedStoreIdByPayloadId = new Map<number, number>();
  const resolvedPlatformIdByPayloadId = new Map<number, number>();
  const resolvedListIdByPayloadId = new Map<number, number>();
  const resolvedTagIdByPayloadId = new Map<number, number>();

  let gameCreate = 0;
  let gameUpdate = 0;
  const gameSkip = 0;
  const currentGamesByName = new Map(games.map((game) => [game.normalizedTitle, game]));
  for (const game of payload.games) {
    const existing = currentGamesByName.get(normalizeGameTitle(game.title));
    if (existing?.id != null && game.id != null) resolvedGameIdByPayloadId.set(game.id, existing.id);
    if (existing) gameUpdate += 1;
    else {
      gameCreate += 1;
      if (game.id != null) resolvedGameIdByPayloadId.set(game.id, game.id);
    }
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
    else {
      entryCreate += 1;
      if (entry.id != null) resolvedEntryIdByPayloadId.set(entry.id, entry.id);
    }
  }

  let sessionCreate = 0;
  let sessionSkip = 0;
  for (const session of payload.playSessions) {
    const targetEntryId = resolvedEntryIdByPayloadId.get(session.libraryEntryId);
    if (!targetEntryId) {
      sessionSkip += 1;
      continue;
    }
    const signature =
      `${targetEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`;
    if (currentSessions.has(signature)) sessionSkip += 1;
    else sessionCreate += 1;
  }

  let storeCreate = 0;
  let storeUpdate = 0;
  let storeSkip = 0;
  const seenStores = new Set<string>();
  for (const store of payload.stores) {
    const key = store.name.trim().toLowerCase();
    if (!key || seenStores.has(key)) {
      storeSkip += 1;
      continue;
    }
    seenStores.add(key);
    const existing = currentStoresByName.get(key);
    if (existing?.id != null && store.id != null) resolvedStoreIdByPayloadId.set(store.id, existing.id);
    if (existing) storeUpdate += 1;
    else {
      storeCreate += 1;
      if (store.id != null) resolvedStoreIdByPayloadId.set(store.id, store.id);
    }
  }

  let platformCreate = 0;
  let platformUpdate = 0;
  let platformSkip = 0;
  const seenPlatforms = new Set<string>();
  for (const platform of payload.platforms) {
    const key = platform.name.trim().toLowerCase();
    if (!key || seenPlatforms.has(key)) {
      platformSkip += 1;
      continue;
    }
    seenPlatforms.add(key);
    const existing = currentPlatformsByName.get(key);
    if (existing?.id != null && platform.id != null) resolvedPlatformIdByPayloadId.set(platform.id, existing.id);
    if (existing) platformUpdate += 1;
    else {
      platformCreate += 1;
      if (platform.id != null) resolvedPlatformIdByPayloadId.set(platform.id, platform.id);
    }
  }

  let libraryEntryStoreCreate = 0;
  let libraryEntryStoreSkip = 0;
  const seenLibraryEntryStoreRelations = new Set<string>();
  for (const relation of payload.libraryEntryStores) {
    const libraryEntryId = resolvedEntryIdByPayloadId.get(relation.libraryEntryId);
    const storeId = resolvedStoreIdByPayloadId.get(relation.storeId);
    if (!libraryEntryId || !storeId) {
      libraryEntryStoreSkip += 1;
      continue;
    }
    const key = `${libraryEntryId}::${storeId}`;
    if (currentLibraryEntryStoreSet.has(key) || seenLibraryEntryStoreRelations.has(key)) {
      libraryEntryStoreSkip += 1;
      continue;
    }
    seenLibraryEntryStoreRelations.add(key);
    libraryEntryStoreCreate += 1;
  }

  let gamePlatformCreate = 0;
  let gamePlatformSkip = 0;
  const seenGamePlatformRelations = new Set<string>();
  for (const relation of payload.gamePlatforms) {
    const gameId = resolvedGameIdByPayloadId.get(relation.gameId);
    const platformId = resolvedPlatformIdByPayloadId.get(relation.platformId);
    if (!gameId || !platformId) {
      gamePlatformSkip += 1;
      continue;
    }
    const key = `${gameId}::${platformId}`;
    if (currentGamePlatformSet.has(key) || seenGamePlatformRelations.has(key)) {
      gamePlatformSkip += 1;
      continue;
    }
    seenGamePlatformRelations.add(key);
    gamePlatformCreate += 1;
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
    const existing = currentListsByName.get(key);
    if (existing?.id != null && list.id != null) resolvedListIdByPayloadId.set(list.id, existing.id);
    if (existing) listUpdate += 1;
    else {
      listCreate += 1;
      if (list.id != null) resolvedListIdByPayloadId.set(list.id, list.id);
    }
  }

  let libraryEntryListCreate = 0;
  let libraryEntryListSkip = 0;
  const seenLibraryEntryLists = new Set<string>();
  for (const relation of payload.libraryEntryLists) {
    const targetEntryId = resolvedEntryIdByPayloadId.get(relation.libraryEntryId);
    const targetListId = resolvedListIdByPayloadId.get(relation.listId);
    if (!targetEntryId || !targetListId) {
      libraryEntryListSkip += 1;
      continue;
    }
    const key = `${targetEntryId}::${targetListId}`;
    if (currentLibraryEntryLists.has(key) || seenLibraryEntryLists.has(key)) {
      libraryEntryListSkip += 1;
      continue;
    }
    seenLibraryEntryLists.add(key);
    libraryEntryListCreate += 1;
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
    else {
      tagCreate += 1;
      if (tag.id != null) resolvedTagIdByPayloadId.set(tag.id, tag.id);
    }
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

  let settingCreate = 0;
  let settingUpdate = 0;
  let settingSkip = 0;
  let savedViewCreate = 0;
  let savedViewUpdate = 0;
  let savedViewSkip = 0;
  const seenSettings = new Set<string>();
  for (const setting of payload.settings) {
    const key = setting.key.trim();
    if (!key || seenSettings.has(key)) {
      settingSkip += 1;
      continue;
    }
    seenSettings.add(key);
    if (currentSettingsByKey.has(key)) settingUpdate += 1;
    else settingCreate += 1;
  }

  for (const view of payload.savedViews) {
    const key = `${view.scope}::${view.name.trim().toLowerCase()}`;
    const current = currentSavedViewsByKey.get(key);
    if (!current) savedViewCreate += 1;
    else if (
      current.query !== view.query ||
      current.statusFilter !== view.statusFilter ||
      current.listId !== view.listId ||
      current.sortBy !== view.sortBy ||
      current.sortDirection !== view.sortDirection ||
      current.groupBy !== view.groupBy
    ) {
      savedViewUpdate += 1;
    } else {
      savedViewSkip += 1;
    }
  }

  return {
    mode,
    payload,
    exportedAt: payload.exportedAt,
    source: payload.source,
    items: [
      { label: "Jogos", create: gameCreate, update: gameUpdate, skip: gameSkip },
      { label: "Biblioteca", create: entryCreate, update: entryUpdate, skip: entrySkip },
      { label: "Stores", create: storeCreate, update: storeUpdate, skip: storeSkip },
      { label: "Relações de store", create: libraryEntryStoreCreate, update: 0, skip: libraryEntryStoreSkip },
      { label: "Plataformas", create: platformCreate, update: platformUpdate, skip: platformSkip },
      { label: "Relações de plataforma", create: gamePlatformCreate, update: 0, skip: gamePlatformSkip },
      { label: "Sessões", create: sessionCreate, update: 0, skip: sessionSkip },
      { label: "Reviews", create: reviewCreate, update: reviewUpdate, skip: reviewSkip },
      { label: "Listas", create: listCreate, update: listUpdate, skip: listSkip },
      { label: "Relações de lista", create: libraryEntryListCreate, update: 0, skip: libraryEntryListSkip },
      { label: "Tags", create: tagCreate, update: tagUpdate, skip: tagSkip },
      { label: "Relações tag", create: gameTagCreate, update: 0, skip: gameTagSkip },
      { label: "Metas", create: goalCreate, update: goalUpdate, skip: goalSkip },
      { label: "Configurações", create: settingCreate, update: settingUpdate, skip: settingSkip },
      { label: "Views salvas", create: savedViewCreate, update: savedViewUpdate, skip: savedViewSkip },
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

    const games = data.games as DbGameMetadata[];
    const libraryEntries = (data.libraryEntries as DbLibraryEntry[]).map((entry) => ({
      ...entry,
      completionDate: parseOptionalDate(entry.completionDate),
    }));
    const fallbackStructuredTables = buildStructuredTablesFromLegacy({
      games,
      libraryEntries,
    });

    return {
      ...data,
      games,
      libraryEntries,
      stores:
        Array.isArray(data.stores) && data.stores.length > 0
          ? (data.stores as DbStore[])
          : fallbackStructuredTables.stores,
      libraryEntryStores:
        Array.isArray(data.libraryEntryStores) && data.libraryEntryStores.length > 0
          ? (data.libraryEntryStores as DbLibraryEntryStore[])
          : fallbackStructuredTables.libraryEntryStores,
      platforms:
        Array.isArray(data.platforms) && data.platforms.length > 0
          ? (data.platforms as DbPlatform[])
          : fallbackStructuredTables.platforms,
      gamePlatforms:
        Array.isArray(data.gamePlatforms) && data.gamePlatforms.length > 0
          ? (data.gamePlatforms as DbGamePlatform[])
          : fallbackStructuredTables.gamePlatforms,
      playSessions: Array.isArray(data.playSessions) ? data.playSessions : [],
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
      lists: Array.isArray(data.lists) ? data.lists : [],
      libraryEntryLists: Array.isArray(data.libraryEntryLists) ? data.libraryEntryLists : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      gameTags: Array.isArray(data.gameTags) ? data.gameTags : [],
      goals: Array.isArray(data.goals) ? data.goals : [],
      settings: Array.isArray(data.settings) ? data.settings : [],
      savedViews: Array.isArray(data.savedViews) ? (data.savedViews as DbSavedView[]) : [],
    };
  } catch {
    return null;
  }
}
