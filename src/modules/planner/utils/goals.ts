import type { Goal as GoalCard } from "../../../backlog/shared";
import { hasStarted, isCompleted, isWishlistEntry } from "../../../core/libraryEntryDerived";
import { parseDateInput } from "../../../core/utils";
import type { Goal as DbGoal, LibraryEntry as DbLibraryEntry, PlaySession as DbPlaySession } from "../../../core/types";

export type GoalTone = "sunset" | "cyan" | "violet" | "yellow";

export type ResolvedGoalRow = DbGoal & {
  current: number;
  progressPercent: number;
  label: string;
  periodLabel: string;
  currentLabel: string;
  tone: GoalTone;
  remaining: number;
};

export type PlannerGoalSignals = {
  finishPressure: number;
  startPressure: number;
  playtimePressure: number;
  backlogPressure: number;
};

const goalLabelMap: Record<DbGoal["type"], string> = {
  finished: "Jogos concluídos",
  started: "Jogos iniciados",
  playtime: "Horas jogadas",
  backlog_reduction: "Redução de backlog",
};

const goalToneMap: Record<DbGoal["type"], GoalTone> = {
  finished: "sunset",
  started: "cyan",
  playtime: "violet",
  backlog_reduction: "yellow",
};

const periodLabelMap: Record<DbGoal["period"], string> = {
  monthly: "Mensal",
  yearly: "Anual",
  total: "Total",
};

function isWithinPeriod(dateValue: string | undefined, period: DbGoal["period"], now: Date): boolean {
  if (!dateValue) return period === "total";
  if (period === "total") return true;

  const date = parseDateInput(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  if (period === "monthly") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  return date.getFullYear() === now.getFullYear();
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatGoalCurrent(goal: DbGoal["type"], current: number, target: number): string {
  if (goal === "playtime") {
    return `${current.toFixed(1)}h / ${target}h`;
  }

  return `${current} / ${target}`;
}

function computeGoalCurrent(
  goal: DbGoal,
  libraryEntries: DbLibraryEntry[],
  playSessions: DbPlaySession[],
  now: Date,
): number {
  switch (goal.type) {
    case "finished":
      return libraryEntries.filter(
        (entry) => isCompleted(entry) && isWithinPeriod(entry.lastSessionAt ?? entry.updatedAt, goal.period, now),
      ).length;
    case "started": {
      const startedBySession = new Set(
        playSessions
          .filter((session) => isWithinPeriod(session.date, goal.period, now))
          .map((session) => session.libraryEntryId),
      );
      return libraryEntries.filter((entry) => {
        if (startedBySession.has(entry.id ?? -1)) return true;
        return hasStarted(entry) && isWithinPeriod(entry.lastSessionAt ?? entry.updatedAt ?? entry.createdAt, goal.period, now);
      }).length;
    }
    case "playtime": {
      const totalHours =
        playSessions
          .filter((session) => isWithinPeriod(session.date, goal.period, now))
          .reduce((total, session) => total + session.durationMinutes, 0) / 60;
      return Number(totalHours.toFixed(1));
    }
    case "backlog_reduction":
      return libraryEntries.filter((entry) => {
        if (isWishlistEntry(entry)) return false;
        if (entry.progressStatus === "not_started") return false;
        return isWithinPeriod(entry.lastSessionAt ?? entry.updatedAt, goal.period, now);
      }).length;
    default:
      return goal.current;
  }
}

export function resolveGoalRows(
  goalRows: DbGoal[],
  libraryEntries: DbLibraryEntry[],
  playSessions: DbPlaySession[],
  now = new Date(),
): ResolvedGoalRow[] {
  return goalRows.map((goal) => {
    const current = computeGoalCurrent(goal, libraryEntries, playSessions, now);
    const progressPercent = clampPercent((current / Math.max(1, goal.target)) * 100);
    const remaining = Math.max(0, goal.target - current);

    return {
      ...goal,
      current,
      progressPercent,
      label: goalLabelMap[goal.type],
      periodLabel: periodLabelMap[goal.period],
      currentLabel: formatGoalCurrent(goal.type, current, goal.target),
      tone: goalToneMap[goal.type],
      remaining,
    };
  });
}

export function createGoalProgressCards(resolvedGoals: ResolvedGoalRow[]): GoalCard[] {
  return resolvedGoals.map((goal) => ({
    label: goal.label,
    value: goal.progressPercent,
    tone: goal.tone === "cyan" ? "violet" : goal.tone,
  }));
}

export function createPlannerGoalSignals(resolvedGoals: ResolvedGoalRow[]): PlannerGoalSignals {
  const signal = {
    finishPressure: 0,
    startPressure: 0,
    playtimePressure: 0,
    backlogPressure: 0,
  };

  for (const goal of resolvedGoals) {
    const pressure = Math.max(0, Math.min(1, goal.remaining / Math.max(1, goal.target)));
    if (goal.type === "finished") signal.finishPressure = Math.max(signal.finishPressure, pressure);
    if (goal.type === "started") signal.startPressure = Math.max(signal.startPressure, pressure);
    if (goal.type === "playtime") signal.playtimePressure = Math.max(signal.playtimePressure, pressure);
    if (goal.type === "backlog_reduction") signal.backlogPressure = Math.max(signal.backlogPressure, pressure);
  }

  return signal;
}
