import type { LibraryEntry, PlaySession, ProgressStatus } from "./types";
import { toDateInputValue } from "./utils";

export type ProgressStatusDerivationOptions = {
  currentStatus: ProgressStatus;
  completionPercent?: number | null;
  playtimeMinutes?: number;
  hasSessions?: boolean;
  forceActive?: boolean;
  preservePausedStatus?: boolean;
  preserveReplayLaterStatus?: boolean;
};

export type LibraryEntrySessionRecalculation = {
  sessions: PlaySession[];
  latestSession?: PlaySession;
  latestCompletion?: number;
  completionPercent: number;
  playtimeMinutes: number;
  lastSessionAt?: string;
  completionDate?: string;
  progressStatus: ProgressStatus;
};

export function clampCompletionPercent(value?: number | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function sortSessionsByDateDesc(sessions: PlaySession[]): PlaySession[] {
  return [...sessions].sort((left, right) => right.date.localeCompare(left.date));
}

export function sumSessionMinutes(sessions: PlaySession[]): number {
  return sessions.reduce((total, session) => total + Math.max(0, Math.round(session.durationMinutes || 0)), 0);
}

export function deriveProgressStatus({
  currentStatus,
  completionPercent,
  playtimeMinutes = 0,
  hasSessions = false,
  forceActive = false,
  preservePausedStatus = true,
  preserveReplayLaterStatus = true,
}: ProgressStatusDerivationOptions): ProgressStatus {
  const nextCompletionPercent = clampCompletionPercent(completionPercent);
  const hasEngagement = nextCompletionPercent > 0 || playtimeMinutes > 0 || hasSessions;

  if (nextCompletionPercent >= 100) return "finished";
  if (currentStatus === "abandoned" || currentStatus === "archived") return currentStatus;
  if (!hasEngagement) return "not_started";
  if (forceActive) return "playing";
  if (preservePausedStatus && currentStatus === "paused") return "paused";
  if (preserveReplayLaterStatus && currentStatus === "replay_later") return "replay_later";
  return "playing";
}

function normalizeCompletionDate(value?: string): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  try {
    return toDateInputValue(raw);
  } catch {
    return undefined;
  }
}

export function deriveCompletionDate(args: {
  currentCompletionDate?: string;
  completionPercent?: number | null;
  progressStatus: ProgressStatus;
  completedAt?: string;
  fallbackDate?: string;
}): string | undefined {
  const completionPercent = clampCompletionPercent(args.completionPercent);
  const isCompleted =
    completionPercent >= 100 || args.progressStatus === "finished" || args.progressStatus === "completed_100";

  if (!isCompleted) return undefined;

  return (
    normalizeCompletionDate(args.currentCompletionDate) ||
    normalizeCompletionDate(args.completedAt) ||
    normalizeCompletionDate(args.fallbackDate)
  );
}

export function recalculateLibraryEntryFromSessions(
  entry: LibraryEntry,
  sessions: PlaySession[],
  options?: { forceActive?: boolean },
): LibraryEntrySessionRecalculation {
  const ordered = sortSessionsByDateDesc(sessions);
  const latestSession = ordered[0];
  const latestCompletion = ordered.find((session) => typeof session.completionPercent === "number")?.completionPercent;
  const hasSessions = ordered.length > 0;
  const completionPercent = hasSessions
    ? clampCompletionPercent(latestCompletion ?? entry.completionPercent)
    : clampCompletionPercent(entry.completionPercent);
  const playtimeMinutes = hasSessions
    ? sumSessionMinutes(ordered)
    : Math.max(0, Math.round(entry.playtimeMinutes || 0));
  const progressStatus = deriveProgressStatus({
    currentStatus: entry.progressStatus,
    completionPercent,
    playtimeMinutes,
    hasSessions,
    forceActive: options?.forceActive ?? false,
  });

  return {
    sessions: ordered,
    latestSession,
    latestCompletion,
    completionPercent,
    playtimeMinutes,
    lastSessionAt: latestSession?.date,
    progressStatus,
    completionDate: deriveCompletionDate({
      currentCompletionDate: entry.completionDate,
      completionPercent,
      progressStatus,
      completedAt: latestSession?.date,
      fallbackDate: entry.lastSessionAt,
    }),
  };
}
