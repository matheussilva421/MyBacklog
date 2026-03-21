import { db } from "./db";
import { classifyAccessSource } from "./libraryEntryDerived";
import { buildStructuredTablesFromLegacy, type StructuredTablesSnapshot } from "./structuredTables";
import type { Game, GamePlatform, LibraryEntry, LibraryEntryStore, Platform, Store } from "./types";
import { normalizeToken, splitCsvTokens, generateUuid } from "./utils";
import { softDelete, getDeviceId } from "../lib/softDelete";

function getStructuredSyncErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function insertNormalizedEntityRow<TRow extends { id?: number; name: string; normalizedName: string }>(args: {
  label: string;
  name: string;
  normalizedName: string;
  loadExisting: () => Promise<TRow | undefined>;
  insert: () => Promise<number>;
  buildRow: (id: number) => TRow;
}): Promise<TRow> {
  try {
    const nextId = Number(await args.insert());
    return args.buildRow(nextId);
  } catch (error) {
    const existing = await args.loadExisting();
    if (existing) return existing;

    throw new Error(
      `Falha ao persistir a ${args.label} estruturada "${args.name}": ${getStructuredSyncErrorMessage(error)}`,
    );
  }
}

async function ensureNormalizedEntities<TRow extends { id?: number; name: string; normalizedName: string }>(
  names: string[],
  args: {
    loadRows: () => Promise<TRow[]>;
    loadExisting: (normalizedName: string) => Promise<TRow | undefined>;
    createDraft: (name: string, normalizedName: string, now: string) => Omit<TRow, "id">;
    insertDraft: (draft: Omit<TRow, "id">) => Promise<number>;
    buildRow: (draft: Omit<TRow, "id">, id: number) => TRow;
    label: string;
  },
): Promise<Map<string, TRow>> {
  const normalizedNames = Array.from(new Set(names.map(normalizeToken).filter(Boolean)));
  if (normalizedNames.length === 0) return new Map();

  const existingRows = await args.loadRows();
  const existingByNormalizedName = new Map(existingRows.map((row) => [row.normalizedName, row] as const));
  const now = new Date().toISOString();

  for (const name of names) {
    const normalizedName = normalizeToken(name);
    if (!normalizedName || existingByNormalizedName.has(normalizedName)) continue;

    const draft = args.createDraft(name, normalizedName, now);
    const row = await insertNormalizedEntityRow({
      label: args.label,
      name,
      normalizedName,
      loadExisting: () => args.loadExisting(normalizedName),
      insert: () => args.insertDraft(draft),
      buildRow: (id) => args.buildRow(draft, id),
    });
    existingByNormalizedName.set(normalizedName, row);
  }

  return existingByNormalizedName;
}

async function ensureStores(storeNames: string[]): Promise<Map<string, Store>> {
  return ensureNormalizedEntities(storeNames, {
    label: "store",
    loadRows: () => db.stores.toArray(),
    loadExisting: (normalizedName) => db.stores.where("normalizedName").equals(normalizedName).first(),
    createDraft: (name, normalizedName, now) => ({
      uuid: generateUuid(),
      version: 1,
      name,
      normalizedName,
      sourceKey: classifyAccessSource(name),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }),
    insertDraft: (draft) => db.stores.add(draft),
    buildRow: (draft, id) => ({ ...draft, id }),
  });
}

async function ensurePlatforms(platformNames: string[]): Promise<Map<string, Platform>> {
  return ensureNormalizedEntities(platformNames, {
    label: "plataforma",
    loadRows: () => db.platforms.toArray(),
    loadExisting: (normalizedName) => db.platforms.where("normalizedName").equals(normalizedName).first(),
    createDraft: (name, normalizedName, now) => ({
      uuid: generateUuid(),
      version: 1,
      name,
      normalizedName,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }),
    insertDraft: (draft) => db.platforms.add(draft),
    buildRow: (draft, id) => ({ ...draft, id }),
  });
}

export async function syncLibraryEntryStoreRelations(
  libraryEntry: Pick<LibraryEntry, "id" | "sourceStore" | "createdAt">,
  extraStoreNames: string[] = [],
) {
  if (libraryEntry.id == null) return;

  const storeNames = splitCsvTokens([libraryEntry.sourceStore, ...extraStoreNames]);
  const existingRelations = await db.libraryEntryStores.where("libraryEntryId").equals(libraryEntry.id).toArray();

  if (storeNames.length === 0) {
    const deviceId = await getDeviceId();
    for (const relation of existingRelations) {
      if (relation.id != null) await softDelete("libraryEntryStores", relation.id, deviceId);
    }
    return;
  }

  const storeByNormalizedName = await ensureStores(storeNames);
  const desiredStoreIds = storeNames
    .map((storeName) => storeByNormalizedName.get(normalizeToken(storeName))?.id)
    .filter((storeId): storeId is number => typeof storeId === "number");
  const desiredStoreIdSet = new Set(desiredStoreIds);

  const deviceId = await getDeviceId();
  for (const relation of existingRelations) {
    if (relation.storeId && !desiredStoreIdSet.has(relation.storeId) && relation.id != null) {
      await softDelete("libraryEntryStores", relation.id, deviceId);
    }
  }

  const existingByStoreId = new Map(existingRelations.map((relation) => [relation.storeId, relation] as const));
  const now = new Date().toISOString();

  for (const [index, storeId] of desiredStoreIds.entries()) {
    const existing = existingByStoreId.get(storeId);
    if (existing?.id != null) {
      if (existing.isPrimary !== (index === 0)) {
        await db.libraryEntryStores.update(existing.id, { isPrimary: index === 0 });
      }
      continue;
    }

    await db.libraryEntryStores.add({
      uuid: generateUuid(),
      version: 1,
      libraryEntryId: libraryEntry.id,
      storeId,
      isPrimary: index === 0,
      createdAt: libraryEntry.createdAt || now,
      updatedAt: now,
      deletedAt: null,
    });
  }
}

