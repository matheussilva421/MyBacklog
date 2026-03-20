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

export function buildStoreNamesByEntryId(
  storeRows: Store[],
  libraryEntryStoreRows: LibraryEntryStore[],
): Map<number, string[]> {
  const storeNameById = new Map(storeRows.map((store) => [store.id, store.name] as const));
  const grouped = new Map<number, Array<{ name: string; isPrimary: boolean }>>();

  for (const relation of libraryEntryStoreRows) {
    const storeName = storeNameById.get(relation.storeId);
    if (!storeName) continue;
    const current = grouped.get(relation.libraryEntryId) ?? [];
    current.push({ name: storeName, isPrimary: Boolean(relation.isPrimary) });
    grouped.set(relation.libraryEntryId, current);
  }

  return new Map(
    Array.from(grouped.entries()).map(([entryId, rows]) => [
      entryId,
      dedupeNames(
        rows
          .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.name.localeCompare(right.name, "pt-BR"))
          .map((row) => row.name),
      ),
    ]),
  );
}

export function buildPlatformNamesByGameId(
  platformRows: Platform[],
  gamePlatformRows: GamePlatform[],
): Map<number, string[]> {
  const platformNameById = new Map(platformRows.map((platform) => [platform.id, platform.name] as const));
  const grouped = new Map<number, string[]>();

  for (const relation of gamePlatformRows) {
    const platformName = platformNameById.get(relation.platformId);
    if (!platformName) continue;
    const current = grouped.get(relation.gameId) ?? [];
    current.push(platformName);
    grouped.set(relation.gameId, current);
  }

  return new Map(
    Array.from(grouped.entries()).map(([gameId, names]) => [gameId, dedupeNames(names).sort((left, right) => left.localeCompare(right, "pt-BR"))]),
  );
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
