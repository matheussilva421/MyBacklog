import { useMemo } from "react";
import type { PlaySession } from "../../../core/types";
import { buildSessionCadenceMap, buildSessionMonthlyHours } from "../utils/sessionAnalytics";

export function useBuildSessionInsights(args: { sessionRows: PlaySession[] }) {
  const { sessionRows } = args;

  const monthlyHours = useMemo(() => buildSessionMonthlyHours(sessionRows), [sessionRows]);
  const sessionCadenceMap = useMemo(() => buildSessionCadenceMap(sessionRows), [sessionRows]);

  return {
    monthlyHours,
    sessionCadenceMap,
  };
}
