import { buildPlannerFit, buildPlannerReason, computePlannerScore } from "../../planner/utils/scoring";
import type { PlannerGoalSignals } from "../../planner/utils/goals";
import type { Game, LibraryRecord } from "../../../backlog/shared";
import type { Goal as DbGoal, List, PlaySession, Review, Tag } from "../../../core/types";

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
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapGoalLabel(goal: DbGoal): string {
  if (goal.type === "finished") return "Concluir jogos";
  if (goal.type === "started") return "Iniciar jogos";
  if (goal.type === "playtime") return "Horas registradas";
  return "Redução de backlog";
}

function mapGoalTone(goal: DbGoal): GamePageGoal["tone"] {
  if (goal.type === "finished") return "sunset";
  if (goal.type === "started") return "cyan";
  if (goal.type === "playtime") return "violet";
  return "yellow";
}

function formatGoalProgress(goal: DbGoal): string {
  if (goal.type === "playtime") {
    return `${goal.current.toFixed(1)}h / ${goal.target}h`;
  }

  return `${goal.current} / ${goal.target}`;
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
}): GamePageData {
  const sessions = [...input.sessions].sort((left, right) => right.date.localeCompare(left.date));
  const totalSessionMinutes = sessions.reduce((total, session) => total + session.durationMinutes, 0);
  const totalSessions = sessions.length;
  const averageSessionMinutes = totalSessions > 0 ? Math.round(totalSessionMinutes / totalSessions) : 0;
  const plannerScore = computePlannerScore(input.game, input.goalSignals);
  const plannerReason = buildPlannerReason(input.game, input.goalSignals);
  const plannerFit = buildPlannerFit(input.game, input.goalSignals);

  return {
    game: input.game,
    record: input.record,
    sessions,
    review: input.review,
    tags: input.tags,
    lists: input.lists,
    goals: input.goals.map((goal) => ({
      id: `${goal.type}-${goal.period}`,
      label: mapGoalLabel(goal),
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
  };
}
