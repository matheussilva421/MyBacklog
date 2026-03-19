import type { BackupPayload } from "../../../backlog/shared";
import type {
  Game,
  GameTag,
  Goal,
  LibraryEntry,
  LibraryEntryList,
  List,
  PlaySession,
  Review,
  Setting,
  Tag,
} from "../../../core/types";
import { normalizeGameTitle } from "../../../core/utils";
import {
  mergeGameMetadata,
  mergeLibraryEntries,
  mergeReviewRecords,
} from "../../catalog-maintenance/utils/catalogMaintenance";
import { localOnlySyncSettingKeys } from "./syncStorage";

export type SyncTables = Omit<BackupPayload, "version" | "exportedAt" | "source">;

export type InitialSyncDecision = "idle" | "pull-cloud" | "push-local" | "match" | "conflict";

export type SyncBlockKey =
  | "games"
  | "libraryEntries"
  | "playSessions"
  | "reviews"
  | "lists"
  | "libraryEntryLists"
  | "tags"
  | "gameTags"
  | "goals"
  | "settings";

export type SyncBlockDiff = {
  key: SyncBlockKey;
  label: string;
  localCount: number;
  cloudCount: number;
  state: "same" | "local-only" | "cloud-only" | "different";
};

export type SyncComparison = {
  decision: InitialSyncDecision;
  blocks: SyncBlockDiff[];
  localFingerprint: string;
  cloudFingerprint: string | null;
  hasCloudSnapshot: boolean;
  cloudExportedAt: string | null;
};

const syncBlockLabels: Record<SyncBlockKey, string> = {
  games: "Jogos",
  libraryEntries: "Biblioteca",
  playSessions: "Sessões",
  reviews: "Reviews",
  lists: "Listas",
  libraryEntryLists: "Relações de lista",
  tags: "Tags",
  gameTags: "Relações de tag",
  goals: "Metas",
  settings: "Configurações",
};

function sortRows<T>(rows: T[]): T[] {
  return [...rows].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function buildBlockFingerprint(rows: unknown[]): string {
  return JSON.stringify(sortRows(rows));
}

function hasSyncData(tables: SyncTables) {
  return (
    tables.games.length > 0 ||
    tables.libraryEntries.length > 0 ||
    tables.playSessions.length > 0 ||
    tables.reviews.length > 0 ||
    tables.lists.length > 0 ||
    tables.libraryEntryLists.length > 0 ||
    tables.tags.length > 0 ||
    tables.gameTags.length > 0 ||
    tables.goals.length > 0 ||
    tables.settings.length > 0
  );
}

type Scoped<T> = {
  scope: "local" | "cloud";
  row: T;
};

type ScopedGame = Scoped<Game>;
type ScopedLibraryEntry = Scoped<LibraryEntry> & {
  normalizedTitle: string;
};
type ScopedList = Scoped<List>;
type ScopedTag = Scoped<Tag>;
type ScopedSession = Scoped<PlaySession>;
type ScopedReview = Scoped<Review>;
type ScopedLibraryEntryList = Scoped<LibraryEntryList>;
type ScopedGameTag = Scoped<GameTag>;

export function sanitizeSyncTables(tables: SyncTables): SyncTables {
  return {
    ...tables,
    settings: tables.settings.filter((setting) => !localOnlySyncSettingKeys.has(setting.key)),
  };
}

export function stripBackupMeta(payload: BackupPayload): SyncTables {
  return sanitizeSyncTables({
    games: payload.games,
    libraryEntries: payload.libraryEntries,
    playSessions: payload.playSessions,
    reviews: payload.reviews,
    lists: payload.lists,
    libraryEntryLists: payload.libraryEntryLists,
    tags: payload.tags,
    gameTags: payload.gameTags,
    goals: payload.goals,
    settings: payload.settings,
  });
}

export function buildSyncFingerprint(tables: SyncTables): string {
  const sanitizedTables = sanitizeSyncTables(tables);

  return JSON.stringify({
    games: sortRows(sanitizedTables.games),
    libraryEntries: sortRows(sanitizedTables.libraryEntries),
    playSessions: sortRows(sanitizedTables.playSessions),
    reviews: sortRows(sanitizedTables.reviews),
    lists: sortRows(sanitizedTables.lists),
    libraryEntryLists: sortRows(sanitizedTables.libraryEntryLists),
    tags: sortRows(sanitizedTables.tags),
    gameTags: sortRows(sanitizedTables.gameTags),
    goals: sortRows(sanitizedTables.goals),
    settings: sortRows(sanitizedTables.settings),
  });
}

export function buildBackupPayload(tables: SyncTables): BackupPayload {
  const sanitizedTables = sanitizeSyncTables(tables);

  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    source: "mybacklog",
    ...sanitizedTables,
  };
}

