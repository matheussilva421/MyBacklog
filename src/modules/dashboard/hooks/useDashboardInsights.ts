import { useMemo } from "react";
import {
  backlogByDuration,
  formatMonthLabel,
  parseEtaHours,
  platformDistribution,
  type Game,
  type PiePoint,
} from "../../../backlog/shared";
import { getGamePlatforms, getGameStores } from "../../../backlog/structuredGameValues";
import { isCompleted, isWishlistEntry } from "../../../core/libraryEntryDerived";
import { parseDateInput } from "../../../core/utils";
import type { LibraryEntry as DbLibraryEntry, PlaySession as DbPlaySession } from "../../../core/types";
import type { PlannerGoalSignals } from "../../planner/utils/goals";
import { computePlannerScore } from "../../planner/utils/scoring";
import type { AppPreferences } from "../../settings/utils/preferences";
import { buildSessionCadenceMap } from "../../sessions/utils/sessionAnalytics";
import { buildMonthlyRecap } from "../utils/monthlyRecap";
import { buildPersonalBadges } from "../utils/personalBadges";

function isSameMonth(value: string | Date, target: Date) {
  const date = parseDateInput(value);
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

function formatPositiveHours(hours: number) {
  return `+${hours}h em 7 dias`;
}

type UseDashboardInsightsArgs = {
  games: Game[];
  libraryEntryRows: DbLibraryEntry[];
  sessionRows: DbPlaySession[];
  plannerGoalSignals: PlannerGoalSignals;
  preferences: AppPreferences;
  query: string;
};

function buildDistribution(games: Game[], valuesForGame: (game: Game) => string[]): PiePoint[] {
  if (games.length === 0) return [];

  const counts = new Map<string, number>();
  let total = 0;
  for (const game of games) {
    for (const value of valuesForGame(game)) {
      counts.set(value, (counts.get(value) || 0) + 1);
      total += 1;
    }
  }

  if (total === 0) return [];

  return Array.from(counts.entries())
    .sort(([, left], [, right]) => right - left)
    .slice(0, 5)
    .map(([name, value]) => ({
      name,
      value: Math.max(1, Math.round((value / total) * 100)),
    }));
}

export function useDashboardInsights({
  games,
  libraryEntryRows,
  sessionRows,
  plannerGoalSignals,
  preferences,
  query,
}: UseDashboardInsightsArgs) {
  const sessionCadenceMap = useMemo(() => buildSessionCadenceMap(sessionRows), [sessionRows]);

  const monthlyProgress = useMemo(() => {
    if (libraryEntryRows.length === 0) {
      return backlogByDuration.map((entry) => ({
        month: entry.name,
        started: 0,
        finished: 0,
      }));
    }

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      return {
        month: formatMonthLabel(date),
        key: `${date.getFullYear()}-${date.getMonth()}`,
        started: 0,
        finished: 0,
      };
    });
    const monthMap = new Map(months.map((entry) => [entry.key, entry]));

    for (const entry of libraryEntryRows) {
      const createdAt = parseDateInput(entry.createdAt);
      const createdBucket = monthMap.get(`${createdAt.getFullYear()}-${createdAt.getMonth()}`);
      if (createdBucket && !isWishlistEntry(entry)) {
        createdBucket.started += 1;
      }

      if (isCompleted(entry)) {
        const finishedAt = parseDateInput(entry.updatedAt);
        const finishedBucket = monthMap.get(`${finishedAt.getFullYear()}-${finishedAt.getMonth()}`);
        if (finishedBucket) finishedBucket.finished += 1;
      }
    }

    return months.map(({ month, started, finished }) => ({ month, started, finished }));
  }, [libraryEntryRows]);

  const platformData = useMemo<PiePoint[]>(() => {
    const distribution = buildDistribution(games, getGamePlatforms);
    return distribution.length > 0 ? distribution : platformDistribution;
  }, [games]);

  const storeData = useMemo<PiePoint[]>(() => buildDistribution(games, getGameStores), [games]);

  const durationBuckets = useMemo(() => {
    if (games.length === 0) return backlogByDuration;

    const buckets = [
      { name: "Até 10h", total: 0 },
      { name: "10-25h", total: 0 },
      { name: "25-50h", total: 0 },
      { name: "50h+", total: 0 },
    ];

    for (const game of games) {
      if (game.status === "Terminado" || game.status === "Wishlist") continue;
      const etaHours = parseEtaHours(game.eta);
      if (!Number.isFinite(etaHours) || etaHours > 50) buckets[3].total += 1;
      else if (etaHours > 25) buckets[2].total += 1;
      else if (etaHours > 10) buckets[1].total += 1;
      else buckets[0].total += 1;
    }

    return buckets;
  }, [games]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const total = games.length;
    const backlog = games.filter((game) => game.status === "Backlog").length;
    const activeNow = games.filter((game) => {
      const cadence = sessionCadenceMap.get(game.id);
      return game.status !== "Terminado" && game.status !== "Wishlist" && Boolean(cadence && cadence.sessions30d > 0);
    }).length;
    const finished = games.filter((game) => game.status === "Terminado").length;
    const hours = Math.round(sessionRows.reduce((totalMinutes, session) => totalMinutes + session.durationMinutes, 0) / 60);
    const addedThisMonth = libraryEntryRows.filter((entry) => isSameMonth(entry.createdAt, now)).length;
    const dormantBacklog = games.filter((game) => game.status === "Backlog" && sessionCadenceMap.get(game.id)?.isDormant).length;
    const activeGames7d = games.filter((game) => (sessionCadenceMap.get(game.id)?.sessions7d || 0) > 0).length;
    const recentHours = Math.round(
      sessionRows
        .filter((session) => parseDateInput(session.date).getTime() >= weekAgo)
        .reduce((totalMinutes, session) => totalMinutes + session.durationMinutes, 0) / 60,
    );
    const finishedThisYear = libraryEntryRows.filter((entry) => {
      if (!isCompleted(entry)) return false;
      return parseDateInput(entry.updatedAt).getFullYear() === now.getFullYear();
    }).length;

    return {
      total,
      backlog,
      playing: activeNow,
      finished,
      hours,
      totalDelta: addedThisMonth > 0 ? `+${addedThisMonth} este mês` : "sem novos este mês",
      backlogDelta: dormantBacklog > 0 ? `${dormantBacklog} frios` : "fila aquecida",
      playingDelta: activeGames7d > 0 ? `${activeGames7d} ativos em 7 dias` : "sem ritmo recente",
      finishedDelta: finishedThisYear > 0 ? `+${finishedThisYear} no ano` : "sem fechamentos no ano",
      hoursDelta: formatPositiveHours(recentHours),
    };
  }, [games, libraryEntryRows, sessionCadenceMap, sessionRows]);

  const personalBadges = useMemo(
    () => buildPersonalBadges(games, libraryEntryRows, sessionRows),
    [games, libraryEntryRows, sessionRows],
  );

  const monthlyRecap = useMemo(
    () => buildMonthlyRecap(games, libraryEntryRows, sessionRows),
    [games, libraryEntryRows, sessionRows],
  );

  const continuePlayingGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return games
      .filter((game) => {
        const cadence = sessionCadenceMap.get(game.id);
        const isOperational =
          game.status === "Jogando" ||
          game.status === "Pausado" ||
          Boolean(cadence && cadence.sessions30d > 0);
        if (!isOperational || game.status === "Terminado" || game.status === "Wishlist") return false;
        if (!normalizedQuery) return true;
        return [
          game.title,
          game.genre,
          game.notes,
          ...getGamePlatforms(game),
          ...getGameStores(game),
        ].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      })
      .sort((left, right) => {
        const rightCadence = sessionCadenceMap.get(right.id);
        const leftCadence = sessionCadenceMap.get(left.id);
        return (
          computePlannerScore(right, plannerGoalSignals, preferences, rightCadence) -
          computePlannerScore(left, plannerGoalSignals, preferences, leftCadence)
        );
      })
      .slice(0, 3);
  }, [games, plannerGoalSignals, preferences, query, sessionCadenceMap]);

  return {
    monthlyProgress,
    platformData,
    storeData,
    durationBuckets,
    stats,
    personalBadges,
    monthlyRecap,
    continuePlayingGames,
    sessionCadenceMap,
  };
}
