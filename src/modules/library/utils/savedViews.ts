import type { Game, LibraryListFilter, LibraryRecord, StatusFilter } from "../../../backlog/shared";
import type {
  LibrarySavedStatusFilter,
  LibraryViewGroupBy,
  LibraryViewSortBy,
  LibraryViewSortDirection,
  SavedView,
} from "../../../core/types";
import { resolveLibraryEntrySemantics } from "../../../core/libraryEntryDerived";
import { generateUuid } from "../../../core/utils";

export type LibraryViewState = {
  query: string;
  filter: StatusFilter;
  selectedListFilter: LibraryListFilter;
  sortBy: LibraryViewSortBy;
  sortDirection: LibraryViewSortDirection;
  groupBy: LibraryViewGroupBy;
};

export type GroupedLibraryGames = {
  key: string;
  label: string;
  games: Game[];
};

const priorityWeight: Record<Game["priority"], number> = {
  Alta: 3,
  Média: 2,
  Baixa: 1,
};

export function statusFilterToSavedStatus(filter: StatusFilter): LibrarySavedStatusFilter {
  switch (filter) {
    case "Backlog":
      return "backlog";
    case "Jogando":
      return "playing";
    case "Pausado":
      return "paused";
    case "Terminado":
      return "completed";
    case "Wishlist":
      return "wishlist";
    case "Todos":
    default:
      return "all";
  }
}

export function savedStatusToStatusFilter(filter: LibrarySavedStatusFilter): StatusFilter {
  switch (filter) {
    case "backlog":
      return "Backlog";
    case "playing":
      return "Jogando";
    case "paused":
      return "Pausado";
    case "completed":
      return "Terminado";
    case "wishlist":
      return "Wishlist";
    case "all":
    default:
      return "Todos";
  }
}

export function buildSavedViewPayload(
  current: LibraryViewState,
  name: string,
  existing?: SavedView,
): SavedView {
  const now = new Date().toISOString();
  return {
    id: existing?.id,
    uuid: existing?.uuid || generateUuid(),
    version: existing?.version || 1,
    scope: "library",
    name: name.trim(),
    statusFilter: statusFilterToSavedStatus(current.filter),
    listId: current.selectedListFilter === "all" ? undefined : current.selectedListFilter,
    query: current.query.trim() || undefined,
    sortBy: current.sortBy,
    sortDirection: current.sortDirection,
    groupBy: current.groupBy,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function doesSavedViewMatchLibraryState(view: SavedView, current: LibraryViewState): boolean {
  return (
    view.scope === "library" &&
    (view.query ?? "") === current.query.trim() &&
    savedStatusToStatusFilter(view.statusFilter) === current.filter &&
    (view.listId ?? "all") === current.selectedListFilter &&
    view.sortBy === current.sortBy &&
    view.sortDirection === current.sortDirection &&
    view.groupBy === current.groupBy
  );
}

function compareText(left: string, right: string, direction: LibraryViewSortDirection) {
  const result = left.localeCompare(right, "pt-BR", { sensitivity: "base" });
  return direction === "asc" ? result : result * -1;
}

function compareNumber(left: number, right: number, direction: LibraryViewSortDirection) {
  return direction === "asc" ? left - right : right - left;
}

function compareOptionalDate(
  left: string | undefined,
  right: string | undefined,
  direction: LibraryViewSortDirection,
) {
  const leftValue = left || "";
  const rightValue = right || "";
  return compareText(leftValue, rightValue, direction);
}

export function sortLibraryGames(
  games: Game[],
  recordsByEntryId: Map<number | undefined, LibraryRecord>,
  sortBy: LibraryViewSortBy,
  sortDirection: LibraryViewSortDirection,
): Game[] {
  return [...games].sort((left, right) => {
    const leftRecord = recordsByEntryId.get(left.id);
    const rightRecord = recordsByEntryId.get(right.id);

    switch (sortBy) {
      case "title":
        return compareText(left.title, right.title, sortDirection);
      case "progress":
        return compareNumber(left.progress, right.progress, sortDirection);
      case "hours":
        return compareNumber(left.hours, right.hours, sortDirection);
      case "priority":
        return compareNumber(priorityWeight[left.priority], priorityWeight[right.priority], sortDirection);
      case "year":
        return compareNumber(left.year, right.year, sortDirection);
      case "completionDate":
        return compareOptionalDate(
          leftRecord?.libraryEntry.completionDate,
          rightRecord?.libraryEntry.completionDate,
          sortDirection,
        );
      case "updatedAt":
      default:
        return compareOptionalDate(
          leftRecord?.libraryEntry.updatedAt,
          rightRecord?.libraryEntry.updatedAt,
          sortDirection,
        );
    }
  });
}

function resolveGroupLabels(game: Game, record: LibraryRecord | undefined, groupBy: LibraryViewGroupBy) {
  switch (groupBy) {
    case "status":
      return [game.status];
    case "priority":
      return [game.priority];
    case "platform":
      return Array.from(new Set((game.platforms ?? [game.platform]).filter(Boolean))).map(
        (platform) => platform || "Sem plataforma",
      );
    case "sourceStore":
      return Array.from(new Set((game.stores ?? [game.sourceStore]).filter(Boolean))).map(
        (store) => store || "Sem origem",
      );
    case "ownership":
      return [record ? resolveLibraryEntrySemantics(record.libraryEntry).label : "Sem acesso"];
    case "none":
    default:
      return ["Todos"];
  }
}

export function groupLibraryGames(
  games: Game[],
  recordsByEntryId: Map<number | undefined, LibraryRecord>,
  groupBy: LibraryViewGroupBy,
): GroupedLibraryGames[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "Todos", games }];
  }

  const groups = new Map<string, Game[]>();
  for (const game of games) {
    const labels = resolveGroupLabels(game, recordsByEntryId.get(game.id), groupBy);
    for (const label of labels) {
      const current = groups.get(label);
      if (current) current.push(game);
      else groups.set(label, [game]);
    }
  }

  return Array.from(groups.entries())
    .sort((left, right) => left[0].localeCompare(right[0], "pt-BR"))
    .map(([label, groupGames]) => ({
      key: label,
      label,
      games: groupGames,
    }));
}
