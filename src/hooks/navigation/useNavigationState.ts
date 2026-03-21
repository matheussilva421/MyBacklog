import { useDeferredValue, useState } from "react";
import type { LibraryViewGroupBy, LibraryViewSortBy, LibraryViewSortDirection } from "../../core/types";
import type { LibraryListFilter, ScreenKey, StatusFilter } from "../../backlog/shared";

export function useNavigationState() {
  const [screen, setScreen] = useState<ScreenKey>("dashboard");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("Todos");
  const [selectedListFilter, setSelectedListFilter] = useState<LibraryListFilter>("all");
  const [librarySortBy, setLibrarySortBy] = useState<LibraryViewSortBy>("updatedAt");
  const [librarySortDirection, setLibrarySortDirection] = useState<LibraryViewSortDirection>("desc");
  const [libraryGroupBy, setLibraryGroupBy] = useState<LibraryViewGroupBy>("none");
  const [selectedGameId, setSelectedGameId] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  return {
    screen,
    setScreen,
    query,
    setQuery,
    deferredQuery,
    filter,
    setFilter,
    selectedListFilter,
    setSelectedListFilter,
    librarySortBy,
    setLibrarySortBy,
    librarySortDirection,
    setLibrarySortDirection,
    libraryGroupBy,
    setLibraryGroupBy,
    selectedGameId,
    setSelectedGameId,
  };
}
