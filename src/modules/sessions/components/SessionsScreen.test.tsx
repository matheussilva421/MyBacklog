import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

const useSessionsScreenStateMock = vi.fn();

vi.mock("../hooks/useSessionsScreenState", () => ({
  useSessionsScreenState: () => useSessionsScreenStateMock(),
}));

import { SessionsScreen } from "./SessionsScreen";

describe("SessionsScreen", () => {
  beforeEach(() => {
    useSessionsScreenStateMock.mockReturnValue({
      period: "30d",
      setPeriod: vi.fn(),
      platform: "all",
      setPlatform: vi.fn(),
      status: "all",
      setStatus: vi.fn(),
      platformOptions: ["all", "PC"],
      draft: {
        gameId: "7",
        date: "2026-03-18",
        durationMinutes: "90",
        completionPercent: "62",
        mood: "Imersivo",
        note: "Missão principal",
      },
      setDraft: vi.fn(),
      filteredGroups: [],
      overview: {
        totalSessions: 1,
        totalMinutes: 90,
        activeGames: 1,
        averageMinutes: 90,
        notedSessions: 1,
      },
      monthlyHours: [],
      timerLabel: "00:15:00",
      running: false,
      toggleTimer: vi.fn(),
      resetTimer: vi.fn(),
      useTimerValue: vi.fn(),
      resetDraft: vi.fn(),
    });
  });

  it("submits quick registration with normalized payload", async () => {
    const onQuickRegister = vi.fn().mockResolvedValue(undefined);

    render(
      <SessionsScreen
        games={[
          {
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
            notes: "Main story",
            difficulty: "Média",
          },
        ]}
        sessions={[]}
        query=""
        onQuickRegister={onQuickRegister}
        onEditSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onOpenGamePage={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /registrar sessão/i }));

    expect(onQuickRegister).toHaveBeenCalledWith({
      libraryEntryId: 7,
      date: "2026-03-18",
      durationMinutes: 90,
      completionPercent: 62,
      mood: "Imersivo",
      note: "Missão principal",
    });
  });
});
