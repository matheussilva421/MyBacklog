import { Activity, Clock3, LibraryBig, Sparkles, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Game, UserBadge } from "../../../backlog/shared";
import type { LibraryEntry, PlaySession } from "../../../core/types";

type BadgeMetric = {
  value: number;
  target: number;
  label: string;
  unlocked: boolean;
};

type BadgeContext = {
  games: Game[];
  libraryEntryRows: LibraryEntry[];
  sessionRows: PlaySession[];
};

type BadgeBlueprint = {
  key: string;
  title: string;
  description: string;
  tone: UserBadge["tone"];
  icon: LucideIcon;
  resolve: (context: BadgeContext) => BadgeMetric;
};

function startOfWeek(date: Date) {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  clone.setDate(clone.getDate() + diff);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function getMaxWeeklyHours(sessionRows: PlaySession[]) {
  const totals = new Map<string, number>();

  for (const session of sessionRows) {
    const weekStart = startOfWeek(new Date(session.date)).toISOString().slice(0, 10);
    totals.set(weekStart, (totals.get(weekStart) || 0) + session.durationMinutes);
  }

  return Math.round(Math.max(0, ...totals.values()) / 60);
}

function getMaxFinishedInSevenDays(libraryEntryRows: LibraryEntry[]) {
  const finishedDates = libraryEntryRows
    .filter(
      (entry) =>
        entry.progressStatus === "finished" || entry.progressStatus === "completed_100",
    )
    .map((entry) => new Date(entry.updatedAt).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  let maxCount = 0;
  let left = 0;
  const windowSize = 7 * 24 * 60 * 60 * 1000;

  for (let right = 0; right < finishedDates.length; right += 1) {
    while (finishedDates[right] - finishedDates[left] > windowSize) {
      left += 1;
    }
    maxCount = Math.max(maxCount, right - left + 1);
  }

  return maxCount;
}

function getDistinctGenreCount(games: Game[]) {
  const genres = new Set<string>();

  for (const game of games) {
    for (const token of game.genre.split(/[,&/]/)) {
      const normalized = token.trim().toLowerCase();
      if (normalized) genres.add(normalized);
    }
  }

  return genres.size;
}

function getSessionsInLast30Days(sessionRows: PlaySession[]) {
  const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return sessionRows.filter((session) => new Date(session.date).getTime() >= threshold).length;
}

const badgeBlueprints: BadgeBlueprint[] = [
  {
    key: "maratonista",
    title: "Maratonista",
    description: "Jogue 10 horas na mesma semana para provar consistência operacional.",
    tone: "yellow",
    icon: Clock3,
    resolve: ({ sessionRows }) => {
      const value = getMaxWeeklyHours(sessionRows);
      const target = 10;
      return {
        value,
        target,
        label: `${value}h / ${target}h na melhor semana`,
        unlocked: value >= target,
      };
    },
  },
  {
    key: "furador-backlog",
    title: "Furador de Backlog",
    description: "Finalize 5 jogos em 7 dias e atravesse a fila sem piedade.",
    tone: "magenta",
    icon: Trophy,
    resolve: ({ libraryEntryRows }) => {
      const value = getMaxFinishedInSevenDays(libraryEntryRows);
      const target = 5;
      return {
        value,
        target,
        label: `${value} / ${target} jogos no melhor sprint`,
        unlocked: value >= target,
      };
    },
  },
  {
    key: "ecletico",
    title: "O Eclético",
    description: "Mantenha registros em 10 gêneros distintos para ampliar seu radar.",
    tone: "cyan",
    icon: Sparkles,
    resolve: ({ games }) => {
      const value = getDistinctGenreCount(games);
      const target = 10;
      return {
        value,
        target,
        label: `${value} / ${target} gêneros distintos`,
        unlocked: value >= target,
      };
    },
  },
  {
    key: "cadencia-de-aco",
    title: "Cadência de Aço",
    description: "Registre 20 sessões em 30 dias para transformar disciplina em ritmo.",
    tone: "emerald",
    icon: Activity,
    resolve: ({ sessionRows }) => {
      const value = getSessionsInLast30Days(sessionRows);
      const target = 20;
      return {
        value,
        target,
        label: `${value} / ${target} sessões nos últimos 30 dias`,
        unlocked: value >= target,
      };
    },
  },
  {
    key: "curador-da-grade",
    title: "Curador da Grade",
    description: "Construa uma coleção de 50 registros sem perder legibilidade do catálogo.",
    tone: "yellow",
    icon: LibraryBig,
    resolve: ({ games }) => {
      const value = games.length;
      const target = 50;
      return {
        value,
        target,
        label: `${value} / ${target} registros ativos`,
        unlocked: value >= target,
      };
    },
  },
];

export function buildPersonalBadges(
  games: Game[],
  libraryEntryRows: LibraryEntry[],
  sessionRows: PlaySession[],
): UserBadge[] {
  const context: BadgeContext = { games, libraryEntryRows, sessionRows };

  return badgeBlueprints
    .map((badge) => {
      const metric = badge.resolve(context);
      return {
        key: badge.key,
        icon: badge.icon,
        title: badge.title,
        description: badge.description,
        tone: badge.tone,
        unlocked: metric.unlocked,
        progress: metric.value,
        target: metric.target,
        progressLabel: metric.label,
      } satisfies UserBadge;
    })
    .sort((left, right) => {
      if (left.unlocked !== right.unlocked) return Number(right.unlocked) - Number(left.unlocked);
      const leftRatio = left.target > 0 ? left.progress / left.target : 0;
      const rightRatio = right.target > 0 ? right.progress / right.target : 0;
      return rightRatio - leftRatio;
    });
}
