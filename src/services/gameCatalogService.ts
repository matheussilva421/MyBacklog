import {
  createDbGameFromForm,
  mergePlatformList,
  type GameFormState,
  type LibraryRecord,
} from "../backlog/shared";
import { db } from "../core/db";
import { syncStructuredRelationsForRecord } from "../core/structuredDataSync";
import {
  buildPlatformNamesByGameId,
  buildStoreNamesByEntryId,
  derivePrimaryPlatform,
  derivePrimaryStore,
  resolveStructuredPlatforms,
  resolveStructuredStores,
} from "../core/structuredRelations";
import type { Game as DbGameMetadata, LibraryEntry as DbLibraryEntry } from "../core/types";
import type { AppPreferences } from "../modules/settings/utils/preferences";
import {
  fetchRawgMetadata,
  resolveBestRawgCandidate,
} from "../modules/import-export/utils/rawg";

function logRawgWarning(message: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.warn(message, error);
}

export async function normalizeStructuredEntry(libraryEntryId: number) {
  const entry = await db.libraryEntries.get(libraryEntryId);
  if (!entry?.id) return false;
  const game = await db.games.get(entry.gameId);
  if (!game?.id) return false;

  const [storeRows, libraryEntryStoreRows, platformRows, gamePlatformRows] = await Promise.all([
    db.stores.toArray(),
    db.libraryEntryStores.where("libraryEntryId").equals(entry.id).toArray(),
    db.platforms.toArray(),
    db.gamePlatforms.where("gameId").equals(game.id).toArray(),
  ]);
  const storeNamesByEntryId = buildStoreNamesByEntryId(storeRows, libraryEntryStoreRows);
  const platformNamesByGameId = buildPlatformNamesByGameId(platformRows, gamePlatformRows);
  const nextStores = resolveStructuredStores(entry, storeNamesByEntryId);
  const nextPlatforms = resolveStructuredPlatforms(game, entry.platform, platformNamesByGameId);
  const now = new Date().toISOString();

  const nextEntry: DbLibraryEntry = {
    ...entry,
    sourceStore: derivePrimaryStore(nextStores, entry.sourceStore),
    platform: derivePrimaryPlatform(nextPlatforms, entry.platform),
    updatedAt: now,
  };
  const nextGame: DbGameMetadata = {
    ...game,
    platforms: nextPlatforms.join(", "),
    updatedAt: now,
  };

  await db.libraryEntries.put(nextEntry);
  await db.games.put(nextGame);
  await syncStructuredRelationsForRecord({
    game: nextGame,
    libraryEntry: nextEntry,
    extraStoreNames: nextStores,
    extraPlatformNames: nextPlatforms,
  });

  return true;
}

export async function saveGameFromForm(args: {
  mode: "create" | "edit" | null;
  gameForm: GameFormState;
  selectedRecord?: LibraryRecord;
  preferences: AppPreferences;
}): Promise<{ entryId?: number }> {
  const current = args.mode === "edit" ? args.selectedRecord : undefined;
  let payload = createDbGameFromForm(args.gameForm, current);

  if (args.preferences.rawgApiKey.trim() && !current?.game.rawgId) {
    try {
      const bestCandidate = await resolveBestRawgCandidate(
        payload.game.title,
        args.preferences.rawgApiKey.trim(),
      );
      if (bestCandidate) {
        const metadata = await fetchRawgMetadata(
          bestCandidate.rawgId,
          args.preferences.rawgApiKey.trim(),
        );
        if (metadata) {
          payload = {
            game: {
              ...payload.game,
              slug: payload.game.slug || metadata.slug,
              coverUrl: payload.game.coverUrl || metadata.coverUrl,
              rawgId: payload.game.rawgId ?? metadata.rawgId,
              genres: payload.game.genres || metadata.genres,
              releaseYear: payload.game.releaseYear ?? metadata.releaseYear,
              platforms: mergePlatformList(
                payload.game.platforms || metadata.platforms,
                payload.libraryEntry.platform,
              ),
              developer: payload.game.developer || metadata.developer,
              publisher: payload.game.publisher || metadata.publisher,
            },
            libraryEntry: payload.libraryEntry,
          };
        }
      }
    } catch (rawgError) {
      logRawgWarning("[RAWG] Enriquecimento de metadados falhou:", rawgError);
    }
  }

  let entryId = payload.libraryEntry.id;
  await db.transaction(
    "rw",
    [
      db.games,
      db.libraryEntries,
      db.stores,
      db.libraryEntryStores,
      db.platforms,
      db.gamePlatforms,
    ],
    async () => {
      let gameId = payload.game.id;
      let persistedGame = payload.game;
      if (gameId == null) {
        const existingMetadata = await db.games
          .where("normalizedTitle")
          .equals(payload.game.normalizedTitle)
          .first();

        if (existingMetadata?.id != null) {
          gameId = existingMetadata.id;
          persistedGame = {
            ...existingMetadata,
            ...payload.game,
            id: existingMetadata.id,
            platforms: mergePlatformList(
              existingMetadata.platforms,
              payload.libraryEntry.platform,
            ),
          };
          await db.games.put(persistedGame);
        } else {
          gameId = Number(await db.games.add(payload.game));
          persistedGame = { ...payload.game, id: gameId };
        }
      } else {
        await db.games.put(payload.game);
        persistedGame = payload.game;
      }

      entryId = Number(
        await db.libraryEntries.put({
          ...payload.libraryEntry,
          gameId,
        }),
      );
      await syncStructuredRelationsForRecord({
        game: { ...persistedGame, id: gameId },
        libraryEntry: { ...payload.libraryEntry, id: entryId },
        extraStoreNames: args.gameForm.stores,
        extraPlatformNames: args.gameForm.platforms,
      });
    },
  );

  return { entryId };
}
