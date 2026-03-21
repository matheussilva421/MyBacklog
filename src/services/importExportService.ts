import {
  attachRawgCandidatesToPreview,
  buildImportPreview,
  buildRestorePreview,
  composeLibraryRecords,
  createDbGameFromImport,
  gamesToCsv,
  mergeImportedGame,
  mergePlatformList,
  normalizeGameTitle,
  parseBackupText,
  parseImportText,
  recordToImportPayload,
  type BackupPayload,
  type BackupTables,
  type ImportPreviewEntry,
  type ImportSource,
  type ImportPayload,
  type LibraryRecord,
  type RestoreMode,
  type RestorePreview,
} from "../backlog/shared";
import { db } from "../core/db";
import { syncStructuredRelationsForRecord } from "../core/structuredDataSync";
import { buildPlaySessionDedupKey } from "../core/playSessionIdentity";
import {
  buildPlatformNamesByGameId,
  buildStoreNamesByEntryId,
  resolveStructuredPlatforms,
  resolveStructuredStores,
} from "../core/structuredRelations";
import { buildStructuredEntryLookupAliases, createStructuredEntryIdentity } from "../core/structuredEntryIdentity";
import type { Goal as DbGoal, SavedView as DbSavedView } from "../core/types";
import type { AppPreferences } from "../modules/settings/utils/preferences";
import { generateUuid } from "../core/utils";
import { applyRawgMetadataToImportPayload, fetchRawgMetadata, searchRawgCandidates } from "../modules/import-export/utils/rawg";
import { logger } from "../lib/logger";

function logRawgWarning(message: string, error: unknown) {
  logger.warn(message, error);
}

function buildStructuredEntryLookup(
  records: LibraryRecord[],
  args: {
    storeNamesByEntryId: Map<number, string[]>;
    platformNamesByGameId: Map<number, string[]>;
  },
) {
  const lookup = new Map<string, LibraryRecord[]>();

  for (const record of records) {
    const identity = createStructuredEntryIdentity({
      title: record.game.title,
      primaryPlatform: record.libraryEntry.platform,
      primaryStore: record.libraryEntry.sourceStore,
      platforms: resolveStructuredPlatforms(record.game, record.libraryEntry.platform, args.platformNamesByGameId),
      stores: resolveStructuredStores(record.libraryEntry, args.storeNamesByEntryId),
    });

    for (const alias of buildStructuredEntryLookupAliases(identity)) {
      const current = lookup.get(alias) ?? [];
      current.push(record);
      lookup.set(alias, current);
    }
  }

  return lookup;
}

function findStructuredLibraryRecordMatch(
  lookup: Map<string, LibraryRecord[]>,
  identity: ReturnType<typeof createStructuredEntryIdentity>,
) {
  const matches = new Map<number, LibraryRecord>();
  for (const alias of buildStructuredEntryLookupAliases(identity)) {
    for (const record of lookup.get(alias) ?? []) {
      if (record.libraryEntry.id == null) continue;
      matches.set(record.libraryEntry.id, record);
    }
  }
  return matches.size === 1 ? (Array.from(matches.values())[0] ?? null) : null;
}

function registerStructuredLibraryRecordMatch(
  lookup: Map<string, LibraryRecord[]>,
  record: LibraryRecord,
  args: {
    storeNamesByEntryId: Map<number, string[]>;
    platformNamesByGameId: Map<number, string[]>;
  },
) {
  const identity = createStructuredEntryIdentity({
    title: record.game.title,
    primaryPlatform: record.libraryEntry.platform,
    primaryStore: record.libraryEntry.sourceStore,
    platforms: resolveStructuredPlatforms(record.game, record.libraryEntry.platform, args.platformNamesByGameId),
    stores: resolveStructuredStores(record.libraryEntry, args.storeNamesByEntryId),
  });

  for (const alias of buildStructuredEntryLookupAliases(identity)) {
    const current = lookup.get(alias) ?? [];
    const hasRecord = current.some((currentRecord) => currentRecord.libraryEntry.id === record.libraryEntry.id);
    if (hasRecord) continue;
    current.push(record);
    lookup.set(alias, current);
  }
}