export function resolveInitialSyncDecision(
  localTables: SyncTables,
  cloudData: BackupPayload | null,
): {
  decision: InitialSyncDecision;
  localFingerprint: string;
  cloudFingerprint: string | null;
} {
  const sanitizedLocalTables = sanitizeSyncTables(localTables);
  const localFingerprint = buildSyncFingerprint(sanitizedLocalTables);
  const cloudTables = cloudData ? stripBackupMeta(cloudData) : null;
  const cloudFingerprint = cloudTables ? buildSyncFingerprint(cloudTables) : null;
  const localHasAnyData = hasSyncData(sanitizedLocalTables);
  const cloudHasAnyData = cloudTables ? hasSyncData(cloudTables) : false;

  if (!localHasAnyData && !cloudHasAnyData) {
    return { decision: "idle", localFingerprint, cloudFingerprint };
  }

  if (!cloudHasAnyData && localHasAnyData) {
    return { decision: "push-local", localFingerprint, cloudFingerprint };
  }

  if (cloudHasAnyData && !localHasAnyData) {
    return { decision: "pull-cloud", localFingerprint, cloudFingerprint };
  }

  if (cloudFingerprint === localFingerprint) {
    return { decision: "match", localFingerprint, cloudFingerprint };
  }

  return { decision: "conflict", localFingerprint, cloudFingerprint };
}

export function buildSyncComparison(
  localTables: SyncTables,
  cloudData: BackupPayload | null,
): SyncComparison {
  const sanitizedLocalTables = sanitizeSyncTables(localTables);
  const { decision, localFingerprint, cloudFingerprint } = resolveInitialSyncDecision(
    sanitizedLocalTables,
    cloudData,
  );
  const cloudTables = cloudData ? stripBackupMeta(cloudData) : null;

  const blocks = (Object.keys(syncBlockLabels) as SyncBlockKey[]).map((key) => {
    const localRows = sanitizedLocalTables[key];
    const cloudRows = cloudTables?.[key] ?? [];
    const localCount = localRows.length;
    const cloudCount = cloudRows.length;
    const localHash = buildBlockFingerprint(localRows);
    const cloudHash = buildBlockFingerprint(cloudRows);

    let state: SyncBlockDiff["state"] = "different";
    if (localHash === cloudHash) state = "same";
    else if (localCount > 0 && cloudCount === 0) state = "local-only";
    else if (cloudCount > 0 && localCount === 0) state = "cloud-only";

    return {
      key,
      label: syncBlockLabels[key],
      localCount,
      cloudCount,
      state,
    };
  });

  return {
    decision,
    blocks,
    localFingerprint,
    cloudFingerprint,
    hasCloudSnapshot: Boolean(cloudTables && hasSyncData(cloudTables)),
    cloudExportedAt: cloudData?.exportedAt ?? null,
  };
}

function pickNewestSettingValue(current: Setting, incoming: Setting): Setting {
  return incoming.updatedAt > current.updatedAt ? incoming : current;
}

function mergeGoals(current: Goal, incoming: Goal): Goal {
  return {
    ...current,
    target: Math.max(current.target, incoming.target),
    current: Math.max(current.current, incoming.current),
  };
}

function mergeSettingRows(rows: Setting[]): Setting[] {
  const byKey = new Map<string, Setting>();

  for (const row of rows) {
    const existing = byKey.get(row.key);
    if (!existing) {
      byKey.set(row.key, { ...row });
      continue;
    }
    byKey.set(row.key, pickNewestSettingValue(existing, row));
  }

  return Array.from(byKey.values()).sort((left, right) => left.key.localeCompare(right.key));
}

function mergeListRows(rows: ScopedList[]) {
  const groups = new Map<string, ScopedList[]>();

  for (const row of rows) {
    const key = row.row.name.trim().toLowerCase();
    if (!key) continue;
    const current = groups.get(key);
    if (current) current.push(row);
    else groups.set(key, [row]);
  }

  const mergedRows: List[] = [];
  const idMap = new Map<string, number>();
  let nextId = 1;

  for (const [, group] of Array.from(groups.entries()).sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    const primary = [...group].sort((left, right) =>
      left.row.createdAt.localeCompare(right.row.createdAt),
    )[0].row;
    const nextIdValue = nextId++;
    mergedRows.push({
      id: nextIdValue,
      name: primary.name,
      createdAt: primary.createdAt,
    });
    for (const item of group) {
      if (item.row.id != null) {
        idMap.set(`${item.scope}:${item.row.id}`, nextIdValue);
      }
    }
  }

  return { rows: mergedRows, idMap };
}

