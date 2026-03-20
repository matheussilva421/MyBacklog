import type { BarPoint, Game, Status } from "../../../backlog/shared";
import { getGamePlatforms, getGameStores } from "../../../backlog/structuredGameValues";
import { formatMonthLabel, parseDateInput, startOfLocalDay, startOfWeek, toDateInputValue } from "../../../core/utils";
import type { PlaySession } from "../../../core/types";

export type SessionPeriod = "7d" | "30d" | "90d" | "all";
export type SessionCadenceTone = "cyan" | "emerald" | "yellow" | "magenta";

export type SessionCadence = {
  sessions7d: number;
  sessions30d: number;
  sessions90d: number;
  minutes7d: number;
  minutes30d: number;
  minutesThisMonth: number;
  activeDays30d: number;
  streakWeeks: number;
  daysSinceLastSession: number | null;
  lastSessionAt?: string;
  label: string;
  tone: SessionCadenceTone;
  isDormant: boolean;
};

export type SessionHistoryGroup = {
  game: Game;
  sessions: PlaySession[];
  totalMinutes: number;
  noteCount: number;
  cadence: SessionCadence;
};

export type SessionOverview = {
  totalSessions: number;
  totalMinutes: number;
  activeGames: number;
  averageMinutes: number;
  notedSessions: number;
};

function getPeriodStart(period: SessionPeriod, now: Date): Date | null {
  const end = startOfLocalDay(now);
  if (period === "all") return null;
  const date = new Date(end);
  if (period === "7d") date.setDate(date.getDate() - 6);
  if (period === "30d") date.setDate(date.getDate() - 29);
  if (period === "90d") date.setDate(date.getDate() - 89);
  return date;
}

function getDaysSince(dateValue: string, now: Date): number {
  const target = startOfLocalDay(dateValue);
  const today = startOfLocalDay(now);
  return Math.max(0, Math.floor((today.getTime() - target.getTime()) / 86400000));
}

function buildWeekKey(value: string | Date): string {
  return toDateInputValue(startOfWeek(value));
}

