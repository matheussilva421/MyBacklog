import { useMemo } from "react";
import {
  backlogByDuration,
  formatMonthLabel,
  parseEtaHours,
  platformDistribution,
  profileAchievements,
  type Achievement,
  type Game,
  type PiePoint,
  yearlyEvolution,
} from "../../../backlog/shared";
import type { LibraryEntry as DbLibraryEntry, PlaySession as DbPlaySession } from "../../../core/types";

function isSameMonth(date: Date, target: Date): boolean {
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

function formatPositiveHours(hours: number): string {
  return `+${hours}h em 7 dias`;
}

type UseDashboardInsightsArgs = {
  games: Game[];
  libraryEntryRows: DbLibraryEntry[];
  sessionRows: DbPlaySession[];
};

export function useDashboardInsights({ games, libraryEntryRows, sessionRows }: UseDashboardInsightsArgs) {
  const monthlyProgress = useMemo(() => {
    if (libraryEntryRows.length === 0) return yearlyEvolution;
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      return { month: formatMonthLabel(date), key: `${date.getFullYear()}-${date.getMonth()}`, started: 0, finished: 0 };
    });
    const monthMap = new Map(months.map((entry) => [entry.key, entry]));
    for (const entry of libraryEntryRows) {
      const createdKey = `${new Date(entry.createdAt).getFullYear()}-${new Date(entry.createdAt).getMonth()}`;
      if (entry.ownershipStatus !== "wishlist") {
        const createdBucket = monthMap.get(createdKey);
        if (createdBucket) createdBucket.started += 1;
      }
      if (entry.progressStatus === "finished" || entry.progressStatus === "completed_100") {
        const finishedAt = new Date(entry.updatedAt);
        const finishedBucket = monthMap.get(`${finishedAt.getFullYear()}-${finishedAt.getMonth()}`);
        if (finishedBucket) finishedBucket.finished += 1;
      }
    }
    return months.map(({ month, started, finished }) => ({ month, started, finished }));
  }, [libraryEntryRows]);

  const platformData = useMemo<PiePoint[]>(() => {
    if (games.length === 0) return platformDistribution;
    const counts = new Map<string, number>();
    for (const game of games) counts.set(game.platform, (counts.get(game.platform) || 0) + 1);
    const total = games.length;
    return Array.from(counts.entries())
      .sort(([, left], [, right]) => right - left)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value: Math.max(1, Math.round((value / total) * 100)) }));
  }, [games]);

  const durationBuckets = useMemo(() => {
    if (games.length === 0) return backlogByDuration;
    const buckets = [{ name: "Até 10h", total: 0 }, { name: "10-25h", total: 0 }, { name: "25-50h", total: 0 }, { name: "50h+", total: 0 }];
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
    const playing = games.filter((game) => game.status === "Jogando").length;
    const finished = games.filter((game) => game.status === "Terminado").length;
    const hours = games.reduce((totalHours, game) => totalHours + game.hours, 0);
    const addedThisMonth = libraryEntryRows.filter((entry) => isSameMonth(new Date(entry.createdAt), now)).length;
    const highPriorityBacklog = games.filter((game) => game.status === "Backlog" && game.priority === "Alta").length;
    const sessionsThisWeek = sessionRows.filter((session) => new Date(session.date).getTime() >= weekAgo).length;
    const recentHours = Math.round(
      sessionRows
        .filter((session) => new Date(session.date).getTime() >= weekAgo)
        .reduce((totalMinutes, session) => totalMinutes + session.durationMinutes, 0) / 60,
    );
    const completionRate = total > 0 ? Math.round((finished / total) * 100) : 0;

    return {
      total,
      backlog,
      playing,
      finished,
      hours,
      totalDelta: addedThisMonth > 0 ? `+${addedThisMonth} este mês` : "sem novos este mês",
      backlogDelta: highPriorityBacklog > 0 ? `${highPriorityBacklog} alta prioridade` : "sem pressão tática",
      playingDelta: sessionsThisWeek > 0 ? `${sessionsThisWeek} sessões na semana` : "sem sessões recentes",
      finishedDelta: `${completionRate}% de conclusão`,
      hoursDelta: formatPositiveHours(recentHours),
    };
  }, [games, libraryEntryRows, sessionRows]);

  const achievementCards = useMemo<Achievement[]>(() => {
    if (games.length === 0) return profileAchievements;
    const largestBucket = durationBuckets.reduce(
      (current, entry) => (entry.total > current.total ? entry : current),
      durationBuckets[0] || { name: "Até 10h", total: 0 },
    );

    return [
      {
        icon: profileAchievements[0].icon,
        tone: "emerald",
        title: `${games.filter((game) => game.status === "Terminado").length} jogos finalizados`,
        description: "Histórico sólido e biblioteca viva.",
      },
      {
        icon: profileAchievements[1].icon,
        tone: "cyan",
        title: "Radar de progresso ativo",
        description: `${games.filter((game) => game.status === "Jogando").length} jogos com acompanhamento contínuo.`,
      },
      {
        icon: profileAchievements[2].icon,
        tone: "magenta",
        title: `${games.filter((game) => game.status === "Pausado").length} jogos pausados`,
        description: "Baixo atrito para retomar e gerar avanço real.",
      },
      {
        icon: profileAchievements[3].icon,
        tone: "yellow",
        title: "Gargalo de médio porte",
        description: `${largestBucket?.name || "Até 10h"} segue como principal bloco do backlog.`,
      },
    ];
  }, [durationBuckets, games]);

  return {
    monthlyProgress,
    platformData,
    durationBuckets,
    stats,
    achievementCards,
  };
}