function mergeTagRows(rows: ScopedTag[]) {
  const groups = new Map<string, ScopedTag[]>();

  for (const row of rows) {
    const key = row.row.name.trim().toLowerCase();
    if (!key) continue;
    const current = groups.get(key);
    if (current) current.push(row);
    else groups.set(key, [row]);
  }

  const mergedRows: Tag[] = [];
  const idMap = new Map<string, number>();
  let nextId = 1;

  for (const [, group] of Array.from(groups.entries()).sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    const primary = [...group].sort((left, right) => left.row.name.localeCompare(right.row.name))[0]
      .row;
    const nextIdValue = nextId++;
    mergedRows.push({
      id: nextIdValue,
      name: primary.name,
    });
    for (const item of group) {
      if (item.row.id != null) {
        idMap.set(`${item.scope}:${item.row.id}`, nextIdValue);
      }
    }
  }

  return { rows: mergedRows, idMap };
}

function mergeGameRows(rows: ScopedGame[]) {
  const groups = new Map<string, ScopedGame[]>();

  for (const row of rows) {
    const key = row.row.normalizedTitle || normalizeGameTitle(row.row.title);
    const current = groups.get(key);
    if (current) current.push(row);
    else groups.set(key, [row]);
  }

  const mergedRows: Game[] = [];
  const idMap = new Map<string, number>();
  let nextId = 1;

  for (const [key, group] of Array.from(groups.entries()).sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    let merged = { ...group[0].row, normalizedTitle: key };
    for (const item of group.slice(1)) {
      merged = mergeGameMetadata(merged, item.row);
    }

    const nextIdValue = nextId++;
    mergedRows.push({
      ...merged,
      id: nextIdValue,
      normalizedTitle: key,
    });

    for (const item of group) {
      if (item.row.id != null) {
        idMap.set(`${item.scope}:${item.row.id}`, nextIdValue);
      }
    }
  }

  return { rows: mergedRows, idMap };
}

