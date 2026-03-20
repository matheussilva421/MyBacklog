import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Game as DbGameMetadata,
  GamePlatform as DbGamePlatform,
  GameTag as DbGameTag,
  Goal as DbGoal,
  ImportJob as DbImportJob,
  LibraryEntry as DbLibraryEntry,
  LibraryEntryStore as DbLibraryEntryStore,
  LibraryEntryList as DbLibraryEntryList,
  List as DbList,
  Platform as DbPlatform,
  PlaySession as DbPlaySession,
  Review as DbReview,
  SavedView as DbSavedView,
  Setting as DbSetting,
  Store as DbStore,
  Tag as DbTag,
} from "../core/types";
import { db } from "../core/db";
import { syncStructuredRelationsForRecord } from "../core/structuredDataSync";
import {
  defaultGameToDbGame,
  defaultGameToDbLibraryEntry,
  defaultGames,
} from "../backlog/shared";

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(rows: T[]) {
  return [...rows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

type BacklogDataSnapshot = {
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

async function seedDefaultLibrary() {
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

async function readBacklogDataSnapshot(seed = false): Promise<BacklogDataSnapshot> {
  let storedEntries = await db.libraryEntries.orderBy("updatedAt").reverse().toArray();
  if (seed && storedEntries.length === 0) {
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

export function useBacklogDataState() {
  const [gameRows, setGameRows] = useState<DbGameMetadata[]>([]);
  const [libraryEntryRows, setLibraryEntryRows] = useState<DbLibraryEntry[]>([]);
  const [libraryEntryListRows, setLibraryEntryListRows] = useState<DbLibraryEntryList[]>([]);
  const [libraryEntryStoreRows, setLibraryEntryStoreRows] = useState<DbLibraryEntryStore[]>([]);
  const [sessionRows, setSessionRows] = useState<DbPlaySession[]>([]);
  const [reviewRows, setReviewRows] = useState<DbReview[]>([]);
  const [tagRows, setTagRows] = useState<DbTag[]>([]);
  const [gameTagRows, setGameTagRows] = useState<DbGameTag[]>([]);
  const [goalRows, setGoalRows] = useState<DbGoal[]>([]);
  const [listRows, setListRows] = useState<DbList[]>([]);
  const [settingRows, setSettingRows] = useState<DbSetting[]>([]);
  const [savedViewRows, setSavedViewRows] = useState<DbSavedView[]>([]);
  const [importJobRows, setImportJobRows] = useState<DbImportJob[]>([]);
  const [storeRows, setStoreRows] = useState<DbStore[]>([]);
  const [platformRows, setPlatformRows] = useState<DbPlatform[]>([]);
  const [gamePlatformRows, setGamePlatformRows] = useState<DbGamePlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isMountedRef = useRef(true);
  const refreshRequestRef = useRef(0);

  const refreshData = useCallback(async (seed = false) => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;

    const snapshot = await readBacklogDataSnapshot(seed);
    if (!isMountedRef.current || requestId !== refreshRequestRef.current) return;

    setGameRows(snapshot.gameRows);
    setLibraryEntryRows(snapshot.libraryEntryRows);
    setSessionRows(snapshot.sessionRows);
    setReviewRows(snapshot.reviewRows);
    setTagRows(snapshot.tagRows);
    setGameTagRows(snapshot.gameTagRows);
    setGoalRows(snapshot.goalRows);
    setListRows(snapshot.listRows);
    setLibraryEntryListRows(snapshot.libraryEntryListRows);
    setLibraryEntryStoreRows(snapshot.libraryEntryStoreRows);
    setSettingRows(snapshot.settingRows);
    setSavedViewRows(snapshot.savedViewRows);
    setImportJobRows(snapshot.importJobRows);
    setStoreRows(snapshot.storeRows);
    setPlatformRows(snapshot.platformRows);
    setGamePlatformRows(snapshot.gamePlatformRows);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      refreshRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await refreshData(true);
      } catch {
        if (active) setNotice("Falha ao carregar a biblioteca local.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshData]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return {
    gameRows,
    libraryEntryRows,
    libraryEntryListRows,
    libraryEntryStoreRows,
    sessionRows,
    reviewRows,
    tagRows,
    gameTagRows,
    goalRows,
    listRows,
    settingRows,
    savedViewRows,
    importJobRows,
    storeRows,
    platformRows,
    gamePlatformRows,
    loading,
    notice,
    submitting,
    setLoading,
    setNotice,
    setSubmitting,
    refreshData,
  };
}
