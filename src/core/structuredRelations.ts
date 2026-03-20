import type {
  Game as DbGameMetadata,
  GamePlatform,
  LibraryEntry as DbLibraryEntry,
  LibraryEntryStore,
  Platform,
  Store,
} from "./types";
import { getPrimaryCsvToken, splitCsvTokens } from "./utils";

function dedupeNames(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildRelationNamesByOwnerId<TRow extends { id?: number; name: string }, TRelation extends { createdAt?: string }>(
  rows: TRow[],
  relations: TRelation[],
  options: {
    getOwnerId: (relation: TRelation) => number;
    getRowId: (relation: TRelation) => number;
    getSortPriority?: (relation: TRelation) => number;
  },
): Map<number, string[]> {
  const nameById = new Map(rows.map((row) => [row.id, row.name] as const));
  const grouped = new Map<number, Array<{ name: string; priority: number }>>();

  for (const relation of relations) {
    const name = nameById.get(options.getRowId(relation));
    if (!name) continue;
    const ownerId = options.getOwnerId(relation);
    const current = grouped.get(ownerId) ?? [];
    current.push({ name, priority: options.getSortPriority?.(relation) ?? 0 });
    grouped.set(ownerId, current);
  }

  return new Map(
    Array.from(grouped.entries()).map(([ownerId, values]) => [
      ownerId,
      dedupeNames(
        values
          .sort(
            (left, right) =>
              right.priority - left.priority || left.name.localeCompare(right.name, "pt-BR"),
          )
          .map((row) => row.name),
      ),
    ]),
  );
}

export function buildStoreNamesByEntryId(
  storeRows: Store[],
  libraryEntryStoreRows: LibraryEntryStore[],
): Map<number, string[]> {
  return buildRelationNamesByOwnerId(storeRows, libraryEntryStoreRows, {
    getOwnerId: (relation) => relation.libraryEntryId,
    getRowId: (relation) => relation.storeId,
    getSortPriority: (relation) => Number(Boolean(relation.isPrimary)),
  });
}

export function buildPlatformNamesByGameId(
  platformRows: Platform[],
  gamePlatformRows: GamePlatform[],
): Map<number, string[]> {
  return buildRelationNamesByOwnerId(platformRows, gamePlatformRows, {
    getOwnerId: (relation) => relation.gameId,
    getRowId: (relation) => relation.platformId,
  });
}

export function resolveStructuredStores(
  libraryEntry: Pick<DbLibraryEntry, "id" | "sourceStore">,
  storeNamesByEntryId: Map<number, string[]>,
): string[] {
  return dedupeNames([
    ...(libraryEntry.id != null ? storeNamesByEntryId.get(libraryEntry.id) ?? [] : []),
    ...splitCsvTokens(libraryEntry.sourceStore),
  ]);
}

export function resolveStructuredPlatforms(
  game: Pick<DbGameMetadata, "id" | "platforms">,
  primaryPlatform: string | undefined,
  platformNamesByGameId: Map<number, string[]>,
): string[] {
  return dedupeNames([
    ...(game.id != null ? platformNamesByGameId.get(game.id) ?? [] : []),
    ...splitCsvTokens(game.platforms),
    ...splitCsvTokens(primaryPlatform),
  ]);
}

export function derivePrimaryStore(stores: string[], fallback: string): string {
  return getPrimaryCsvToken(stores, fallback);
}

export function derivePrimaryPlatform(platforms: string[], fallback: string): string {
  return getPrimaryCsvToken(platforms, fallback);
}