function mergeEntryRows(args: {
  localTables: SyncTables;
  cloudTables: SyncTables;
  gameIdMap: Map<string, number>;
}) {
  const groups = new Map<string, Array<ScopedLibraryEntry>>();
  const scopedSessions = new Map<string, ScopedSession[]>();
  const scopedReviews = new Map<string, ScopedReview[]>();

  const localGamesById = new Map(args.localTables.games.map((game) => [game.id, game] as const));
  const cloudGamesById = new Map(args.cloudTables.games.map((game) => [game.id, game] as const));

  const collectEntry = (scope: "local" | "cloud", entry: LibraryEntry, game?: Game) => {
    const normalizedTitle = game?.normalizedTitle || normalizeGameTitle(game?.title || "");
    const key = `${normalizedTitle}::${entry.platform.trim().toLowerCase()}`;
    const current = groups.get(key) ?? [];
    current.push({ scope, row: entry, normalizedTitle });
    groups.set(key, current);
  };

  for (const entry of args.localTables.libraryEntries) {
    collectEntry("local", entry, localGamesById.get(entry.gameId));
  }
  for (const entry of args.cloudTables.libraryEntries) {
    collectEntry("cloud", entry, cloudGamesById.get(entry.gameId));
  }

  const collectRows = <T extends { libraryEntryId: number }>(
    scope: "local" | "cloud",
    rows: T[],
    sink: Map<string, Array<Scoped<T>>>,
  ) => {
    for (const row of rows) {
      if (row.libraryEntryId == null) continue;
      const current = sink.get(`${scope}:${row.libraryEntryId}`) ?? [];
      current.push({ scope, row });
      sink.set(`${scope}:${row.libraryEntryId}`, current);
    }
  };

  collectRows("local", args.localTables.playSessions, scopedSessions);
  collectRows("cloud", args.cloudTables.playSessions, scopedSessions);
  collectRows("local", args.localTables.reviews, scopedReviews);
  collectRows("cloud", args.cloudTables.reviews, scopedReviews);

  const mergedRows: LibraryEntry[] = [];
  const entryIdMap = new Map<string, number>();
  const mergedSessionsByEntryId = new Map<number, PlaySession[]>();
  const mergedReviewsByEntryId = new Map<number, Review | undefined>();
  let nextId = 1;

  for (const [, group] of Array.from(groups.entries()).sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    const ordered = [...group].sort((left, right) => {
      if (Boolean(left.row.favorite) !== Boolean(right.row.favorite)) {
        return Number(Boolean(right.row.favorite)) - Number(Boolean(left.row.favorite));
      }
      if (left.row.playtimeMinutes !== right.row.playtimeMinutes) {
        return right.row.playtimeMinutes - left.row.playtimeMinutes;
      }
      if (left.row.completionPercent !== right.row.completionPercent) {
        return right.row.completionPercent - left.row.completionPercent;
      }
      return right.row.updatedAt.localeCompare(left.row.updatedAt);
    });

    const primaryScoped = ordered[0];
    const duplicateScoped = ordered.slice(1);

    const sourceSessions = group.flatMap(
      (entry) => scopedSessions.get(`${entry.scope}:${entry.row.id}`) ?? [],
    );
    const normalizedSessions = sourceSessions.map((session) => ({
      ...session.row,
      libraryEntryId: nextId,
      platform: primaryScoped.row.platform,
    }));

    const mergedEntry = mergeLibraryEntries(
      {
        ...primaryScoped.row,
        id: nextId,
        gameId:
          args.gameIdMap.get(`${primaryScoped.scope}:${primaryScoped.row.gameId}`) ??
          primaryScoped.row.gameId,
      },
      duplicateScoped.map((entry) => ({
        ...entry.row,
        gameId: args.gameIdMap.get(`${entry.scope}:${entry.row.gameId}`) ?? entry.row.gameId,
      })),
      normalizedSessions,
    );

    mergedRows.push({
      ...mergedEntry,
      id: nextId,
      gameId:
        args.gameIdMap.get(`${primaryScoped.scope}:${primaryScoped.row.gameId}`) ??
        mergedEntry.gameId,
    });
    mergedSessionsByEntryId.set(nextId, normalizedSessions);

    const sourceReviews = group.flatMap(
      (entry) => scopedReviews.get(`${entry.scope}:${entry.row.id}`) ?? [],
    );
    const mergedReview = sourceReviews.reduce<Review | undefined>(
      (current, review) =>
        mergeReviewRecords(
          current,
          current
            ? review.row
            : {
                ...review.row,
                libraryEntryId: nextId,
              },
        ),
      undefined,
    );
    mergedReviewsByEntryId.set(
      nextId,
      mergedReview ? { ...mergedReview, libraryEntryId: nextId } : undefined,
    );

    for (const item of group) {
      if (item.row.id != null) {
        entryIdMap.set(`${item.scope}:${item.row.id}`, nextId);
      }
    }

    nextId += 1;
  }

  return {
    rows: mergedRows,
    idMap: entryIdMap,
    sessionsByEntryId: mergedSessionsByEntryId,
    reviewsByEntryId: mergedReviewsByEntryId,
  };
}