async function fetchRawgCandidateMap(preview: Array<{ key: string; payload: { title: string } }>, apiKey: string) {
  const candidateMap = new Map<string, Awaited<ReturnType<typeof searchRawgCandidates>>>();
  const results = await Promise.allSettled(
    preview.map(async (entry) => ({
      key: entry.key,
      candidates: await searchRawgCandidates(entry.payload.title, apiKey),
    })),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      candidateMap.set(result.value.key, result.value.candidates);
    } else {
      logRawgWarning("[RAWG] Falha ao buscar candidatos:", result.reason);
    }
  }

  return candidateMap;
}

async function fetchSelectedRawgMetadata(preview: Array<{ selectedRawgId: number | null }>, apiKey: string) {
  const uniqueRawgIds = Array.from(
    new Set(
      preview
        .map((entry) => entry.selectedRawgId)
        .filter((rawgId): rawgId is number => typeof rawgId === "number" && rawgId > 0),
    ),
  );
  const metadataMap = new Map<number, Awaited<ReturnType<typeof fetchRawgMetadata>>>();
  const results = await Promise.allSettled(
    uniqueRawgIds.map(async (rawgId) => ({
      rawgId,
      metadata: await fetchRawgMetadata(rawgId, apiKey),
    })),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      metadataMap.set(result.value.rawgId, result.value.metadata);
    } else {
      logRawgWarning("[RAWG] Falha ao buscar metadados:", result.reason);
    }
  }

  return metadataMap;
}

export async function prepareImportPreview(args: {
  importSource: ImportSource;
  importText: string;
  preferences: AppPreferences;
  records: LibraryRecord[];
}): Promise<ImportPreviewEntry[]> {
  const parsed = parseImportText(args.importSource, args.importText, {
    platform: args.preferences.primaryPlatforms[0],
    sourceStore: args.preferences.defaultStores[0],
  });

  if (parsed.length === 0) return [];

  const [storeRows, libraryEntryStoreRows, platformRows, gamePlatformRows] = await Promise.all([
    db.stores.toArray(),
    db.libraryEntryStores.toArray(),
    db.platforms.toArray(),
    db.gamePlatforms.toArray(),
  ]);
  const storeNamesByEntryId = buildStoreNamesByEntryId(storeRows, libraryEntryStoreRows);
  const platformNamesByGameId = buildPlatformNamesByGameId(platformRows, gamePlatformRows);
  let preview = buildImportPreview(
    parsed,
    args.records.map((record) => ({
      ...record,
      structuredPlatforms: resolveStructuredPlatforms(record.game, record.libraryEntry.platform, platformNamesByGameId),
      structuredStores: resolveStructuredStores(record.libraryEntry, storeNamesByEntryId),
    })),
  );

  if (preview.length === 0) return [];

  if (args.preferences.rawgApiKey.trim()) {
    const candidateMap = await fetchRawgCandidateMap(
      preview.filter((entry) => entry.status !== "existing" || !entry.payload.rawgId),
      args.preferences.rawgApiKey.trim(),
    );
    preview = attachRawgCandidatesToPreview(preview, candidateMap);
  }

  return preview;
}