function countWeeklyStreak(sessions: PlaySession[], now: Date): number {
  if (sessions.length === 0) return 0;
  const weekKeys = new Set(sessions.map((session) => buildWeekKey(session.date)));
  let streak = 0;
  let cursor = startOfWeek(now);
  while (weekKeys.has(buildWeekKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export function buildSessionCadence(sessions: PlaySession[], now = new Date()): SessionCadence {
  const sorted = [...sessions].sort((left, right) => right.date.localeCompare(left.date));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessions7d = sorted.filter((session) => getDaysSince(session.date, now) <= 6);
  const sessions30d = sorted.filter((session) => getDaysSince(session.date, now) <= 29);
  const sessions90d = sorted.filter((session) => getDaysSince(session.date, now) <= 89);
  const activeDays30d = new Set(sessions30d.map((session) => session.date)).size;
  const minutes7d = sessions7d.reduce((total, session) => total + session.durationMinutes, 0);
  const minutes30d = sessions30d.reduce((total, session) => total + session.durationMinutes, 0);
  const minutesThisMonth = sorted
    .filter((session) => parseDateInput(session.date) >= monthStart)
    .reduce((total, session) => total + session.durationMinutes, 0);
  const lastSessionAt = sorted[0]?.date;
  const daysSinceLastSession = lastSessionAt ? getDaysSince(lastSessionAt, now) : null;
  const streakWeeks = countWeeklyStreak(sorted, now);
  const isDormant = daysSinceLastSession != null && daysSinceLastSession > 45;

  let label = "Sem histórico recente";
  let tone: SessionCadenceTone = "magenta";
  if (daysSinceLastSession == null) {
    label = "Sem sessões";
  } else if (sessions7d.length >= 2 || minutes7d >= 180) {
    label = "Ritmo quente";
    tone = "emerald";
  } else if (sessions30d.length >= 3 || daysSinceLastSession <= 10) {
    label = "Ritmo ativo";
    tone = "cyan";
  } else if (daysSinceLastSession <= 30) {
    label = "Ritmo frio";
    tone = "yellow";
  }

  return {
    sessions7d: sessions7d.length,
    sessions30d: sessions30d.length,
    sessions90d: sessions90d.length,
    minutes7d,
    minutes30d,
    minutesThisMonth,
    activeDays30d,
    streakWeeks,
    daysSinceLastSession,
    lastSessionAt,
    label,
    tone,
    isDormant,
  };
}

export function buildSessionCadenceMap(sessions: PlaySession[], now = new Date()): Map<number, SessionCadence> {
  const rows = new Map<number, PlaySession[]>();
  for (const session of sessions) {
    const current = rows.get(session.libraryEntryId);
    if (current) current.push(session);
    else rows.set(session.libraryEntryId, [session]);
  }

  return new Map(
    Array.from(rows.entries()).map(([libraryEntryId, gameSessions]) => [
      libraryEntryId,
      buildSessionCadence(gameSessions, now),
    ]),
  );
}

export function buildSessionMonthlyHours(sessions: PlaySession[], months = 6, now = new Date()): BarPoint[] {
  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      name: formatMonthLabel(date),
      total: 0,
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const session of sessions) {
    const date = parseDateInput(session.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    bucket.total = Number((bucket.total + session.durationMinutes / 60).toFixed(1));
  }
  return buckets.map(({ name, total }) => ({ name, total }));
}

export function filterSessionsByPeriod(sessions: PlaySession[], period: SessionPeriod, now = new Date()): PlaySession[] {
  const start = getPeriodStart(period, now);
  if (!start) return [...sessions];
  const startTime = start.getTime();
  return sessions.filter((session) => startOfLocalDay(session.date).getTime() >= startTime);
}

export function buildSessionHistoryGroups(
  games: Game[],
  sessions: PlaySession[],
  now = new Date(),
): SessionHistoryGroup[] {
  const gameMap = new Map(games.map((game) => [game.id, game]));
  const grouped = new Map<number, PlaySession[]>();
  for (const session of sessions) {
    if (!gameMap.has(session.libraryEntryId)) continue;
    const current = grouped.get(session.libraryEntryId);
    if (current) current.push(session);
    else grouped.set(session.libraryEntryId, [session]);
  }

  return Array.from(grouped.entries())
    .map(([gameId, gameSessions]) => {
      const game = gameMap.get(gameId);
      if (!game) return null;
      const sortedSessions = [...gameSessions].sort((left, right) => right.date.localeCompare(left.date));
      return {
        game,
        sessions: sortedSessions,
        totalMinutes: sortedSessions.reduce((total, session) => total + session.durationMinutes, 0),
        noteCount: sortedSessions.filter((session) => Boolean(session.note?.trim())).length,
        cadence: buildSessionCadence(sortedSessions, now),
      };
    })
    .filter((group): group is SessionHistoryGroup => Boolean(group))
    .sort((left, right) => {
      const leftDate = left.sessions[0]?.date ?? "";
      const rightDate = right.sessions[0]?.date ?? "";
      return rightDate.localeCompare(leftDate);
    });
}

export function buildSessionOverview(groups: SessionHistoryGroup[]): SessionOverview {
  const totalSessions = groups.reduce((total, group) => total + group.sessions.length, 0);
  const totalMinutes = groups.reduce((total, group) => total + group.totalMinutes, 0);
  const activeGames = groups.filter((group) => group.cadence.sessions30d > 0).length;
  const notedSessions = groups.reduce((total, group) => total + group.noteCount, 0);
  return {
    totalSessions,
    totalMinutes,
    activeGames,
    averageMinutes: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
    notedSessions,
  };
}

export function matchesSessionFilters(args: {
  session: PlaySession;
  game?: Game;
  period: SessionPeriod;
  platform: string;
  store: string;
  status: Status | "all";
  query: string;
  now?: Date;
}): boolean {
  const { session, game, period, platform, store, status, query, now = new Date() } = args;
  if (!game) return false;
  const filteredByPeriod = filterSessionsByPeriod([session], period, now).length === 1;
  if (!filteredByPeriod) return false;
  if (platform !== "all" && !getGamePlatforms(game).includes(platform) && session.platform !== platform) return false;
  if (store !== "all" && !getGameStores(game).includes(store)) return false;
  if (status !== "all" && game.status !== status) return false;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    game.title,
    game.status,
    session.platform,
    session.note ?? "",
    session.mood ?? "",
    ...getGamePlatforms(game),
    ...getGameStores(game),
  ]
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}