export function mergeSyncTables(localTables: SyncTables, cloudTables: SyncTables): SyncTables {
  const sanitizedLocalTables = sanitizeSyncTables(localTables);
  const sanitizedCloudTables = sanitizeSyncTables(cloudTables);

  const { rows: mergedGames, idMap: gameIdMap } = mergeGameRows([
    ...sanitizedLocalTables.games.map((row) => ({ scope: "local" as const, row })),
    ...sanitizedCloudTables.games.map((row) => ({ scope: "cloud" as const, row })),
  ]);

  const {
    rows: mergedEntries,
    idMap: entryIdMap,
    sessionsByEntryId,
    reviewsByEntryId,
  } = mergeEntryRows({
    localTables: sanitizedLocalTables,
    cloudTables: sanitizedCloudTables,
    gameIdMap,
  });

  const mergedSessions: PlaySession[] = [];
  let nextSessionId = 1;
  const sessionSignatures = new Set<string>();

  for (const [entryId, sessions] of Array.from(sessionsByEntryId.entries()).sort(
    (left, right) => left[0] - right[0],
  )) {
    for (const session of sessions) {
      const signature = `${entryId}::${session.date}::${session.durationMinutes}::${(
        session.note || ""
      )
        .trim()
        .toLowerCase()}::${session.completionPercent ?? ""}`;
      if (sessionSignatures.has(signature)) continue;
      sessionSignatures.add(signature);
      mergedSessions.push({
        ...session,
        id: nextSessionId++,
        libraryEntryId: entryId,
      });
    }
  }

  const mergedReviews: Review[] = [];
  let nextReviewId = 1;
  for (const [entryId, review] of Array.from(reviewsByEntryId.entries()).sort(
    (left, right) => left[0] - right[0],
  )) {
    if (!review) continue;
    mergedReviews.push({
      ...review,
      id: nextReviewId++,
      libraryEntryId: entryId,
    });
  }

  const { rows: mergedLists, idMap: listIdMap } = mergeListRows([
    ...sanitizedLocalTables.lists.map((row) => ({ scope: "local" as const, row })),
    ...sanitizedCloudTables.lists.map((row) => ({ scope: "cloud" as const, row })),
  ]);

  const mergedLibraryEntryLists: LibraryEntryList[] = [];
  let nextLibraryEntryListId = 1;
  const relationKeys = new Set<string>();
  const relations: ScopedLibraryEntryList[] = [
    ...sanitizedLocalTables.libraryEntryLists.map((row) => ({ scope: "local" as const, row })),
    ...sanitizedCloudTables.libraryEntryLists.map((row) => ({ scope: "cloud" as const, row })),
  ];
  for (const relation of relations) {
    const nextEntryId = entryIdMap.get(`${relation.scope}:${relation.row.libraryEntryId}`);
    const nextListId = listIdMap.get(`${relation.scope}:${relation.row.listId}`);
    if (!nextEntryId || !nextListId) continue;
    const key = `${nextEntryId}::${nextListId}`;
    if (relationKeys.has(key)) continue;
    relationKeys.add(key);
    mergedLibraryEntryLists.push({
      id: nextLibraryEntryListId++,
      libraryEntryId: nextEntryId,
      listId: nextListId,
      createdAt: relation.row.createdAt,
    });
  }

  const { rows: mergedTags, idMap: tagIdMap } = mergeTagRows([
    ...sanitizedLocalTables.tags.map((row) => ({ scope: "local" as const, row })),
    ...sanitizedCloudTables.tags.map((row) => ({ scope: "cloud" as const, row })),
  ]);

  const mergedGameTags: GameTag[] = [];
  let nextGameTagId = 1;
  const gameTagKeys = new Set<string>();
  const gameTags: ScopedGameTag[] = [
    ...sanitizedLocalTables.gameTags.map((row) => ({ scope: "local" as const, row })),
    ...sanitizedCloudTables.gameTags.map((row) => ({ scope: "cloud" as const, row })),
  ];
  for (const relation of gameTags) {
    const nextEntryId = entryIdMap.get(`${relation.scope}:${relation.row.libraryEntryId}`);
    const nextTagId = tagIdMap.get(`${relation.scope}:${relation.row.tagId}`);
    if (!nextEntryId || !nextTagId) continue;
    const key = `${nextEntryId}::${nextTagId}`;
    if (gameTagKeys.has(key)) continue;
    gameTagKeys.add(key);
    mergedGameTags.push({
      id: nextGameTagId++,
      libraryEntryId: nextEntryId,
      tagId: nextTagId,
    });
  }

  const goalsByKey = new Map<string, Goal>();
  for (const goal of [...sanitizedLocalTables.goals, ...sanitizedCloudTables.goals]) {
    const key = `${goal.type}::${goal.period}`;
    const existing = goalsByKey.get(key);
    goalsByKey.set(key, existing ? mergeGoals(existing, goal) : { ...goal });
  }
  const mergedGoals = Array.from(goalsByKey.values())
    .sort((left, right) => `${left.type}:${left.period}`.localeCompare(`${right.type}:${right.period}`))
    .map((goal, index) => ({ ...goal, id: index + 1 }));

  const mergedSettings = mergeSettingRows([
    ...sanitizedLocalTables.settings,
    ...sanitizedCloudTables.settings,
  ]).map((setting, index) => ({
    ...setting,
    id: index + 1,
  }));

  return {
    games: mergedGames,
    libraryEntries: mergedEntries,
    playSessions: mergedSessions,
    reviews: mergedReviews,
    lists: mergedLists,
    libraryEntryLists: mergedLibraryEntryLists,
    tags: mergedTags,
    gameTags: mergedGameTags,
    goals: mergedGoals,
    settings: mergedSettings,
  };
}
