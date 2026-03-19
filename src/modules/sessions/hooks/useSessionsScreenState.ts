import { useEffect, useMemo, useState } from "react";
import type { Game, Status } from "../../../backlog/shared";
import type { PlaySession } from "../../../core/types";
import {
  buildSessionCadenceMap,
  buildSessionHistoryGroups,
  buildSessionMonthlyHours,
  buildSessionOverview,
  filterSessionsByPeriod,
  matchesSessionFilters,
  type SessionPeriod,
} from "../utils/sessionAnalytics";

export type QuickSessionDraft = {
  gameId: string;
  date: string;
  durationMinutes: string;
  completionPercent: string;
  mood: string;
  note: string;
};

function createQuickSessionDraft(initialGameId?: number): QuickSessionDraft {
  return {
    gameId: initialGameId ? String(initialGameId) : "",
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: "45",
    completionPercent: "",
    mood: "",
    note: "",
  };
}

function formatTimerValue(totalSeconds: number): string {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function pickInitialGameId(games: Game[]): number | undefined {
  return games.find((game) => game.status === "Jogando")?.id ?? games[0]?.id;
}

export function useSessionsScreenState({
  games,
  sessions,
  query,
}: {
  games: Game[];
  sessions: PlaySession[];
  query: string;
}) {
  const [period, setPeriod] = useState<SessionPeriod>("30d");
  const [platform, setPlatform] = useState<string>("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const initialGameId = useMemo(() => pickInitialGameId(games), [games]);
  const [draft, setDraft] = useState<QuickSessionDraft>(() => createQuickSessionDraft(initialGameId));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const gameMap = useMemo(() => new Map(games.map((game) => [game.id, game] as const)), [games]);
  const platformOptions = useMemo(
    () => ["all", ...Array.from(new Set(games.map((game) => game.platform))).sort((left, right) => left.localeCompare(right))],
    [games],
  );
  const cadenceMap = useMemo(() => buildSessionCadenceMap(sessions), [sessions]);
  const resolvedDraft = useMemo(
    () => (draft.gameId || !initialGameId ? draft : { ...draft, gameId: String(initialGameId) }),
    [draft, initialGameId],
  );
  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) =>
        matchesSessionFilters({
          session,
          game: gameMap.get(session.libraryEntryId),
          period,
          platform,
          status,
          query,
        }),
      ),
    [gameMap, period, platform, query, sessions, status],
  );

  const filteredGroups = useMemo(
    () => buildSessionHistoryGroups(games, filteredSessions),
    [filteredSessions, games],
  );
  const overview = useMemo(() => buildSessionOverview(filteredGroups), [filteredGroups]);
  const monthlyHours = useMemo(
    () => buildSessionMonthlyHours(filterSessionsByPeriod(sessions, "90d")),
    [sessions],
  );

  const timerLabel = useMemo(() => formatTimerValue(elapsedSeconds), [elapsedSeconds]);

  const useTimerValue = () => {
    const minutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
    setDraft((current) => ({ ...current, durationMinutes: String(minutes) }));
  };

  const resetTimer = () => {
    setRunning(false);
    setElapsedSeconds(0);
  };

  const toggleTimer = () => {
    setRunning((current) => !current);
  };

  const resetDraft = (nextGameId?: number) => {
    setDraft(createQuickSessionDraft(nextGameId ?? initialGameId));
    setElapsedSeconds(0);
    setRunning(false);
  };

  return {
    period,
    setPeriod,
    platform,
    setPlatform,
    status,
    setStatus,
    platformOptions,
    draft: resolvedDraft,
    setDraft,
    filteredSessions,
    filteredGroups,
    overview,
    monthlyHours,
    cadenceMap,
    timerLabel,
    running,
    toggleTimer,
    resetTimer,
    useTimerValue,
    resetDraft,
  };
}