export async function syncGamePlatformRelations(
  game: Pick<Game, "id" | "platforms" | "createdAt">,
  primaryPlatform?: string,
  extraPlatformNames: string[] = [],
) {
  if (game.id == null) return;

  const platformNames = splitCsvTokens([game.platforms, primaryPlatform, ...extraPlatformNames]);
  const existingRelations = await db.gamePlatforms.where("gameId").equals(game.id).toArray();

  if (platformNames.length === 0) {
    const deviceId = await getDeviceId();
    for (const relation of existingRelations) {
      if (relation.id != null) await softDelete("gamePlatforms", relation.id, deviceId);
    }
    return;
  }

  const platformByNormalizedName = await ensurePlatforms(platformNames);
  const desiredPlatformIds = platformNames
    .map((platformName) => platformByNormalizedName.get(normalizeToken(platformName))?.id)
    .filter((platformId): platformId is number => typeof platformId === "number");
  const desiredPlatformIdSet = new Set(desiredPlatformIds);

  const deviceId = await getDeviceId();
  for (const relation of existingRelations) {
    if (relation.platformId && !desiredPlatformIdSet.has(relation.platformId) && relation.id != null) {
      await softDelete("gamePlatforms", relation.id, deviceId);
    }
  }

  const existingByPlatformId = new Map(existingRelations.map((relation) => [relation.platformId, relation] as const));
  const now = new Date().toISOString();

  for (const platformId of desiredPlatformIds) {
    if (existingByPlatformId.has(platformId)) continue;
    await db.gamePlatforms.add({
      uuid: generateUuid(),
      version: 1,
      gameId: game.id,
      platformId,
      createdAt: game.createdAt || now,
      updatedAt: now,
      deletedAt: null,
    });
  }
}

export async function syncStructuredRelationsForRecord(args: {
  game: Pick<Game, "id" | "platforms" | "createdAt">;
  libraryEntry: Pick<LibraryEntry, "id" | "platform" | "sourceStore" | "createdAt">;
  extraStoreNames?: string[];
  extraPlatformNames?: string[];
}) {
  await db.transaction("rw", [db.stores, db.libraryEntryStores, db.platforms, db.gamePlatforms], async () => {
    await syncLibraryEntryStoreRelations(args.libraryEntry, args.extraStoreNames);
    await syncGamePlatformRelations(args.game, args.libraryEntry.platform, args.extraPlatformNames);
  });
}

export async function replaceStructuredTables(snapshot: StructuredTablesSnapshot) {
  await db.stores.clear();
  await db.libraryEntryStores.clear();
  await db.platforms.clear();
  await db.gamePlatforms.clear();

  if (snapshot.stores.length > 0) await db.stores.bulkPut(snapshot.stores);
  if (snapshot.libraryEntryStores.length > 0) await db.libraryEntryStores.bulkPut(snapshot.libraryEntryStores);
  if (snapshot.platforms.length > 0) await db.platforms.bulkPut(snapshot.platforms);
  if (snapshot.gamePlatforms.length > 0) await db.gamePlatforms.bulkPut(snapshot.gamePlatforms);
}

export async function rebuildStructuredTablesFromLegacy(args: {
  games: Game[];
  libraryEntries: LibraryEntry[];
  extraStoresByEntryId?: Map<number, string[]>;
  extraPlatformsByGameId?: Map<number, string[]>;
}) {
  const snapshot = buildStructuredTablesFromLegacy(args);
  await replaceStructuredTables(snapshot);
}

export function buildExtraStoreMap(
  rows: Store[],
  relations: LibraryEntryStore[],
  entryIdMap = new Map<number, number>(),
) {
  const storeNameById = new Map(rows.map((store) => [store.id, store.name] as const));
  const extraStoresByEntryId = new Map<number, string[]>();

  for (const relation of relations) {
    const nextEntryId = entryIdMap.get(relation.libraryEntryId) ?? relation.libraryEntryId;
    const storeName = storeNameById.get(relation.storeId);
    if (!nextEntryId || !storeName) continue;
    const current = extraStoresByEntryId.get(nextEntryId) ?? [];
    current.push(storeName);
    extraStoresByEntryId.set(nextEntryId, current);
  }

  return extraStoresByEntryId;
}

export function buildExtraPlatformMap(
  rows: Platform[],
  relations: GamePlatform[],
  gameIdMap = new Map<number, number>(),
) {
  const platformNameById = new Map(rows.map((platform) => [platform.id, platform.name] as const));
  const extraPlatformsByGameId = new Map<number, string[]>();

  for (const relation of relations) {
    const nextGameId = gameIdMap.get(relation.gameId) ?? relation.gameId;
    const platformName = platformNameById.get(relation.platformId);
    if (!nextGameId || !platformName) continue;
    const current = extraPlatformsByGameId.get(nextGameId) ?? [];
    current.push(platformName);
    extraPlatformsByGameId.set(nextGameId, current);
  }

  return extraPlatformsByGameId;
}