export async function applyImportPreview(args: {
  importSource: ImportSource;
  importPreview: ImportPreviewEntry[];
  preferences: AppPreferences;
}) {
  const rawgMetadataMap = args.preferences.rawgApiKey.trim()
    ? await fetchSelectedRawgMetadata(args.importPreview, args.preferences.rawgApiKey.trim())
    : new Map();
  let created = 0;
  let updated = 0;
  let ignored = 0;

  await db.transaction(
    "rw",
    [db.games, db.libraryEntries, db.stores, db.libraryEntryStores, db.platforms, db.gamePlatforms],
    async () => {
      for (const previewEntry of args.importPreview) {
        if (previewEntry.action === "ignore") {
          ignored += 1;
          continue;
        }

        let payload: ImportPayload = previewEntry.payload;
        if (previewEntry.selectedRawgId) {
          payload = applyRawgMetadataToImportPayload(payload, rawgMetadataMap.get(previewEntry.selectedRawgId) ?? null);
        }

        const targetEntryId = previewEntry.selectedMatchId ?? previewEntry.existingId;
        if (previewEntry.action === "create" || targetEntryId == null) {
          const selectedGame =
            previewEntry.selectedGameId != null ? await db.games.get(previewEntry.selectedGameId) : undefined;
          const existingMetadata =
            selectedGame ?? (await db.games.where("normalizedTitle").equals(normalizeGameTitle(payload.title)).first());
          const createdRecord = createDbGameFromImport(payload, existingMetadata);
          let gameId = existingMetadata?.id;
          let persistedGame = createdRecord.game;

          if (gameId == null) {
            gameId = Number(await db.games.add(createdRecord.game));
            persistedGame = { ...createdRecord.game, id: gameId };
          } else if (existingMetadata) {
            persistedGame = {
              ...existingMetadata,
              ...createdRecord.game,
              id: existingMetadata.id,
              platforms: mergePlatformList(existingMetadata.platforms, createdRecord.libraryEntry.platform),
            };
            await db.games.put(persistedGame);
          }

          const libraryEntryId = Number(await db.libraryEntries.add({ ...createdRecord.libraryEntry, gameId }));
          await syncStructuredRelationsForRecord({
            game: { ...persistedGame, id: gameId },
            libraryEntry: { ...createdRecord.libraryEntry, id: libraryEntryId },
            extraStoreNames: payload.stores,
            extraPlatformNames: payload.platforms,
          });
          created += 1;
          continue;
        }

        const currentEntry = await db.libraryEntries.get(targetEntryId);
        const currentGame = currentEntry ? await db.games.get(currentEntry.gameId) : undefined;
        if (!currentEntry || !currentGame) {
          ignored += 1;
          continue;
        }

        const merged = mergeImportedGame({ game: currentGame, libraryEntry: currentEntry }, payload);
        await db.games.put(merged.game);
        const libraryEntryId = Number(
          await db.libraryEntries.put({
            ...merged.libraryEntry,
            gameId: merged.game.id ?? currentEntry.gameId,
          }),
        );
        await syncStructuredRelationsForRecord({
          game: merged.game,
          libraryEntry: { ...merged.libraryEntry, id: libraryEntryId },
          extraStoreNames: payload.stores,
          extraPlatformNames: payload.platforms,
        });
        updated += 1;
      }
    },
  );

  const now = new Date().toISOString();
  const changeList = args.importPreview
    .filter((preview) => preview.action !== "ignore")
    .map((preview) => ({ title: preview.payload.title, action: preview.action }));

  await db.importJobs
    .add({
      uuid: generateUuid(),
      version: 1,
      source: args.importSource,
      status: "completed",
      totalItems: args.importPreview.length,
      processedItems: created + updated,
      summary: `Importação concluída: ${created} novos, ${updated} atualizados, ${ignored} ignorados.`,
      changes: JSON.stringify(changeList),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .catch((error) => {
      // Falha ao registrar job concluído - não bloqueia o retorno
      logger.error("[ImportJob] Falha ao registrar job concluído:", error);
    });

  return { created, updated, ignored };
}

export function exportLibraryCsv(args: { records: LibraryRecord[]; tables: BackupTables; exportedAt?: string }) {
  const storeNamesByEntryId = buildStoreNamesByEntryId(args.tables.stores, args.tables.libraryEntryStores);
  const platformNamesByGameId = buildPlatformNamesByGameId(args.tables.platforms, args.tables.gamePlatforms);
  const content = gamesToCsv(
    args.records.map((record) =>
      recordToImportPayload(record, {
        storeNamesByEntryId,
        platformNamesByGameId,
      }),
    ),
  );

  return {
    filename: `arsenal-gamer-${(args.exportedAt ?? new Date().toISOString()).slice(0, 10)}.csv`,
    content,
    mimeType: "text/csv;charset=utf-8",
  };
}

export function exportBackupPayload(args: { tables: BackupTables; exportedAt?: string }): {
  totalRecords: number;
  payload: BackupPayload;
  filename: string;
  content: string;
  mimeType: string;
} {
  const totalRecords =
    args.tables.games.length +
    args.tables.libraryEntries.length +
    args.tables.stores.length +
    args.tables.libraryEntryStores.length +
    args.tables.platforms.length +
    args.tables.gamePlatforms.length +
    args.tables.playSessions.length +
    args.tables.reviews.length +
    args.tables.lists.length +
    args.tables.libraryEntryLists.length +
    args.tables.tags.length +
    args.tables.gameTags.length +
    args.tables.goals.length +
    args.tables.settings.length +
    args.tables.savedViews.length;

  const payload: BackupPayload = {
    version: 6,
    exportedAt: args.exportedAt ?? new Date().toISOString(),
    source: "mybacklog",
    ...args.tables,
  };

  return {
    totalRecords,
    payload,
    filename: `arsenal-gamer-backup-${payload.exportedAt.slice(0, 10)}.json`,
    content: JSON.stringify(payload, null, 2),
    mimeType: "application/json;charset=utf-8",
  };
}

export function prepareRestorePreview(args: {
  restoreText: string;
  restoreMode: RestoreMode;
  currentTables: BackupTables;
}): RestorePreview | null {
  const payload = parseBackupText(args.restoreText);
  if (!payload) return null;
  return buildRestorePreview(payload, args.restoreMode, args.currentTables);
}

export async function applyRestorePreview(preview: RestorePreview) {
  const payload = preview.payload;

  await db.transaction(
    "rw",
    [
      db.games,
      db.libraryEntries,
      db.stores,
      db.libraryEntryStores,
      db.platforms,
      db.gamePlatforms,
      db.playSessions,
      db.reviews,
      db.lists,
      db.libraryEntryLists,
      db.tags,
      db.gameTags,
      db.goals,
      db.settings,
      db.savedViews,
      db.importJobs,
    ],
    async () => {
      if (preview.mode === "replace") {
        await db.gamePlatforms.clear();
        await db.platforms.clear();
        await db.libraryEntryStores.clear();
        await db.stores.clear();
        await db.libraryEntryLists.clear();
        await db.gameTags.clear();
        await db.reviews.clear();
        await db.playSessions.clear();
        await db.goals.clear();
        await db.tags.clear();
        await db.lists.clear();
        await db.libraryEntries.clear();
        await db.games.clear();
        await db.settings.clear();
        await db.savedViews.clear();
        await db.importJobs.clear();

        if (payload.games.length) await db.games.bulkPut(payload.games);
        if (payload.libraryEntries.length) await db.libraryEntries.bulkPut(payload.libraryEntries);
        if (payload.stores.length) await db.stores.bulkPut(payload.stores);
        if (payload.libraryEntryStores.length) {
          await db.libraryEntryStores.bulkPut(payload.libraryEntryStores);
        }
        if (payload.platforms.length) await db.platforms.bulkPut(payload.platforms);
        if (payload.gamePlatforms.length) await db.gamePlatforms.bulkPut(payload.gamePlatforms);
        if (payload.playSessions.length) await db.playSessions.bulkPut(payload.playSessions);
        if (payload.reviews.length) await db.reviews.bulkPut(payload.reviews);
        if (payload.lists.length) await db.lists.bulkPut(payload.lists);
        if (payload.libraryEntryLists.length) {
          await db.libraryEntryLists.bulkPut(payload.libraryEntryLists);
        }
        if (payload.tags.length) await db.tags.bulkPut(payload.tags);
        if (payload.gameTags.length) await db.gameTags.bulkPut(payload.gameTags);
        if (payload.goals.length) await db.goals.bulkPut(payload.goals);
        if (payload.settings.length) await db.settings.bulkPut(payload.settings);
        if (payload.savedViews.length) await db.savedViews.bulkPut(payload.savedViews);
        return;
      }

      const [
        existingGames,
        existingEntries,
        existingStores,
        existingLibraryEntryStores,
        existingPlatforms,
        existingGamePlatforms,
        existingTags,
        existingLists,
        existingLibraryEntryLists,
        existingGoals,
        existingReviews,
        existingSessions,
        existingGameTags,
        existingSettings,
        existingSavedViews,
      ] = await Promise.all([
        db.games.toArray(),
        db.libraryEntries.toArray(),
        db.stores.toArray(),
        db.libraryEntryStores.toArray(),
        db.platforms.toArray(),
        db.gamePlatforms.toArray(),
        db.tags.toArray(),
        db.lists.toArray(),
        db.libraryEntryLists.toArray(),
        db.goals.toArray(),
        db.reviews.toArray(),
        db.playSessions.toArray(),
        db.gameTags.toArray(),
        db.settings.toArray(),
        db.savedViews.toArray(),
      ]);

      const existingGamesByTitle = new Map(
        existingGames.map((game) => [game.normalizedTitle || normalizeGameTitle(game.title), game] as const),
      );
      const existingStoreNamesByEntryId = buildStoreNamesByEntryId(existingStores, existingLibraryEntryStores);
      const existingPlatformNamesByGameId = buildPlatformNamesByGameId(existingPlatforms, existingGamePlatforms);
      const existingStoreMap = new Map(
        existingStores.map((store) => [store.name.trim().toLowerCase(), store] as const),
      );
      const existingPlatformMap = new Map(
        existingPlatforms.map((platform) => [platform.name.trim().toLowerCase(), platform] as const),
      );
      const existingEntryLookup = buildStructuredEntryLookup(composeLibraryRecords(existingGames, existingEntries), {
        storeNamesByEntryId: existingStoreNamesByEntryId,
        platformNamesByGameId: existingPlatformNamesByGameId,
      });
      const existingTagMap = new Map(existingTags.map((tag) => [tag.name.trim().toLowerCase(), tag] as const));
      const existingListMap = new Map(existingLists.map((list) => [list.name.trim().toLowerCase(), list] as const));
      const libraryEntryListSet = new Set(
        existingLibraryEntryLists.map((entry) => `${entry.libraryEntryId}::${entry.listId}`),
      );
      const existingGoalMap = new Map<string, DbGoal>(
        existingGoals.map((goal) => [`${goal.type}::${goal.period}`, goal] as const),
      );
      const existingReviewMap = new Map(existingReviews.map((review) => [review.libraryEntryId, review] as const));
      const sessionSet = new Set(
        existingSessions.map((session) => buildPlaySessionDedupKey(session.libraryEntryId, session)),
      );
      const gameTagSet = new Set(existingGameTags.map((entry) => `${entry.libraryEntryId}::${entry.tagId}`));
      const libraryEntryStoreSet = new Set(
        existingLibraryEntryStores.map((relation) => `${relation.libraryEntryId}::${relation.storeId}`),
      );
      const gamePlatformSet = new Set(
        existingGamePlatforms.map((relation) => `${relation.gameId}::${relation.platformId}`),
      );
      const existingSettingMap = new Map(existingSettings.map((setting) => [setting.key, setting] as const));
      const existingSavedViewMap = new Map<string, DbSavedView>(
        existingSavedViews.map((view) => [`${view.scope}::${view.name.trim().toLowerCase()}`, view] as const),
      );
      const payloadGamesById = new Map(payload.games.map((game) => [game.id, game] as const));
      const payloadStoreNamesByEntryId = buildStoreNamesByEntryId(payload.stores, payload.libraryEntryStores);
      const payloadPlatformNamesByGameId = buildPlatformNamesByGameId(payload.platforms, payload.gamePlatforms);
      const resolvedGameIdByPayloadId = new Map<number, number>();
      const resolvedEntryIdByPayloadId = new Map<number, number>();
      const resolvedStoreIdByPayloadId = new Map<number, number>();
      const resolvedPlatformIdByPayloadId = new Map<number, number>();
      const resolvedListIdByPayloadId = new Map<number, number>();
      const resolvedTagIdByPayloadId = new Map<number, number>();

      for (const game of payload.games) {
        const normalized = game.normalizedTitle || normalizeGameTitle(game.title);
        const existing = existingGamesByTitle.get(normalized);
        if (existing?.id != null) {
          if (game.id != null) resolvedGameIdByPayloadId.set(game.id, existing.id);
          const mergedGame = {
            ...existing,
            ...game,
            id: existing.id,
            normalizedTitle: normalized,
            platforms: mergePlatformList(existing.platforms, game.platforms || ""),
          };
          await db.games.put(mergedGame);
          existingGamesByTitle.set(normalized, mergedGame);
        } else {
          const nextId = Number(await db.games.add({ ...game, normalizedTitle: normalized }));
          existingGamesByTitle.set(normalized, { ...game, id: nextId, normalizedTitle: normalized });
          if (game.id != null) resolvedGameIdByPayloadId.set(game.id, nextId);
        }
      }

      for (const entry of payload.libraryEntries) {
        const payloadGame = payloadGamesById.get(entry.gameId);
        if (!payloadGame) continue;
        const existing = findStructuredLibraryRecordMatch(
          existingEntryLookup,
          createStructuredEntryIdentity({
            title: payloadGame.title,
            primaryPlatform: entry.platform,
            primaryStore: entry.sourceStore,
            platforms: resolveStructuredPlatforms(payloadGame, entry.platform, payloadPlatformNamesByGameId),
            stores: resolveStructuredStores(entry, payloadStoreNamesByEntryId),
          }),
        )?.libraryEntry;
        const gameId = resolvedGameIdByPayloadId.get(entry.gameId) ?? existing?.gameId;
        if (!gameId) continue;

        if (existing?.id != null) {
          if (entry.id != null) resolvedEntryIdByPayloadId.set(entry.id, existing.id);
          const nextEntry = { ...existing, ...entry, id: existing.id, gameId };
          await db.libraryEntries.put(nextEntry);
          const game = existingGamesByTitle.get(payloadGame.normalizedTitle || normalizeGameTitle(payloadGame.title));
          if (game?.id != null) {
            registerStructuredLibraryRecordMatch(
              existingEntryLookup,
              {
                game,
                libraryEntry: nextEntry,
              },
              {
                storeNamesByEntryId: payloadStoreNamesByEntryId,
                platformNamesByGameId: payloadPlatformNamesByGameId,
              },
            );
          }
        } else {
          const nextId = Number(await db.libraryEntries.add({ ...entry, id: undefined, gameId }));
          if (entry.id != null) resolvedEntryIdByPayloadId.set(entry.id, nextId);
          const game =
            existingGamesByTitle.get(payloadGame.normalizedTitle || normalizeGameTitle(payloadGame.title)) ??
            ({ ...payloadGame, id: gameId } as typeof payloadGame);
          registerStructuredLibraryRecordMatch(
            existingEntryLookup,
            {
              game,
              libraryEntry: { ...entry, id: nextId, gameId },
            },
            {
              storeNamesByEntryId: payloadStoreNamesByEntryId,
              platformNamesByGameId: payloadPlatformNamesByGameId,
            },
          );
        }
      }

      for (const store of payload.stores) {
        const key = store.name.trim().toLowerCase();
        if (!key) continue;
        const existing = existingStoreMap.get(key);
        if (existing?.id != null) {
          if (store.id != null) resolvedStoreIdByPayloadId.set(store.id, existing.id);
          await db.stores.put({ ...existing, ...store, id: existing.id, normalizedName: key });
        } else {
          const nextId = Number(
            await db.stores.add({ ...store, id: undefined, name: store.name.trim(), normalizedName: key }),
          );
          existingStoreMap.set(key, { ...store, id: nextId, name: store.name.trim(), normalizedName: key });
          if (store.id != null) resolvedStoreIdByPayloadId.set(store.id, nextId);
        }
      }

      for (const platform of payload.platforms) {
        const key = platform.name.trim().toLowerCase();
        if (!key) continue;
        const existing = existingPlatformMap.get(key);
        if (existing?.id != null) {
          if (platform.id != null) resolvedPlatformIdByPayloadId.set(platform.id, existing.id);
          await db.platforms.put({ ...existing, ...platform, id: existing.id, normalizedName: key });
        } else {
          const nextId = Number(
            await db.platforms.add({
              ...platform,
              id: undefined,
              name: platform.name.trim(),
              normalizedName: key,
            }),
          );
          existingPlatformMap.set(key, {
            ...platform,
            id: nextId,
            name: platform.name.trim(),
            normalizedName: key,
          });
          if (platform.id != null) resolvedPlatformIdByPayloadId.set(platform.id, nextId);
        }
      }

      for (const relation of payload.libraryEntryStores) {
        const libraryEntryId = resolvedEntryIdByPayloadId.get(relation.libraryEntryId);
        const storeId = resolvedStoreIdByPayloadId.get(relation.storeId);
        if (!libraryEntryId || !storeId) continue;
        const key = `${libraryEntryId}::${storeId}`;
        if (libraryEntryStoreSet.has(key)) {
          if (relation.isPrimary) {
            const existingPrimary = await db.libraryEntryStores
              .where("libraryEntryId")
              .equals(libraryEntryId)
              .toArray();
            for (const item of existingPrimary) {
              if (item.id != null) {
                await db.libraryEntryStores.update(item.id, { isPrimary: item.storeId === storeId });
              }
            }
          }
          continue;
        }
        if (relation.isPrimary) {
          const existingPrimary = await db.libraryEntryStores.where("libraryEntryId").equals(libraryEntryId).toArray();
          for (const item of existingPrimary) {
            if (item.id != null && item.isPrimary) {
              await db.libraryEntryStores.update(item.id, { isPrimary: false });
            }
          }
        }
        libraryEntryStoreSet.add(key);
        const now = new Date().toISOString();
        await db.libraryEntryStores.add({
          uuid: generateUuid(),
          version: 1,
          libraryEntryId,
          storeId,
          isPrimary: relation.isPrimary,
          createdAt: relation.createdAt || now,
          updatedAt: now,
          deletedAt: null,
        });
      }

      for (const relation of payload.gamePlatforms) {
        const gameId = resolvedGameIdByPayloadId.get(relation.gameId);
        const platformId = resolvedPlatformIdByPayloadId.get(relation.platformId);
        if (!gameId || !platformId) continue;
        const key = `${gameId}::${platformId}`;
        if (gamePlatformSet.has(key)) continue;
        gamePlatformSet.add(key);
        const now = new Date().toISOString();
        await db.gamePlatforms.add({
          uuid: generateUuid(),
          version: 1,
          gameId,
          platformId,
          createdAt: relation.createdAt || now,
          updatedAt: now,
          deletedAt: null,
        });
      }

      for (const list of payload.lists) {
        const key = list.name.trim().toLowerCase();
        if (!key) continue;
        const existing = existingListMap.get(key);
        if (existing?.id != null) {
          if (list.id != null) resolvedListIdByPayloadId.set(list.id, existing.id);
          await db.lists.put({ ...existing, ...list, id: existing.id });
        } else {
          const nextId = Number(await db.lists.add({ ...list, id: undefined, name: list.name.trim() }));
          existingListMap.set(key, { ...list, id: nextId, name: list.name.trim() });
          if (list.id != null) resolvedListIdByPayloadId.set(list.id, nextId);
        }
      }

      for (const relation of payload.libraryEntryLists) {
        const libraryEntryId = resolvedEntryIdByPayloadId.get(relation.libraryEntryId);
        const listId = resolvedListIdByPayloadId.get(relation.listId);
        if (!libraryEntryId || !listId) continue;
        const key = `${libraryEntryId}::${listId}`;
        if (libraryEntryListSet.has(key)) continue;
        libraryEntryListSet.add(key);
        const now = new Date().toISOString();
        await db.libraryEntryLists.add({
          uuid: generateUuid(),
          version: 1,
          libraryEntryId,
          listId,
          createdAt: relation.createdAt || now,
          updatedAt: now,
          deletedAt: null,
        });
      }

      for (const tag of payload.tags) {
        const key = tag.name.trim().toLowerCase();
        if (!key) continue;
        const existing = existingTagMap.get(key);
        if (existing?.id != null) {
          if (tag.id != null) resolvedTagIdByPayloadId.set(tag.id, existing.id);
        } else {
          const nextId = Number(await db.tags.add({ ...tag, id: undefined, name: tag.name.trim() }));
          existingTagMap.set(key, { ...tag, id: nextId, name: tag.name.trim() });
          if (tag.id != null) resolvedTagIdByPayloadId.set(tag.id, nextId);
        }
      }

      for (const goal of payload.goals) {
        const key = `${goal.type}::${goal.period}`;
        const existing = existingGoalMap.get(key);
        if (existing?.id != null) {
          const nextGoal = { ...existing, ...goal, id: existing.id };
          await db.goals.put(nextGoal);
          existingGoalMap.set(key, nextGoal);
        } else {
          const nextId = Number(await db.goals.add({ ...goal, id: undefined }));
          existingGoalMap.set(key, { ...goal, id: nextId });
        }
      }

      const reviewSeen = new Set<number>();
      for (const review of payload.reviews) {
        const libraryEntryId = resolvedEntryIdByPayloadId.get(review.libraryEntryId);
        if (!libraryEntryId || reviewSeen.has(libraryEntryId)) continue;
        reviewSeen.add(libraryEntryId);
        const existing = existingReviewMap.get(libraryEntryId);
        if (existing?.id != null) {
          const nextReview = { ...existing, ...review, id: existing.id, libraryEntryId };
          await db.reviews.put(nextReview);
          existingReviewMap.set(libraryEntryId, nextReview);
        } else {
          const nextId = Number(await db.reviews.add({ ...review, id: undefined, libraryEntryId }));
          existingReviewMap.set(libraryEntryId, { ...review, id: nextId, libraryEntryId });
        }
      }

      for (const session of payload.playSessions) {
        const libraryEntryId = resolvedEntryIdByPayloadId.get(session.libraryEntryId);
        if (!libraryEntryId) continue;
        const signature = buildPlaySessionDedupKey(libraryEntryId, session);
        if (sessionSet.has(signature)) continue;
        sessionSet.add(signature);
        const libraryEntry = await db.libraryEntries.get(libraryEntryId);
        await db.playSessions.add({
          ...session,
          id: undefined,
          libraryEntryId,
          platform: session.platform || libraryEntry?.platform || "PC",
        });
      }

      for (const relation of payload.gameTags) {
        const libraryEntryId = resolvedEntryIdByPayloadId.get(relation.libraryEntryId);
        const tagId = resolvedTagIdByPayloadId.get(relation.tagId);
        if (!libraryEntryId || !tagId) continue;
        const key = `${libraryEntryId}::${tagId}`;
        if (gameTagSet.has(key)) continue;
        gameTagSet.add(key);
        const now = new Date().toISOString();
        await db.gameTags.add({
          uuid: generateUuid(),
          version: 1,
          libraryEntryId,
          tagId,
          createdAt: relation.createdAt || now,
          updatedAt: now,
          deletedAt: null,
        });
      }

      for (const setting of payload.settings) {
        const existing = existingSettingMap.get(setting.key);
        if (existing?.id != null) {
          const nextSetting = { ...existing, ...setting, id: existing.id };
          await db.settings.put(nextSetting);
          existingSettingMap.set(setting.key, nextSetting);
        } else {
          const nextId = Number(await db.settings.add({ ...setting, id: undefined }));
          existingSettingMap.set(setting.key, { ...setting, id: nextId });
        }
      }

      for (const view of payload.savedViews) {
        const key = `${view.scope}::${view.name.trim().toLowerCase()}`;
        const existing = existingSavedViewMap.get(key);
        if (existing?.id != null) {
          await db.savedViews.put({
            ...existing,
            ...view,
            id: existing.id,
            createdAt: existing.createdAt || view.createdAt,
            updatedAt: existing.updatedAt > view.updatedAt ? existing.updatedAt : view.updatedAt,
          });
        } else {
          const nextId = Number(await db.savedViews.add({ ...view, id: undefined }));
          existingSavedViewMap.set(key, { ...view, id: nextId });
        }
      }
    },
  );
}
