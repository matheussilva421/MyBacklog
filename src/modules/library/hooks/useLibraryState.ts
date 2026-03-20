import { useMemo } from "react";
import type { Game, LibraryListFilter, LibraryRecord, StatusFilter } from "../../../backlog/shared";
import type {
  GameTag,
  LibraryEntryList,
  LibraryViewGroupBy,
  LibraryViewSortBy,
  LibraryViewSortDirection,
  List,
  SavedView,
  Tag,
} from "../../../core/types";
import {
  doesSavedViewMatchLibraryState,
  groupLibraryGames,
  sortLibraryGames,
} from "../utils/savedViews";

type UseLibraryStateArgs = {
  games: Game[];
  recordsByEntryId: Map<number | undefined, LibraryRecord>;
  tagById: Map<number | undefined, Tag>;
  listById: Map<number | undefined, List>;
  gameTagRows: GameTag[];
  libraryEntryListRows: LibraryEntryList[];
  query: string;
  searchQuery: string;
  filter: StatusFilter;
  selectedListFilter: LibraryListFilter;
  sortBy: LibraryViewSortBy;
  sortDirection: LibraryViewSortDirection;
  groupBy: LibraryViewGroupBy;
  savedViews: SavedView[];
  selectedGameId: number;
};

function matchesCollection(values: Array<string | number>, query: string): boolean {
  if (!query) return true;
  return values.some((value) => String(value).toLowerCase().includes(query));
}

export function useLibraryState({
  games,
  recordsByEntryId,
  tagById,
  listById,
  gameTagRows,
  libraryEntryListRows,
  query,
  searchQuery,
  filter,
  selectedListFilter,
  sortBy,
  sortDirection,
  groupBy,
  savedViews,
  selectedGameId,
}: UseLibraryStateArgs) {
  const tagNamesByEntryId = useMemo(() => {
    const map = new Map<number, string>();
    for (const relation of gameTagRows) {
      const tag = tagById.get(relation.tagId);
      if (!tag) continue;
      const current = map.get(relation.libraryEntryId) ?? "";
      map.set(relation.libraryEntryId, current ? `${current}, ${tag.name}` : tag.name);
    }
    return map;
  }, [gameTagRows, tagById]);

  const listIdsByEntryId = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const relation of libraryEntryListRows) {
      const current = map.get(relation.libraryEntryId) ?? [];
      current.push(relation.listId);
      map.set(relation.libraryEntryId, current);
    }
    return map;
  }, [libraryEntryListRows]);

  const listNamesByEntryId = useMemo(() => {
    const map = new Map<number, string>();
    for (const [entryId, listIds] of listIdsByEntryId.entries()) {
      const names = listIds
        .map((listId) => listById.get(listId)?.name)
        .filter((value): value is string => Boolean(value));
      map.set(entryId, names.join(", "));
    }
    return map;
  }, [listById, listIdsByEntryId]);

  const listCountsById = useMemo(() => {
    const map = new Map<number, number>();
    for (const relation of libraryEntryListRows) {
      map.set(relation.listId, (map.get(relation.listId) ?? 0) + 1);
    }
    return map;
  }, [libraryEntryListRows]);

  const listOptions = useMemo(
    () =>
      Array.from(listById.values())
        .filter((list): list is List & { id: number } => list.id != null)
        .map((list) => ({
          id: list.id,
          name: list.name,
          count: listCountsById.get(list.id) ?? 0,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    [listById, listCountsById],
  );

  const searchedGames = useMemo(
    () =>
      games.filter((game) =>
        matchesCollection(
          [
            game.title,
            game.platform,
            game.platforms?.join(", ") ?? "",
            game.stores?.join(", ") ?? "",
            game.genre,
            game.mood,
            game.notes,
            game.difficulty,
            tagNamesByEntryId.get(game.id) ?? "",
            listNamesByEntryId.get(game.id) ?? "",
          ],
          searchQuery,
        ),
      ),
    [games, listNamesByEntryId, searchQuery, tagNamesByEntryId],
  );

  const libraryGames = useMemo(
    () =>
      searchedGames.filter((game) => {
        const matchesStatus = filter === "Todos" ? true : game.status === filter;
        const matchesList =
          selectedListFilter === "all"
            ? true
            : (listIdsByEntryId.get(game.id) ?? []).includes(selectedListFilter);
        return matchesStatus && matchesList;
      }),
    [filter, listIdsByEntryId, searchedGames, selectedListFilter],
  );

  const sortedLibraryGames = useMemo(
    () => sortLibraryGames(libraryGames, recordsByEntryId, sortBy, sortDirection),
    [libraryGames, recordsByEntryId, sortBy, sortDirection],
  );

  const groupedLibraryGames = useMemo(
    () => groupLibraryGames(sortedLibraryGames, recordsByEntryId, groupBy),
    [groupBy, recordsByEntryId, sortedLibraryGames],
  );

  const activeSavedView = useMemo(
    () =>
      savedViews.find((view) =>
        doesSavedViewMatchLibraryState(view, {
          query,
          filter,
          selectedListFilter,
          sortBy,
          sortDirection,
          groupBy,
        }),
      ),
    [filter, groupBy, query, savedViews, selectedListFilter, sortBy, sortDirection],
  );

  const currentViewDraft = useMemo(
    () => ({
      query,
      filter,
      selectedListFilter,
      sortBy,
      sortDirection,
      groupBy,
    }),
    [filter, groupBy, query, selectedListFilter, sortBy, sortDirection],
  );

  const selectedGame =
    sortedLibraryGames.find((game) => game.id === selectedGameId) ??
    searchedGames.find((game) => game.id === selectedGameId) ??
    games.find((game) => game.id === selectedGameId) ??
    games[0];

  const selectedRecord = selectedGame ? recordsByEntryId.get(selectedGame.id) : undefined;

  const selectedGameLists = useMemo(() => {
    if (!selectedGame) return [];
    return (listIdsByEntryId.get(selectedGame.id) ?? [])
      .map((listId) => listById.get(listId))
      .filter((list): list is List => Boolean(list));
  }, [listById, listIdsByEntryId, selectedGame]);

  return {
    tagNamesByEntryId,
    listIdsByEntryId,
    listOptions,
    searchedGames,
    libraryGames: sortedLibraryGames,
    groupedLibraryGames,
    selectedGame,
    selectedRecord,
    selectedGameLists,
    activeSavedView,
    currentViewDraft,
  };
}
