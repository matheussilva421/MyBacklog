import {
  LayoutDashboard,
  Library,
  FolderKanban,
  BarChart3,
  User,
  type LucideIcon
} from "lucide-react";
import type {
  Game as DbGameMetadata,
  GameTag as DbGameTag,
  Goal as DbGoal,
  LibraryEntry as DbLibraryEntry,
  List as DbList,
  PlaySession as DbPlaySession,
  Priority as DbPriority,
  ProgressStatus as DbProgressStatus,
  Review as DbReview,
  Tag as DbTag,
} from "../core/types";
import type { ImportPayload, ImportSource } from "../modules/import-export/utils/importExport";

export type ScreenKey = "dashboard" | "library" | "planner" | "stats" | "profile" | "game";

type NavigationScreenKey = Exclude<ScreenKey, "game">;

export const navigationItems: Array<{ key: NavigationScreenKey; label: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "library", label: "Biblioteca", icon: Library },
  { key: "planner", label: "Planner", icon: FolderKanban },
  { key: "stats", label: "Estatísticas", icon: BarChart3 },
  { key: "profile", label: "Perfil", icon: User },
];

export type Status = "Backlog" | "Jogando" | "Terminado" | "Pausado" | "Wishlist";
export type Priority = "Alta" | "Média" | "Baixa";
export type StatusFilter = "Todos" | Status;

export type Game = {
  id: number;
  title: string;
  platform: string;
  genre: string;
  status: Status;
  progress: number;
  hours: number;
  eta: string;
  priority: Priority;
  mood: string;
  score: number;
  year: number;
  notes: string;
  difficulty: string;
};

export type LibraryRecord = {
  game: DbGameMetadata;
  libraryEntry: DbLibraryEntry;
};

export type SessionEntry = {
  gameId: number;
  date: string;
  durationMinutes: number;
  note: string;
  completionPercent?: number;
  mood?: string;
};

export type PlannerEntry = {
  rank: number;
  gameId: number;
  reason: string;
  eta: string;
  fit: string;
};

export type LinePoint = {
  month: string;
  finished: number;
  started: number;
};

export type PiePoint = {
  name: string;
  value: number;
};

export type BarPoint = {
  name: string;
  total: number;
};

export type Goal = {
  label: string;
  value: number;
  tone: "sunset" | "violet" | "yellow";
};

export type Rule = {
  text: string;
  tone: "cyan" | "yellow" | "magenta";
};

export type Achievement = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "emerald" | "cyan" | "magenta" | "yellow";
};

export type GameFormState = {
  title: string;
  platform: string;
  genre: string;
  status: Status;
  priority: Priority;
  progress: string;
  hours: string;
  eta: string;
  score: string;
  year: string;
  mood: string;
  difficulty: string;
  notes: string;
};

export type SessionFormState = {
  gameId: string;
  date: string;
  durationMinutes: string;
  completionPercent: string;
  note: string;
  mood: string;
};

export type ImportPreviewAction = "create" | "update" | "ignore";

export type ImportPreviewEntry = {
  id: string;
  key: string;
  payload: ImportPayload;
  status: "new" | "existing";
  action: ImportPreviewAction;
  existingId?: number;
  existingTitle?: string;
  duplicateCount: number;
};

export type BackupPayload = {
  version: number;
  exportedAt: string;
  source: "mybacklog";
  games: DbGameMetadata[];
  libraryEntries: DbLibraryEntry[];
  playSessions: DbPlaySession[];
  reviews: DbReview[];
  lists: DbList[];
  tags: DbTag[];
  gameTags: DbGameTag[];
  goals: DbGoal[];
};

export type BackupTables = Omit<BackupPayload, "version" | "exportedAt" | "source">;
export type RestoreMode = "merge" | "replace";

export type RestorePreviewItem = {
  label: string;
  create: number;
  update: number;
  skip: number;
};

export type RestorePreview = {
  mode: RestoreMode;
  payload: BackupPayload;
  exportedAt: string;
  source: string;
  items: RestorePreviewItem[];
};

export const pieColors = ["#f4ef1b", "#26d8ff", "#ff57c9", "#ff8e2b", "#8c64ff"];

export const statusTone: Record<Status, string> = {
  Backlog: "yellow",
  Jogando: "cyan",
  Terminado: "emerald",
  Pausado: "magenta",
  Wishlist: "neutral",
};

export const priorityTone: Record<Priority, string> = {
  Alta: "magenta",
  Média: "cyan",
  Baixa: "neutral",
};

export const filterOptions: StatusFilter[] = ["Todos", "Backlog", "Jogando", "Pausado", "Terminado", "Wishlist"];
export const gameStatuses: Status[] = ["Backlog", "Jogando", "Pausado", "Terminado", "Wishlist"];
export const gamePriorities: Priority[] = ["Alta", "Média", "Baixa"];
export const importSources: ImportSource[] = ["csv", "steam", "playnite"];

export { cx, downloadText, formatDuration, formatMonthLabel, mergePlatformList, normalizeGameTitle, parseEtaHours } from "../core/utils";

export function statusToDbStatus(status: Status): DbProgressStatus {
  if (status === "Jogando") return "playing";
  if (status === "Pausado") return "paused";
  if (status === "Terminado") return "finished";
  return "not_started";
}

export function priorityToDbPriority(priority: Priority): DbPriority {
  if (priority === "Alta") return "high";
  if (priority === "Baixa") return "low";
  return "medium";
}

export function dbStatusToStatus(entry: DbLibraryEntry): Status {
  if (entry.ownershipStatus === "wishlist") return "Wishlist";
  if (entry.progressStatus === "playing") return "Jogando";
  if (entry.progressStatus === "paused") return "Pausado";
  if (entry.progressStatus === "finished" || entry.progressStatus === "completed_100") return "Terminado";
  return "Backlog";
}

export function dbPriorityToPriority(priority: DbPriority): Priority {
  if (priority === "high") return "Alta";
  if (priority === "low") return "Baixa";
  return "Média";
}

export { composeLibraryRecords, dbGameToUiGame } from "../modules/library/utils";
export { createDbGameFromForm, createGameFormState } from "../modules/game-page/utils/formState";
export { createSessionFormState, defaultSessionToDbSession } from "../modules/sessions/utils/sessionForm";
export { buildPlannerFit, buildPlannerReason, computePlannerScore } from "../modules/planner/utils/scoring";
export { buildImportPreview, buildRestorePreview, recordToImportPayload, parseBackupText, gamesToCsv, parseImportText, type ImportSource } from "../modules/import-export/utils/importExport";
export { backlogByDuration, platformDistribution, yearlyEvolution } from "../modules/dashboard/utils/dashboardData";
export { plannerQueue, tacticalGoals, systemRules } from "../modules/planner/utils/plannerData";
export { screenMeta } from "../modules/dashboard/utils/navigationData";
export { profileAchievements } from "../modules/settings/utils/profileData";
export { defaultGames, defaultSessions, defaultGameToDbGame, defaultGameToDbLibraryEntry } from "../core/defaults";
export { createDbGameFromImport, mergeImportedGame } from "../modules/import-export/utils/importExport";
