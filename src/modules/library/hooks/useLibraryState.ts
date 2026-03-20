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
  // Combinar todos os maps derivados em um único useMemo para evitar recálculos em cascata
  const derivedMaps = useMemo(() => {
    const tagNamesMap = new Map<number, string>();
    const listIdsMap = new Map<number, number[]>();
    const listCountsMap = new Map<number, number>();

    // Processar tags
    for (const relation of gameTagRows) {
      const tag = tagById.get(relation.tagId);
      if (!tag) continue;
      const current = tagNamesMap.get(relation.libraryEntryId) ?? "";
      tagNamesMap.set(relation.libraryEntryId, current ? `${current}, ${tag.name}` : tag.name);
    }

    // Processar listas
    for (const relation of libraryEntryListRows) {
      const current = listIdsMap.get(relation.libraryEntryId) ?? [];
      current.push(relation.listId);
      listIdsMap.set(relation.libraryEntryId, current);

      const count = listCountsMap.get(relation.listId) ?? 0;
      listCountsMap.set(relation.listId, count + 1);
    }

    // Processar nomes das listas
    const listNamesMap = new Map<number, string>();
    for (const [entryId, listIds] of listIdsMap.entries()) {
      const names = listIds
        .map((listId) => listById.get(listId)?.name)
        .filter((value): value is string => Boolean(value));
      listNamesMap.set(entryId, names.join(", "));
    }

    return { tagNamesMap, listIdsMap, listNamesMap, listCountsMap };
  }, [gameTagRows, libraryEntryListRows, tagById, listById]);

  const { tagNamesMap, listIdsMap, listNamesMap, listCountsMap } = derivedMaps;

  const listOptions = useMemo(
    () =>
      Array.from(listById.values())
        .filter((list): list is List & { id: number } => list.id != null)
        .map((list) => ({
          id: list.id,
          name: list.name,
          count: listCountsMap.get(list.id) ?? 0,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    [listById, listCountsMap],
  );

  // Combinar search e filter em um único useMemo
  const filteredAndSearchedGames = useMemo(() => {
    const hasSearchQuery = searchQuery.length > 0;
    const hasStatusFilter = filter !== "Todos";
    const hasListFilter = selectedListFilter !== "all";

    return games.filter((game) => {
      // Search
      if (hasSearchQuery) {
        const matchesSearch = matchesCollection(
          [
            game.title,
            game.platform,
            game.platforms?.join(", ") ?? "",
            game.stores?.join(", ") ?? "",
            game.genre,
            game.mood,
            game.notes,
            game.difficulty,
            tagNamesMap.get(game.id) ?? "",
            listNamesMap.get(game.id) ?? "",
          ],
          searchQuery,
        );
        if (!matchesSearch) return false;
      }

      // Status filter
      if (hasStatusFilter && game.status !== filter) return false;

      // List filter
      if (hasListFilter) {
        const gameListIds = listIdsMap.get(game.id) ?? [];
        if (!gameListIds.includes(selectedListFilter)) return false;
      }

      return true;
    });
  }, [games, searchQuery, filter, selectedListFilter, tagNamesMap, listNamesMap, listIdsMap]);

  // Combinar sort e group em um único useMemo
  const sortedAndGroupedGames = useMemo(() => {
    const sorted = sortLibraryGames(filteredAndSearchedGames, recordsByEntryId, sortBy, sortDirection);
    const grouped = groupLibraryGames(sorted, recordsByEntryId, groupBy);
    return { sorted, grouped };
  }, [filteredAndSearchedGames, recordsByEntryId, sortBy, sortDirection, groupBy]);

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

  const { sorted: sortedLibraryGames, grouped: groupedLibraryGames } = sortedAndGroupedGames;

  const selectedGame =
    sortedLibraryGames.find((game) => game.id === selectedGameId) ??
    filteredAndSearchedGames.find((game) => game.id === selectedGameId) ??
    games.find((game) => game.id === selectedGameId) ??
    games[0];

  const selectedRecord = selectedGame ? recordsByEntryId.get(selectedGame.id) : undefined;

  const selectedGameLists = useMemo(() => {
    if (!selectedGame) return [];
    return (listIdsMap.get(selectedGame.id) ?? [])
      .map((listId) => listById.get(listId))
      .filter((list): list is List => Boolean(list));
  }, [listById, listIdsMap, selectedGame]);

  return {
    listOptions,
    libraryGames: sortedLibraryGames,
    groupedLibraryGames,
    selectedGame,
    selectedRecord,
    selectedGameLists,
    activeSavedView,
    currentViewDraft,
  };
}
