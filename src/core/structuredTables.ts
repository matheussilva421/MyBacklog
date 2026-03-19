import type {
  Game,
  GamePlatform,
  LibraryEntry,
  LibraryEntryStore,
  Platform,
  Store,
} from "./types";
import { normalizeToken, splitCsvTokens } from "./utils";

export type StructuredTablesSnapshot = {
  stores: Store[];
  libraryEntryStores: LibraryEntryStore[];
  platforms: Platform[];
  gamePlatforms: GamePlatform[];
};

type BuildStructuredTablesArgs = {
  games: Game[];
  libraryEntries: LibraryEntry[];
  extraStoresByEntryId?: Map<number, string[]>;
  extraPlatformsByGameId?: Map<number, string[]>;
};

export function buildStructuredTablesFromLegacy({
  games,
  libraryEntries,
  extraStoresByEntryId,
  extraPlatformsByGameId,
}: BuildStructuredTablesArgs): StructuredTablesSnapshot {
  const gameRows = [...games].filter((game): game is Game & { id: number } => typeof game.id === "number");
  const entryRows = [...libraryEntries].filter(
    (entry): entry is LibraryEntry & { id: number } => typeof entry.id === "number",
  );

  const entryIdsByGameId = new Map<number, number[]>();
  for (const entry of entryRows) {
    const current = entryIdsByGameId.get(entry.gameId);
    if (current) current.push(entry.id);
    else entryIdsByGameId.set(entry.gameId, [entry.id]);
  }

  const storeNamesByEntryId = new Map<number, string[]>();
  for (const entry of entryRows) {
    const storeNames = splitCsvTokens([
      entry.sourceStore,
      ...(extraStoresByEntryId?.get(entry.id) ?? []),
    ]);
    if (storeNames.length > 0) storeNamesByEntryId.set(entry.id, storeNames);
  }

  const uniqueStoreNames = Array.from(
    new Map(
      Array.from(storeNamesByEntryId.values())
        .flat()
        .map((name) => [normalizeToken(name), name] as const),
    ).entries(),
  )
    .sort((left, right) => left[0].localeCompare(right[0], "pt-BR"))
    .map(([, name]) => name);

  const now = new Date().toISOString();
  const stores: Store[] = uniqueStoreNames.map((name, index) => ({
    id: index + 1,
    name,
    normalizedName: normalizeToken(name),
    createdAt: now,
    updatedAt: now,
  }));
  const storeIdByNormalizedName = new Map(
    stores.map((store) => [store.normalizedName, store.id ?? 0] as const),
  );

  const libraryEntryStores: LibraryEntryStore[] = [];
  let nextLibraryEntryStoreId = 1;
  for (const entry of [...entryRows].sort((left, right) => left.id - right.id)) {
    const storeNames = storeNamesByEntryId.get(entry.id) ?? [];
    storeNames.forEach((storeName, index) => {
      const storeId = storeIdByNormalizedName.get(normalizeToken(storeName));
      if (!storeId) return;
      libraryEntryStores.push({
        id: nextLibraryEntryStoreId++,
        libraryEntryId: entry.id,
        storeId,
        isPrimary: index === 0,
        createdAt: entry.createdAt || now,
      });
    });
  }

  const platformNamesByGameId = new Map<number, string[]>();
  for (const game of gameRows) {
    const relatedEntryPlatforms = (entryIdsByGameId.get(game.id) ?? [])
      .map((entryId) => entryRows.find((entry) => entry.id === entryId)?.platform ?? "")
      .filter(Boolean);
    const platformNames = splitCsvTokens([
      game.platforms,
      ...relatedEntryPlatforms,
      ...(extraPlatformsByGameId?.get(game.id) ?? []),
    ]);
    if (platformNames.length > 0) platformNamesByGameId.set(game.id, platformNames);
  }

  const uniquePlatformNames = Array.from(
    new Map(
      Array.from(platformNamesByGameId.values())
        .flat()
        .map((name) => [normalizeToken(name), name] as const),
    ).entries(),
  )
    .sort((left, right) => left[0].localeCompare(right[0], "pt-BR"))
    .map(([, name]) => name);

  const platforms: Platform[] = uniquePlatformNames.map((name, index) => ({
    id: index + 1,
    name,
    normalizedName: normalizeToken(name),
    createdAt: now,
    updatedAt: now,
  }));
  const platformIdByNormalizedName = new Map(
    platforms.map((platform) => [platform.normalizedName, platform.id ?? 0] as const),
  );

  const gamePlatforms: GamePlatform[] = [];
  let nextGamePlatformId = 1;
  for (const game of [...gameRows].sort((left, right) => left.id - right.id)) {
    const platformNames = platformNamesByGameId.get(game.id) ?? [];
    platformNames.forEach((platformName) => {
      const platformId = platformIdByNormalizedName.get(normalizeToken(platformName));
      if (!platformId) return;
      gamePlatforms.push({
        id: nextGamePlatformId++,
        gameId: game.id,
        platformId,
        createdAt: game.createdAt || now,
      });
    });
  }

  return {
    stores,
    libraryEntryStores,
    platforms,
    gamePlatforms,
  };
}
