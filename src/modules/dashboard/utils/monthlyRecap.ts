import type { Game, MonthlyRecap } from "../../../backlog/shared";
import type { LibraryEntry, PlaySession } from "../../../core/types";

function isSameMonth(date: Date, target: Date) {
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

function isLastDayOfMonth(date: Date) {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getMonth() !== date.getMonth();
}

export function buildMonthlyRecap(
  games: Game[],
  libraryEntryRows: LibraryEntry[],
  sessionRows: PlaySession[],
  now = new Date(),
): MonthlyRecap {
  const sessionsThisMonth = sessionRows.filter((session) => isSameMonth(new Date(session.date), now));
  const totalMinutes = sessionsThisMonth.reduce((total, session) => total + session.durationMinutes, 0);
  const minutesByGame = new Map<number, number>();
  const activeDays = new Set<string>();

  for (const session of sessionsThisMonth) {
    minutesByGame.set(
      session.libraryEntryId,
      (minutesByGame.get(session.libraryEntryId) || 0) + session.durationMinutes,
    );
    activeDays.add(session.date.slice(0, 10));
  }

  const topGameEntry = Array.from(minutesByGame.entries()).sort((left, right) => right[1] - left[1])[0];
  const topGame = topGameEntry ? games.find((game) => game.id === topGameEntry[0]) : undefined;
  const completedGames = libraryEntryRows.filter((entry) => {
    if (entry.progressStatus !== "finished" && entry.progressStatus !== "completed_100") return false;
    return isSameMonth(new Date(entry.updatedAt), now);
  }).length;
  const addedGames = libraryEntryRows.filter((entry) => isSameMonth(new Date(entry.createdAt), now)).length;
  const activeGames = new Set(sessionsThisMonth.map((session) => session.libraryEntryId)).size;
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  return {
    title: "Night City Recap",
    periodLabel: now.toLocaleString("pt-BR", { month: "long", year: "numeric" }),
    isMonthEnd: isLastDayOfMonth(now),
    totalHours,
    totalSessions: sessionsThisMonth.length,
    activeGames,
    activeDays: activeDays.size,
    topGameTitle: topGame?.title ?? null,
    topGameHours: topGameEntry ? Math.round((topGameEntry[1] / 60) * 10) / 10 : 0,
    completedGames,
    addedGames,
    summary: [
      `${totalHours}h jogadas`,
      `${completedGames} zerados`,
      topGame ? `${topGame.title} liderou o mês` : "sem jogo dominante ainda",
    ].join(" · "),
  };
}
