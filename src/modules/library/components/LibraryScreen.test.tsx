import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { LibraryScreen } from "./LibraryScreen";

const baseGame = {
  id: 7,
  title: "Cyberpunk 2077",
  platform: "PC",
  platforms: ["PC", "PS5"],
  catalogPlatforms: "PC, PS5, Xbox Series",
  sourceStore: "Steam",
  stores: ["Steam", "GOG"],
  genre: "RPG",
  status: "Jogando" as const,
  progress: 62,
  hours: 48,
  eta: "14h",
  priority: "Alta" as const,
  mood: "Imersivo",
  score: 9.4,
  year: 2020,
  notes: "Main story forte.",
  difficulty: "Média",
  coverUrl: "https://example.com/cyberpunk.jpg",
  developer: "CD Projekt RED",
  publisher: "CD Projekt",
};

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    libraryGames: [baseGame],
    groupedLibraryGames: [{ key: "all", label: "Todos", games: [baseGame] }],
    selectedGame: baseGame,
    selectedLibraryIds: [],
    selectedGameLists: [],
    filter: "Todos",
    selectedListFilter: "all",
    sortBy: "updatedAt",
    sortDirection: "desc",
    groupBy: "none",
    listOptions: [{ id: 1, name: "Prioridade", count: 1 }],
    savedViews: [],
    activeSavedView: undefined,
    onFilterChange: vi.fn(),
    onListFilterChange: vi.fn(),
    onSortByChange: vi.fn(),
    onSortDirectionChange: vi.fn(),
    onGroupByChange: vi.fn(),
    onSaveCurrentView: vi.fn(),
    onApplySavedView: vi.fn(),
    onDeleteSavedView: vi.fn(),
    onSelectGame: vi.fn(),
    onToggleLibrarySelection: vi.fn(),
    onClearLibrarySelection: vi.fn(),
    onSelectVisibleLibraryGames: vi.fn(),
    onExport: vi.fn(),
    onBackupExport: vi.fn(),
    onOpenRestore: vi.fn(),
    onOpenCreate: vi.fn(),
    onOpenBatchEdit: vi.fn(),
    onOpenEdit: vi.fn(),
    onDeleteSelected: vi.fn(),
    onResumeSelected: vi.fn(),
    onFavoriteSelected: vi.fn(),
    onOpenSession: vi.fn(),
    onOpenGamePage: vi.fn(),
    onSendSelectedToPlanner: vi.fn(),
    ...overrides,
  };
}

describe("LibraryScreen", () => {
  it("selects a game from the library grid", () => {
    const onSelectGame = vi.fn();

    render(<LibraryScreen {...createProps({ onSelectGame })} />);

    fireEvent.click(screen.getByRole("button", { name: /abrir ficha de cyberpunk 2077/i }));

    expect(onSelectGame).toHaveBeenCalledWith(7);
  });

  it("opens the dedicated game page from the detail panel", () => {
    const onOpenGamePage = vi.fn();

    render(
      <LibraryScreen
        {...createProps({
          selectedGameLists: [{ id: 1, name: "Prioridade", createdAt: "2026-03-01T00:00:00.000Z" }],
          onOpenGamePage,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /abrir página/i }));

    expect(onOpenGamePage).toHaveBeenCalledWith(7);
  });

  it("renders the game cover in the library card", () => {
    render(<LibraryScreen {...createProps({ listOptions: [] })} />);

    expect(screen.getAllByAltText(/capa de cyberpunk 2077/i)).not.toHaveLength(0);
  });

  it("supports selection and batch actions from the toolbar", () => {
    const onToggleLibrarySelection = vi.fn();
    const onSelectVisibleLibraryGames = vi.fn();
    const onOpenBatchEdit = vi.fn();

    render(
      <LibraryScreen
        {...createProps({
          selectedLibraryIds: [7],
          onToggleLibrarySelection,
          onSelectVisibleLibraryGames,
          onOpenBatchEdit,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /remover cyberpunk 2077 da seleção/i }));
    fireEvent.click(screen.getByRole("button", { name: /selecionar filtrados/i }));
    fireEvent.click(screen.getByRole("button", { name: /editar em lote/i }));

    expect(onToggleLibrarySelection).toHaveBeenCalledWith(7);
    expect(onSelectVisibleLibraryGames).toHaveBeenCalledWith([7]);
    expect(onOpenBatchEdit).toHaveBeenCalled();
  });
});
