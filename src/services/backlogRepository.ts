import type { BackupTables } from "../backlog/shared";
import { defaultGameToDbGame, defaultGameToDbLibraryEntry, defaultGames } from "../backlog/shared";
import { db } from "../core/db";
import { syncStructuredRelationsForRecord } from "../core/structuredDataSync";
import type {
  Game as DbGameMetadata,
  GamePlatform as DbGamePlatform,
  GameTag as DbGameTag,
  Goal as DbGoal,
  ImportJob as DbImportJob,
  LibraryEntry as DbLibraryEntry,
  LibraryEntryList as DbLibraryEntryList,
  LibraryEntryStore as DbLibraryEntryStore,
  List as DbList,
  Platform as DbPlatform,
  PlaySession as DbPlaySession,
  Review as DbReview,
  SavedView as DbSavedView,
  Setting as DbSetting,
  Store as DbStore,
  Tag as DbTag,
} from "../core/types";

export type BacklogDataSnapshot = {
  gameRows: DbGameMetadata[];
  libraryEntryRows: DbLibraryEntry[];
  libraryEntryListRows: DbLibraryEntryList[];
  libraryEntryStoreRows: DbLibraryEntryStore[];
  sessionRows: DbPlaySession[];
  reviewRows: DbReview[];
  tagRows: DbTag[];
  gameTagRows: DbGameTag[];
  goalRows: DbGoal[];
  listRows: DbList[];
  settingRows: DbSetting[];
  savedViewRows: DbSavedView[];
  importJobRows: DbImportJob[];
  storeRows: DbStore[];
  platformRows: DbPlatform[];
  gamePlatformRows: DbGamePlatform[];
};

export const emptyBacklogDataSnapshot: BacklogDataSnapshot = {
  gameRows: [],
  libraryEntryRows: [],
  libraryEntryListRows: [],
  libraryEntryStoreRows: [],
  sessionRows: [],
  reviewRows: [],
  tagRows: [],
  gameTagRows: [],
  goalRows: [],
  listRows: [],
  settingRows: [],
  savedViewRows: [],
  importJobRows: [],
  storeRows: [],
  platformRows: [],
  gamePlatformRows: [],
};

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(rows: T[]) {
  return [...rows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function seedDefaultLibrary() {
  try {
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
        for (const template of defaultGames) {
          const game = defaultGameToDbGame(template);
          const gameId = Number(await db.games.add(game));
          const libraryEntry = defaultGameToDbLibraryEntry(template);
          const libraryEntryId = Number(await db.libraryEntries.add({ ...libraryEntry, gameId }));
          await syncStructuredRelationsForRecord({
            game: { ...game, id: gameId },
            libraryEntry: { ...libraryEntry, id: libraryEntryId },
          });
        }
      },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao semear a biblioteca padrão. A transação local foi revertida: ${detail}`);
  }
}

export async function readBacklogDataSnapshot(seedIfEmpty = false): Promise<BacklogDataSnapshot> {
  let storedEntries = await db.libraryEntries.orderBy("updatedAt").reverse().toArray();
  if (seedIfEmpty && storedEntries.length === 0) {
    await seedDefaultLibrary();
    storedEntries = await db.libraryEntries.orderBy("updatedAt").reverse().toArray();
  }

  const [
    storedGames,
    storedSessions,
    storedReviews,
    storedTags,
    storedGameTags,
    storedGoals,
    storedLists,
    storedLibraryEntryLists,
    storedLibraryEntryStores,
    storedSettings,
    storedSavedViews,
    storedImportJobs,
    storedStores,
    storedPlatforms,
    storedGamePlatforms,
  ] = await Promise.all([
    db.games.toArray(),
    db.playSessions.orderBy("date").reverse().toArray(),
    db.reviews.toArray(),
    db.tags.toArray(),
    db.gameTags.toArray(),
    db.goals.toArray(),
    db.lists.toArray(),
    db.libraryEntryLists.toArray(),
    db.libraryEntryStores.toArray(),
    db.settings.toArray(),
    db.savedViews.toArray(),
    db.importJobs.orderBy("createdAt").reverse().toArray(),
    db.stores.toArray(),
    db.platforms.toArray(),
    db.gamePlatforms.toArray(),
  ]);

  return {
    gameRows: sortByUpdatedAtDesc(storedGames),
    libraryEntryRows: storedEntries,
    sessionRows: storedSessions,
    reviewRows: storedReviews,
    tagRows: storedTags,
    gameTagRows: storedGameTags,
    goalRows: storedGoals,
    listRows: storedLists,
    libraryEntryListRows: storedLibraryEntryLists,
    libraryEntryStoreRows: storedLibraryEntryStores,
    settingRows: storedSettings,
    savedViewRows: sortByUpdatedAtDesc(storedSavedViews),
    importJobRows: storedImportJobs,
    storeRows: storedStores,
    platformRows: storedPlatforms,
    gamePlatformRows: storedGamePlatforms,
  };
}

export async function readBackupTables(): Promise<BackupTables> {
  const [
    games,
    libraryEntries,
    stores,
    libraryEntryStores,
    platforms,
    gamePlatforms,
    playSessions,
    reviews,
    lists,
    libraryEntryLists,
    tags,
    gameTags,
    goals,
    settings,
    savedViews,
  ] = await Promise.all([
    db.games.toArray(),
    db.libraryEntries.toArray(),
    db.stores.toArray(),
    db.libraryEntryStores.toArray(),
    db.platforms.toArray(),
    db.gamePlatforms.toArray(),
    db.playSessions.toArray(),
    db.reviews.toArray(),
    db.lists.toArray(),
    db.libraryEntryLists.toArray(),
    db.tags.toArray(),
    db.gameTags.toArray(),
    db.goals.toArray(),
    db.settings.toArray(),
    db.savedViews.toArray(),
  ]);

  return {
    games,
    libraryEntries,
    stores,
    libraryEntryStores,
    platforms,
    gamePlatforms,
    playSessions,
    reviews,
    lists,
    libraryEntryLists,
    tags,
    gameTags,
    goals,
    settings,
    savedViews,
  };
}
