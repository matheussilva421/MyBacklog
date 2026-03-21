import { useMemo } from "react";
import type { Game, Goal as GoalCard, PlannerEntry } from "../../../backlog/shared";
import type { Goal as DbGoal, LibraryEntry as DbLibraryEntry, PlaySession as DbPlaySession } from "../../../core/types";
import type { AppPreferences } from "../../settings/utils/preferences";
import type { SessionCadence } from "../../sessions/utils/sessionAnalytics";
import { buildPlannerFit, buildPlannerReason, computePlannerScore } from "../utils/scoring";
import { createGoalProgressCards, createPlannerGoalSignals, resolveGoalRows } from "../utils/goals";

type UsePlannerInsightsArgs = {
  games: Game[];
  libraryEntryRows: DbLibraryEntry[];
  sessionRows: DbPlaySession[];
  goalRows: DbGoal[];
  fallbackGoalProgress: GoalCard[];
  preferences: AppPreferences;
  sessionCadenceMap: Map<number, SessionCadence>;
};

export function usePlannerInsights({
  games,
  libraryEntryRows,
  sessionRows,
  goalRows,
  fallbackGoalProgress,
  preferences,
  sessionCadenceMap,
}: UsePlannerInsightsArgs) {
  const resolvedGoalRows = useMemo(
    () => resolveGoalRows(goalRows, libraryEntryRows, sessionRows),
    [goalRows, libraryEntryRows, sessionRows],
  );

  const plannerGoalSignals = useMemo(() => createPlannerGoalSignals(resolvedGoalRows), [resolvedGoalRows]);

  const computedPlannerQueue = useMemo<PlannerEntry[]>(() => {
    return games
      .filter((game) => game.status !== "Terminado" && game.status !== "Wishlist")
      .sort(
        (left, right) =>
          computePlannerScore(right, plannerGoalSignals, preferences, sessionCadenceMap.get(right.id)) -
          computePlannerScore(left, plannerGoalSignals, preferences, sessionCadenceMap.get(left.id)),
      )
      .slice(0, 4)
      .map((game, index) => ({
        rank: index + 1,
        gameId: game.id,
        reason: buildPlannerReason(game, plannerGoalSignals, preferences, sessionCadenceMap.get(game.id)),
        eta: game.eta,
        fit: buildPlannerFit(game, plannerGoalSignals, preferences, sessionCadenceMap.get(game.id)),
      }));
  }, [games, plannerGoalSignals, preferences, sessionCadenceMap]);

  const goalProgress = useMemo<GoalCard[]>(
    () => (resolvedGoalRows.length > 0 ? createGoalProgressCards(resolvedGoalRows) : fallbackGoalProgress),
    [fallbackGoalProgress, resolvedGoalRows],
  );

  return {
    resolvedGoalRows,
    plannerGoalSignals,
    computedPlannerQueue,
    goalProgress,
  };
}
