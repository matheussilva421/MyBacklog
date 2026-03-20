import { useMemo } from "react";
import { buildCatalogMaintenanceReport } from "../utils/catalogMaintenance";
import type {
  Game,
  GamePlatform,
  GameTag,
  LibraryEntry,
  LibraryEntryList,
  LibraryEntryStore,
  List,
  Platform,
  PlaySession,
  Review,
  Store,
  Tag,
} from "../../../core/types";

export function useCatalogMaintenanceState(args: {
  gameRows: Game[];
  libraryEntryRows: LibraryEntry[];
  sessionRows: PlaySession[];
  reviewRows: Review[];
  listRows: List[];
  libraryEntryListRows: LibraryEntryList[];
  storeRows: Store[];
  libraryEntryStoreRows: LibraryEntryStore[];
  platformRows: Platform[];
  gamePlatformRows: GamePlatform[];
  tagRows: Tag[];
  gameTagRows: GameTag[];
}) {
  const {
    gameRows,
    libraryEntryRows,
    sessionRows,
    reviewRows,
    listRows,
    libraryEntryListRows,
    storeRows,
    libraryEntryStoreRows,
    platformRows,
    gamePlatformRows,
    tagRows,
    gameTagRows,
  } = args;

  return useMemo(
    () =>
      buildCatalogMaintenanceReport({
        games: gameRows,
        libraryEntries: libraryEntryRows,
        sessions: sessionRows,
        reviews: reviewRows,
        lists: listRows,
        libraryEntryLists: libraryEntryListRows,
        stores: storeRows,
        libraryEntryStores: libraryEntryStoreRows,
        platforms: platformRows,
        gamePlatforms: gamePlatformRows,
        tags: tagRows,
        gameTags: gameTagRows,
      }),
    [
      gameRows,
      libraryEntryRows,
      sessionRows,
      reviewRows,
      listRows,
      libraryEntryListRows,
      storeRows,
      libraryEntryStoreRows,
      platformRows,
      gamePlatformRows,
      tagRows,
      gameTagRows,
    ],
  );
}
