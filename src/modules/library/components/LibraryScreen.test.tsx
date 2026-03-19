import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { LibraryScreen } from "./LibraryScreen";

const baseGame = {
  id: 7,
  title: "Cyberpunk 2077",
  platform: "PC",
  sourceStore: "Steam",
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
};

describe("LibraryScreen", () => {
  it("selects a game from the library grid", () => {
    const onSelectGame = vi.fn();

    render(
      <LibraryScreen
        libraryGames={[baseGame]}
        selectedGame={baseGame}
        selectedGameLists={[]}
        filter="Todos"
        selectedListFilter="all"
        listOptions={[{ id: 1, name: "Prioridade", count: 1 }]}
        onFilterChange={vi.fn()}
        onListFilterChange={vi.fn()}
        onSelectGame={onSelectGame}
        onExport={vi.fn()}
        onBackupExport={vi.fn()}
        onOpenRestore={vi.fn()}
        onOpenCreate={vi.fn()}
        onOpenEdit={vi.fn()}
        onDeleteSelected={vi.fn()}
        onResumeSelected={vi.fn()}
        onFavoriteSelected={vi.fn()}
        onOpenSession={vi.fn()}
        onOpenGamePage={vi.fn()}
        onSendSelectedToPlanner={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /cyberpunk 2077/i })[0]);

    expect(onSelectGame).toHaveBeenCalledWith(7);
  });

  it("opens the dedicated game page from the detail panel", () => {
    const onOpenGamePage = vi.fn();

    render(
      <LibraryScreen
        libraryGames={[baseGame]}
        selectedGame={baseGame}
        selectedGameLists={[{ id: 1, name: "Prioridade", createdAt: "2026-03-01T00:00:00.000Z" }]}
        filter="Todos"
        selectedListFilter="all"
        listOptions={[{ id: 1, name: "Prioridade", count: 1 }]}
        onFilterChange={vi.fn()}
        onListFilterChange={vi.fn()}
        onSelectGame={vi.fn()}
        onExport={vi.fn()}
        onBackupExport={vi.fn()}
        onOpenRestore={vi.fn()}
        onOpenCreate={vi.fn()}
        onOpenEdit={vi.fn()}
        onDeleteSelected={vi.fn()}
        onResumeSelected={vi.fn()}
        onFavoriteSelected={vi.fn()}
        onOpenSession={vi.fn()}
        onOpenGamePage={onOpenGamePage}
        onSendSelectedToPlanner={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /abrir página/i }));

    expect(onOpenGamePage).toHaveBeenCalledWith(7);
  });
});
