import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { GamePageData } from "../utils/gamePageData";
import { GamePageScreen } from "./GamePageScreen";

const data: GamePageData = {
  game: {
    id: 7,
    title: "Cyberpunk 2077",
    platform: "PC",
    sourceStore: "Steam",
    genre: "RPG",
    status: "Jogando",
    progress: 62,
    hours: 48,
    eta: "14h",
    priority: "Alta",
    mood: "Imersivo",
    score: 9.4,
    year: 2020,
    notes: "Main story forte.",
    difficulty: "Média",
  },
  record: {
    game: {
      id: 1,
      title: "Cyberpunk 2077",
      normalizedTitle: "cyberpunk 2077",
      genres: "RPG",
      platforms: "PC",
      developer: "CD Projekt RED",
      publisher: "CD Projekt",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
    libraryEntry: {
      id: 7,
      gameId: 1,
      platform: "PC",
      sourceStore: "Steam",
      format: "digital",
      ownershipStatus: "owned",
      progressStatus: "playing",
      playtimeMinutes: 2880,
      completionPercent: 62,
      priority: "high",
      favorite: false,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
  },
  sessions: [
    {
      id: 1,
      libraryEntryId: 7,
      date: "2026-03-18",
      platform: "PC",
      durationMinutes: 120,
      note: "Missão principal",
      completionPercent: 62,
    },
  ],
  review: undefined,
  tags: [{ id: 1, name: "rpg" }],
  lists: [{ id: 1, name: "Prioridade", createdAt: "2026-03-01T00:00:00.000Z" }],
  goals: [],
  plannerScore: 84,
  plannerReason: "Bom encaixe tático.",
  plannerFit: "Fechamento tático",
  totalSessions: 1,
  totalSessionMinutes: 120,
  averageSessionMinutes: 120,
  lastSession: {
    id: 1,
    libraryEntryId: 7,
    date: "2026-03-18",
    platform: "PC",
    durationMinutes: 120,
    note: "Missão principal",
    completionPercent: 62,
  },
  cadence: {
    sessions7d: 1,
    sessions30d: 1,
    sessions90d: 1,
    minutes7d: 120,
    minutes30d: 120,
    minutesThisMonth: 120,
    activeDays30d: 1,
    streakWeeks: 1,
    daysSinceLastSession: 0,
    lastSessionAt: "2026-03-18",
    label: "Ritmo ativo",
    tone: "cyan",
    isDormant: false,
  },
  frequencyLabel: "1 sessão em 30 dias",
  streakLabel: "1 semana(s)",
  hoursThisMonthLabel: "2.0h",
  hoursPerMonth: [],
  notedSessions: [
    {
      id: 1,
      libraryEntryId: 7,
      date: "2026-03-18",
      platform: "PC",
      durationMinutes: 120,
      note: "Missão principal",
      completionPercent: 62,
    },
  ],
};

describe("GamePageScreen", () => {
  it("renders the session timeline and notes", () => {
    render(
      <GamePageScreen
        data={data}
        availableLists={[{ id: 1, name: "Prioridade" }]}
        onBack={vi.fn()}
        onOpenEdit={vi.fn()}
        onOpenSession={vi.fn()}
        onEditSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onToggleFavorite={vi.fn()}
        onSendToPlanner={vi.fn()}
        onDelete={vi.fn()}
        onSaveReview={vi.fn()}
        onSaveTags={vi.fn()}
        onSaveLists={vi.fn()}
      />,
    );

    expect(screen.getByText("Timeline de sessões")).toBeInTheDocument();
    expect(screen.getAllByText("Missão principal").length).toBeGreaterThan(0);
  });

  it("triggers quick session registration from the action bar", () => {
    const onOpenSession = vi.fn();

    render(
      <GamePageScreen
        data={data}
        availableLists={[{ id: 1, name: "Prioridade" }]}
        onBack={vi.fn()}
        onOpenEdit={vi.fn()}
        onOpenSession={onOpenSession}
        onEditSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onToggleFavorite={vi.fn()}
        onSendToPlanner={vi.fn()}
        onDelete={vi.fn()}
        onSaveReview={vi.fn()}
        onSaveTags={vi.fn()}
        onSaveLists={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /registrar sessão/i }));

    expect(onOpenSession).toHaveBeenCalledWith(7);
  });
});
