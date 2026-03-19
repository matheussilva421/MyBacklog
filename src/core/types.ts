export type OwnershipStatus = "wishlist" | "owned" | "subscription" | "borrowed" | "emulated";
export type AccessModel = "wishlist" | "purchase" | "subscription" | "borrowed" | "emulated" | "unknown";
export type AccessSource =
  | "steam"
  | "epic"
  | "gog"
  | "ea_app"
  | "ubisoft_connect"
  | "game_pass"
  | "ps_store"
  | "ps_plus"
  | "nintendo_eshop"
  | "nintendo_online"
  | "apple_arcade"
  | "netflix_games"
  | "manual"
  | "other";
export type GoalType = "finished" | "started" | "playtime" | "backlog_reduction";
export type Period = "monthly" | "yearly" | "total";

export type ProgressStatus =
  | "not_started"
  | "playing"
  | "paused"
  | "finished"
  | "completed_100"
  | "abandoned"
  | "replay_later"
  | "archived";

export type Priority = "low" | "medium" | "high";
export type GameFormat = "digital" | "physical" | "subscription" | "emulated";
export type SavedViewScope = "library";
export type LibrarySavedStatusFilter = "all" | "backlog" | "playing" | "paused" | "completed" | "wishlist";
export type LibraryViewSortBy =
  | "updatedAt"
  | "title"
  | "progress"
  | "hours"
  | "priority"
  | "year"
  | "completionDate";
export type LibraryViewSortDirection = "asc" | "desc";
export type LibraryViewGroupBy = "none" | "status" | "priority" | "platform" | "sourceStore" | "ownership";

export interface Game {
  id?: number;
  title: string;
  normalizedTitle: string;
  slug?: string;
  coverUrl?: string;
  rawgId?: number;
  genres?: string;
  estimatedTime?: string;
  difficulty?: string;
  releaseYear?: number;
  platforms?: string;
  developer?: string;
  publisher?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryEntry {
  id?: number;
  gameId: number;
  platform: string;
  sourceStore: string;
  edition?: string;
  format: GameFormat;
  ownershipStatus: OwnershipStatus;
  progressStatus: ProgressStatus;
  purchaseDate?: string;
  pricePaid?: number;
  playtimeMinutes: number;
  completionPercent: number;
  priority: Priority;
  personalRating?: number;
  notes?: string;
  checklist?: string;
  mood?: string;
  favorite?: boolean;
  lastSessionAt?: string;
  completionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaySession {
  id?: number;
  libraryEntryId: number;
  date: string;
  platform: string;
  durationMinutes: number;
  chapter?: string;
  completionPercent?: number;
  mood?: string;
  note?: string;
}

export interface Review {
  id?: number;
  libraryEntryId: number;
  score?: number;
  shortReview?: string;
  longReview?: string;
  pros?: string;
  cons?: string;
  recommend?: "yes" | "no";
  hasSpoiler?: boolean;
}

export interface List {
  id?: number;
  name: string;
  createdAt: string;
}

export interface Store {
  id?: number;
  name: string;
  normalizedName: string;
  sourceKey?: AccessSource;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryEntryStore {
  id?: number;
  libraryEntryId: number;
  storeId: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface LibraryEntryList {
  id?: number;
  libraryEntryId: number;
  listId: number;
  createdAt: string;
}

export interface Tag {
  id?: number;
  name: string;
}

export interface GameTag {
  id?: number;
  libraryEntryId: number;
  tagId: number;
}

export interface Platform {
  id?: number;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
}

export interface GamePlatform {
  id?: number;
  gameId: number;
  platformId: number;
  createdAt: string;
}

export interface Goal {
  id?: number;
  type: GoalType;
  target: number;
  current: number;
  period: Period;
}

export interface Setting {
  id?: number;
  key: string;
  value: string;
  updatedAt: string;
}

export interface SavedView {
  id?: number;
  scope: SavedViewScope;
  name: string;
  statusFilter: LibrarySavedStatusFilter;
  listId?: number;
  query?: string;
  sortBy: LibraryViewSortBy;
  sortDirection: LibraryViewSortDirection;
  groupBy: LibraryViewGroupBy;
  createdAt: string;
  updatedAt: string;
}

export interface ImportJob {
  id?: number;
  source: string;
  status: "pending" | "preview" | "completed" | "failed";
  totalItems?: number;
  processedItems?: number;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyGameRecord {
  id?: number;
  title: string;
  coverUrl?: string;
  platform: string;
  sourceStore: string;
  edition?: string;
  format: GameFormat;
  ownershipStatus: OwnershipStatus;
  progressStatus: ProgressStatus;
  purchaseDate?: string;
  pricePaid?: number;
  playtimeMinutes: number;
  completionPercent: number;
  priority: Priority;
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
  completionDate?: string;
  updatedAt: string;
  createdAt: string;
}
