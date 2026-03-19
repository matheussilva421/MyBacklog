import { useMemo } from "react";
import { buildCatalogMaintenanceReport } from "../utils/catalogMaintenance";
import type {
  Game,
  GameTag,
  LibraryEntry,
  LibraryEntryList,
  List,
  PlaySession,
  Review,
  Tag,
} from "../../../core/types";

export function useCatalogMaintenanceState(args: {
  gameRows: Game[];
  libraryEntryRows: LibraryEntry[];
  sessionRows: PlaySession[];
  reviewRows: Review[];
  listRows: List[];
  libraryEntryListRows: LibraryEntryList[];
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
        tags: tagRows,
        gameTags: gameTagRows,
      }),
    [gameRows, libraryEntryRows, sessionRows, reviewRows, listRows, libraryEntryListRows, tagRows, gameTagRows],
  );
}
