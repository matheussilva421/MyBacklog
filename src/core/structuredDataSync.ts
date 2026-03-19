import { db } from "./db";
import { buildStructuredTablesFromLegacy, type StructuredTablesSnapshot } from "./structuredTables";
import type {
  Game,
  GamePlatform,
  LibraryEntry,
  LibraryEntryStore,
  Platform,
  Store,
} from "./types";
import { normalizeToken, splitCsvTokens } from "./utils";

async function ensureStores(storeNames: string[]): Promise<Map<string, Store>> {
  const normalizedNames = Array.from(new Set(storeNames.map(normalizeToken).filter(Boolean)));
  if (normalizedNames.length === 0) return new Map();

  const existingRows = await db.stores.toArray();
  const existingByNormalizedName = new Map(
    existingRows.map((store) => [store.normalizedName, store] as const),
  );
  const now = new Date().toISOString();

  for (const storeName of storeNames) {
    const normalizedName = normalizeToken(storeName);
    if (!normalizedName || existingByNormalizedName.has(normalizedName)) continue;
    const nextId = Number(
      await db.stores.add({
        name: storeName,
        normalizedName,
        createdAt: now,
        updatedAt: now,
      }),
    );
    existingByNormalizedName.set(normalizedName, {
      id: nextId,
      name: storeName,
      normalizedName,
      createdAt: now,
      updatedAt: now,
    });
  }

  return existingByNormalizedName;
}

async function ensurePlatforms(platformNames: string[]): Promise<Map<string, Platform>> {
  const normalizedNames = Array.from(new Set(platformNames.map(normalizeToken).filter(Boolean)));
  if (normalizedNames.length === 0) return new Map();

  const existingRows = await db.platforms.toArray();
  const existingByNormalizedName = new Map(
    existingRows.map((platform) => [platform.normalizedName, platform] as const),
  );
  const now = new Date().toISOString();

  for (const platformName of platformNames) {
    const normalizedName = normalizeToken(platformName);
    if (!normalizedName || existingByNormalizedName.has(normalizedName)) continue;
    const nextId = Number(
      await db.platforms.add({
        name: platformName,
        normalizedName,
        createdAt: now,
        updatedAt: now,
      }),
    );
    existingByNormalizedName.set(normalizedName, {
      id: nextId,
      name: platformName,
      normalizedName,
      createdAt: now,
      updatedAt: now,
    });
  }

  return existingByNormalizedName;
}

export async function syncLibraryEntryStoreRelations(
  libraryEntry: Pick<LibraryEntry, "id" | "sourceStore" | "createdAt">,
  extraStoreNames: string[] = [],
) {
  if (libraryEntry.id == null) return;

  const storeNames = splitCsvTokens([libraryEntry.sourceStore, ...extraStoreNames]);
  const existingRelations = await db.libraryEntryStores
    .where("libraryEntryId")
    .equals(libraryEntry.id)
    .toArray();

  if (storeNames.length === 0) {
    for (const relation of existingRelations) {
      if (relation.id != null) await db.libraryEntryStores.delete(relation.id);
    }
    return;
  }

  const storeByNormalizedName = await ensureStores(storeNames);
  const desiredStoreIds = storeNames
    .map((storeName) => storeByNormalizedName.get(normalizeToken(storeName))?.id)
    .filter((storeId): storeId is number => typeof storeId === "number");
  const desiredStoreIdSet = new Set(desiredStoreIds);

  for (const relation of existingRelations) {
    if (relation.storeId && !desiredStoreIdSet.has(relation.storeId) && relation.id != null) {
      await db.libraryEntryStores.delete(relation.id);
    }
  }

  const existingByStoreId = new Map(
    existingRelations.map((relation) => [relation.storeId, relation] as const),
  );
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
      libraryEntryId: libraryEntry.id,
      storeId,
      isPrimary: index === 0,
      createdAt: libraryEntry.createdAt || now,
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
    for (const relation of existingRelations) {
      if (relation.id != null) await db.gamePlatforms.delete(relation.id);
    }
    return;
  }

  const platformByNormalizedName = await ensurePlatforms(platformNames);
  const desiredPlatformIds = platformNames
    .map((platformName) => platformByNormalizedName.get(normalizeToken(platformName))?.id)
    .filter((platformId): platformId is number => typeof platformId === "number");
  const desiredPlatformIdSet = new Set(desiredPlatformIds);

  for (const relation of existingRelations) {
    if (relation.platformId && !desiredPlatformIdSet.has(relation.platformId) && relation.id != null) {
      await db.gamePlatforms.delete(relation.id);
    }
  }

  const existingByPlatformId = new Map(
    existingRelations.map((relation) => [relation.platformId, relation] as const),
  );
  const now = new Date().toISOString();

  for (const platformId of desiredPlatformIds) {
    if (existingByPlatformId.has(platformId)) continue;
    await db.gamePlatforms.add({
      gameId: game.id,
      platformId,
      createdAt: game.createdAt || now,
    });
  }
}

export async function syncStructuredRelationsForRecord(args: {
  game: Pick<Game, "id" | "platforms" | "createdAt">;
  libraryEntry: Pick<LibraryEntry, "id" | "platform" | "sourceStore" | "createdAt">;
  extraStoreNames?: string[];
  extraPlatformNames?: string[];
}) {
  await syncLibraryEntryStoreRelations(args.libraryEntry, args.extraStoreNames);
  await syncGamePlatformRelations(args.game, args.libraryEntry.platform, args.extraPlatformNames);
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

export function buildExtraStoreMap(rows: Store[], relations: LibraryEntryStore[], entryIdMap = new Map<number, number>()) {
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
