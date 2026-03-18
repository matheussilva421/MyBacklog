import type { BarPoint, Game, LibraryRecord } from "../../../backlog/shared";
import type { Goal as DbGoal, List, PlaySession, Review, Tag } from "../../../core/types";
import type { AppPreferences } from "../../settings/utils/preferences";
import { buildSessionCadence, buildSessionMonthlyHours, type SessionCadence } from "../../sessions/utils/sessionAnalytics";
import { buildPlannerFit, buildPlannerReason, computePlannerScore } from "../../planner/utils/scoring";
import type { PlannerGoalSignals } from "../../planner/utils/goals";

export type GamePageGoal = {
  id: string;
  label: string;
  value: number;
  currentLabel: string;
  tone: "sunset" | "cyan" | "yellow" | "violet";
};

export type GamePageData = {
  game: Game;
  record: LibraryRecord;
  sessions: PlaySession[];
  review?: Review;
  tags: Tag[];
  lists: List[];
  goals: GamePageGoal[];
  plannerScore: number;
  plannerReason: string;
  plannerFit: string;
  totalSessions: number;
  totalSessionMinutes: number;
  averageSessionMinutes: number;
  lastSession?: PlaySession;
  cadence: SessionCadence;
  frequencyLabel: string;
  streakLabel: string;
  hoursThisMonthLabel: string;
  hoursPerMonth: BarPoint[];
  notedSessions: PlaySession[];
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatGoalLabel(goal: DbGoal): string {
  if (goal.type === "finished") return "Concluir jogos";
  if (goal.type === "started") return "Iniciar jogos";
  if (goal.type === "playtime") return "Horas registradas";
  return "Reducao de backlog";
}

function mapGoalTone(goal: DbGoal): GamePageGoal["tone"] {
  if (goal.type === "finished") return "sunset";
  if (goal.type === "started") return "cyan";
  if (goal.type === "playtime") return "violet";
  return "yellow";
}

function formatGoalProgress(goal: DbGoal): string {
  if (goal.type === "playtime") return `${goal.current.toFixed(1)}h / ${goal.target}h`;
  return `${goal.current} / ${goal.target}`;
}

function formatDurationHours(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
}

export function buildGamePageData(input: {
  game: Game;
  record: LibraryRecord;
  sessions: PlaySession[];
  review?: Review;
  tags: Tag[];
  lists: List[];
  goals: DbGoal[];
  goalSignals: PlannerGoalSignals;
  preferences: AppPreferences;
}): GamePageData {
  const sessions = [...input.sessions].sort((left, right) => right.date.localeCompare(left.date));
  const cadence = buildSessionCadence(sessions);
  const totalSessionMinutes = sessions.reduce((total, session) => total + session.durationMinutes, 0);
  const totalSessions = sessions.length;
  const averageSessionMinutes = totalSessions > 0 ? Math.round(totalSessionMinutes / totalSessions) : 0;
  const hoursPerMonth = buildSessionMonthlyHours(sessions);
  const plannerScore = computePlannerScore(input.game, input.goalSignals, input.preferences, cadence);
  const plannerReason = buildPlannerReason(input.game, input.goalSignals, input.preferences, cadence);
  const plannerFit = buildPlannerFit(input.game, input.goalSignals, input.preferences, cadence);
  const notedSessions = sessions.filter((session) => Boolean(session.note?.trim())).slice(0, 5);

  return {
    game: input.game,
    record: input.record,
    sessions,
    review: input.review,
    tags: input.tags,
    lists: input.lists,
    goals: input.goals.map((goal) => ({
      id: `${goal.type}-${goal.period}`,
      label: formatGoalLabel(goal),
      value: clampPercent((goal.current / Math.max(1, goal.target)) * 100),
      currentLabel: formatGoalProgress(goal),
      tone: mapGoalTone(goal),
    })),
    plannerScore,
    plannerReason,
    plannerFit,
    totalSessions,
    totalSessionMinutes,
    averageSessionMinutes,
    lastSession: sessions[0],
    cadence,
    frequencyLabel:
      cadence.sessions30d > 0
        ? `${cadence.sessions30d} sessoes em 30 dias`
        : "Sem sessoes nos ultimos 30 dias",
    streakLabel: cadence.streakWeeks > 0 ? `${cadence.streakWeeks} semana(s)` : "Sem streak",
    hoursThisMonthLabel: formatDurationHours(cadence.minutesThisMonth),
    hoursPerMonth,
    notedSessions,
  };
}
