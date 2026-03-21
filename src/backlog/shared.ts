import {
  BarChart3,
  CalendarDays,
  Cloud,
  Wrench,
  FolderKanban,
  LayoutDashboard,
  Library,
  User,
  type LucideIcon,
} from "lucide-react";
import type {
  AccessModel,
  AccessSource,
  Game as DbGameMetadata,
  GamePlatform as DbGamePlatform,
  GameFormat,
  GameTag as DbGameTag,
  Goal as DbGoal,
  GoalType,
  LibrarySavedStatusFilter,
  LibraryEntry as DbLibraryEntry,
  LibraryEntryStore as DbLibraryEntryStore,
  LibraryEntryList as DbLibraryEntryList,
  LibraryViewGroupBy,
  LibraryViewSortBy,
  LibraryViewSortDirection,
  List as DbList,
  OwnershipStatus,
  Period,
  Platform as DbPlatform,
  PlaySession as DbPlaySession,
  Priority as DbPriority,
  ProgressStatus as DbProgressStatus,
  Review as DbReview,
  SavedView as DbSavedView,
  SavedViewScope,
  Setting as DbSetting,
  Store as DbStore,
  Tag as DbTag,
} from "../core/types";
import { isCompleted, isCurrentlyPlaying, isPaused, isWishlistEntry } from "../core/libraryEntryDerived";

export type {
  DbGamePlatform,
  DbGoal,
  DbLibraryEntryList,
  DbLibraryEntryStore,
  DbList,
  DbPlatform,
  DbSavedView,
  DbSetting,
  DbStore,
  AccessModel,
  AccessSource,
  GoalType,
  LibrarySavedStatusFilter,
  LibraryViewGroupBy,
  LibraryViewSortBy,
  LibraryViewSortDirection,
  Period,
  SavedViewScope,
};

export type ImportSource = "csv" | "steam" | "playnite" | "notion";

export type ImportPayload = {
  title: string;
  platform: string;
  sourceStore: string;
  platforms?: string[];
  stores?: string[];
  format: GameFormat;
  ownershipStatus: OwnershipStatus;
  progressStatus: DbProgressStatus;
  playtimeMinutes: number;
  completionPercent: number;
  completionDate?: string;
  priority: DbPriority;
  personalRating?: number;
  notes?: string;
  rawgId?: number;
  genres?: string;
  checklist?: string;
  estimatedTime?: string;
  mood?: string;
  difficulty?: string;
  releaseYear?: number;
  favorite?: boolean;
  coverUrl?: string;
  developer?: string;
  publisher?: string;
  description?: string;
  startedAt?: string;
  purchaseDate?: string;
  pricePaid?: number;
  targetPrice?: number;
  currency?: string;
  storeLink?: string;
};

export type ScreenKey =
  | "dashboard"
  | "library"
  | "maintenance"
  | "sync"
  | "sessions"
  | "planner"
  | "stats"
  | "profile"
  | "game";

type NavigationScreenKey = Exclude<ScreenKey, "game">;

export const navigationItems: Array<{
  key: NavigationScreenKey;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "library", label: "Biblioteca", icon: Library },
  { key: "maintenance", label: "Manutenção", icon: Wrench },
  { key: "sync", label: "Sync", icon: Cloud },
  { key: "sessions", label: "Sessões", icon: CalendarDays },
  { key: "planner", label: "Planner", icon: FolderKanban },
  { key: "stats", label: "Estatísticas", icon: BarChart3 },
  { key: "profile", label: "Perfil", icon: User },
];

export type Status = "Backlog" | "Jogando" | "Terminado" | "Pausado" | "Wishlist";
export type Priority = "Alta" | "Média" | "Baixa";
export type StatusFilter = "Todos" | Status;
export type LibraryListFilter = "all" | number;

export type Game = {
  id: number;
  title: string;
  platform: string;
  platforms?: string[];
  catalogPlatforms?: string;
  sourceStore: string;
  stores?: string[];
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
  description?: string;
  difficulty: string;
  completionDate?: string;
  coverUrl?: string;
  rawgId?: number;
  developer?: string;
  publisher?: string;
  startedAt?: string;
  purchaseDate?: string;
  pricePaid?: number;
  targetPrice?: number;
  currency?: string;
  storeLink?: string;
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

export type Platform = {
  id?: number;
  name: string;
  normalizedName: string;
  iconUrl?: string;
  brand?: string;
  generation?: number;
  hexColor?: string;
  createdAt: string;
  updatedAt: string;
};

export type BarPoint = {
  name: string;
  total: number;
};

export type Goal = {
  label: string;
  value: number;
  tone: "sunset" | "cyan" | "violet" | "yellow";
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

export type UserBadge = {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "emerald" | "cyan" | "magenta" | "yellow";
  unlocked: boolean;
  progress: number;
  target: number;
  progressLabel: string;
};

export type MonthlyRecap = {
  title: string;
  periodLabel: string;
  isMonthEnd: boolean;
  totalHours: number;
  totalSessions: number;
  activeGames: number;
  activeDays: number;
  topGameTitle: string | null;
  topGameHours: number;
  completedGames: number;
  addedGames: number;
  summary: string;
};

export type GameFormState = {
  title: string;
  platform: string;
  platforms: string[];
  catalogPlatforms: string;
  sourceStore: string;
  stores: string[];
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
  coverUrl: string;
  rawgId: string;
  developer: string;
  publisher: string;
  description: string;
  notes: string;
  startedAt: string;
  purchaseDate: string;
  pricePaid: string;
  targetPrice: string;
  currency: string;
  storeLink: string;
};

export type LibraryBatchApplyMode = "merge" | "replace";

export type LibraryBatchEditState = {
  applyMode: LibraryBatchApplyMode;
  status: "" | Status;
  priority: "" | Priority;
  primaryPlatform: string;
  platforms: string[];
  primaryStore: string;
  stores: string[];
  tags: string;
  listIds: number[];
};

export type SessionFormState = {
  gameId: string;
  date: string;
  durationMinutes: string;
  completionPercent: string;
  note: string;
  mood: string;
};

export type GoalFormState = {
  type: string;
  target: string;
  period: string;
};

export const goalTypeOptions: Array<{ value: GoalType; label: string }> = [
  { value: "finished", label: "Jogos concluídos" },
  { value: "started", label: "Jogos iniciados" },
  { value: "playtime", label: "Horas jogadas" },
  { value: "backlog_reduction", label: "Redução de backlog" },
];

export const goalPeriodOptions: Array<{ value: Period; label: string }> = [
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
  { value: "total", label: "Total" },
];

export type ImportPreviewAction = "create" | "update" | "ignore";

export type ImportMatchCandidate = {
  entryId: number;
  title: string;
  platform: string;
  sourceStore: string;
  overlapPlatforms: string[];
  overlapStores: string[];
  maintenanceSignals: string[];
  score: number;
  confidence: "exact" | "title" | "assisted";
};

export type ImportGameCandidate = {
  gameId: number;
  title: string;
  releaseYear?: number;
  platforms: string[];
  overlapPlatforms: string[];
  maintenanceSignals: string[];
  score: number;
  developer?: string;
  publisher?: string;
  confidence: "exact" | "metadata" | "assisted";
};

export type ImportRawgCandidate = {
  rawgId: number;
  title: string;
  releaseYear?: number;
  platforms: string[];
  score: number;
};

export type ImportPreviewEntry = {
  id: string;
  key: string;
  payload: ImportPayload;
  status: "new" | "existing" | "review";
  action: ImportPreviewAction;
  suggestedAction: ImportPreviewAction;
  existingId?: number;
  existingTitle?: string;
  duplicateCount: number;
  matchCandidates: ImportMatchCandidate[];
  selectedMatchId: number | null;
  gameCandidates: ImportGameCandidate[];
  selectedGameId: number | null;
  rawgCandidates: ImportRawgCandidate[];
  selectedRawgId: number | null;
  enrichmentStatus: "idle" | "matched" | "ambiguous" | "missing";
  confidenceScore: number;
  overlapPlatforms: string[];
  overlapStores: string[];
  maintenanceSignals: string[];
  reviewReasons: string[];
};

export type BackupPayload = {
  version: number;
  exportedAt: string;
  source: "mybacklog";
  games: DbGameMetadata[];
  libraryEntries: DbLibraryEntry[];
  stores: DbStore[];
  libraryEntryStores: DbLibraryEntryStore[];
  platforms: DbPlatform[];
  gamePlatforms: DbGamePlatform[];
  playSessions: DbPlaySession[];
  reviews: DbReview[];
  lists: DbList[];
  libraryEntryLists: DbLibraryEntryList[];
  tags: DbTag[];
  gameTags: DbGameTag[];
  goals: DbGoal[];
  settings: DbSetting[];
  savedViews: DbSavedView[];
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
export const importSources: ImportSource[] = ["csv", "steam", "playnite", "notion"];

export {
  cx,
  downloadText,
  formatDuration,
  formatMonthLabel,
  formatRemainingEta,
  mergePlatformList,
  normalizeGameTitle,
  parseEtaHours,
} from "../core/utils";

export function statusToDbStatus(status: Status): DbProgressStatus {
  switch (status) {
    case "Jogando":
      return "playing";
    case "Pausado":
      return "paused";
    case "Terminado":
      return "finished";
    case "Backlog":
    case "Wishlist":
    default:
      return "not_started";
  }
}

export function priorityToDbPriority(priority: Priority): DbPriority {
  switch (priority) {
    case "Alta":
      return "high";
    case "Baixa":
      return "low";
    case "Média":
    default:
      return "medium";
  }
}

export function dbStatusToStatus(entry: DbLibraryEntry): Status {
  if (isWishlistEntry(entry)) return "Wishlist";
  if (isCurrentlyPlaying(entry)) return "Jogando";
  if (isPaused(entry)) return "Pausado";
  if (isCompleted(entry)) return "Terminado";
  return "Backlog";
}

export function dbPriorityToPriority(priority: DbPriority): Priority {
  switch (priority) {
    case "high":
      return "Alta";
    case "low":
      return "Baixa";
    case "medium":
    default:
      return "Média";
  }
}

export { composeLibraryRecords, dbGameToUiGame } from "../modules/library/utils";
export { createDbGameFromForm, createGameFormState } from "../modules/game-page/utils/formState";
export { createSessionFormState } from "../modules/sessions/utils/sessionForm";
export { buildPlannerFit, buildPlannerReason, computePlannerScore } from "../modules/planner/utils/scoring";
export {
  attachRawgCandidatesToPreview,
  buildImportPreview,
  buildRestorePreview,
  gamesToCsv,
  parseBackupText,
  parseImportText,
  recordToImportPayload,
} from "../modules/import-export/utils/importExport";
export { backlogByDuration, platformDistribution, yearlyEvolution } from "../modules/dashboard/utils/dashboardData";
export { buildDynamicTacticalGoals, systemRules } from "../modules/planner/utils/plannerData";
export { screenMeta } from "../modules/dashboard/utils/navigationData";
export { defaultGameToDbGame, defaultGameToDbLibraryEntry, defaultGames, defaultSessions } from "../core/defaults";
export { createDbGameFromImport, mergeImportedGame } from "../modules/import-export/utils/importExport";
export {
  createPreferencesDraft,
  getDefaultPreferences,
  normalizePreferencesDraft,
  onboardingGoalTemplates,
  parseAppPreferences,
  plannerPreferenceOptions,
  preferencesToSettingPairs,
  settingsKeys,
  suggestedPlatforms,
  suggestedStarterLists,
  suggestedStores,
  toggleTokenInText,
  type AppPreferences,
  type OnboardingGoalTemplate,
  type PlannerPreference,
  type PreferencesDraft,
} from "../modules/settings/utils/preferences";
