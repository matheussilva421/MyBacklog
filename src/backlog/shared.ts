import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  Library,
  PauseCircle,
  Radar,
  User,
  XCircle,
} from "lucide-react";
import type {
  Game as DbGameMetadata,
  GameTag as DbGameTag,
  Goal as DbGoal,
  LegacyGameRecord,
  LibraryEntry as DbLibraryEntry,
  List as DbList,
  PlaySession as DbPlaySession,
  Priority as DbPriority,
  ProgressStatus as DbProgressStatus,
  Review as DbReview,
  Tag as DbTag,
} from "../types";
import type { ImportPayload, ImportSource } from "../importExport";
import { createImportKey } from "../importExport";

export type ScreenKey = "dashboard" | "library" | "planner" | "stats" | "profile";
export type Status = "Backlog" | "Jogando" | "Terminado" | "Pausado" | "Wishlist";
export type Priority = "Alta" | "Media" | "Baixa";
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

export const defaultGames: Game[] = [
  { id: 1, title: "Cyberpunk 2077", platform: "PC", genre: "RPG / Open World", status: "Jogando", progress: 62, hours: 48, eta: "14h", priority: "Alta", mood: "Imersivo", score: 9.4, year: 2020, notes: "Main story forte, side quests premium.", difficulty: "Media" },
  { id: 2, title: "Alan Wake 2", platform: "PS5", genre: "Survival Horror", status: "Jogando", progress: 41, hours: 16, eta: "9h", priority: "Alta", mood: "Narrativo", score: 9.2, year: 2023, notes: "Atmosfera absurda, tensao premium.", difficulty: "Media" },
  { id: 3, title: "Sea of Stars", platform: "Switch", genre: "JRPG", status: "Jogando", progress: 37, hours: 21, eta: "16h", priority: "Media", mood: "Relax", score: 8.8, year: 2023, notes: "Otimo para sessoes tranquilas e ritmo constante.", difficulty: "Baixa" },
  { id: 4, title: "Resident Evil 4", platform: "PC", genre: "Action Horror", status: "Pausado", progress: 28, hours: 7, eta: "10h", priority: "Alta", mood: "Acao", score: 9.1, year: 2023, notes: "Ja comecou e esta facil de retomar.", difficulty: "Media" },
  { id: 5, title: "Hi-Fi Rush", platform: "PC", genre: "Action Rhythm", status: "Backlog", progress: 0, hours: 0, eta: "11h", priority: "Alta", mood: "Energia", score: 8.9, year: 2023, notes: "Cara de jogo perfeito para limpar backlog.", difficulty: "Baixa" },
  { id: 6, title: "A Short Hike", platform: "PC", genre: "Cozy Adventure", status: "Backlog", progress: 0, hours: 0, eta: "2h", priority: "Alta", mood: "Cozy", score: 8.7, year: 2019, notes: "Ideal para resolver uma meta curta.", difficulty: "Baixa" },
  { id: 7, title: "Balatro", platform: "PC", genre: "Roguelike Deckbuilder", status: "Jogando", progress: 18, hours: 6, eta: "infinito", priority: "Media", mood: "Run rapida", score: 9, year: 2024, notes: "Perigoso, rouba tempo do backlog principal.", difficulty: "Media" },
  { id: 8, title: "Metaphor: ReFantazio", platform: "PS5", genre: "JRPG", status: "Wishlist", progress: 0, hours: 0, eta: "70h", priority: "Media", mood: "Epico", score: 9.3, year: 2024, notes: "Acompanhar promo antes de entrar na fila.", difficulty: "Media" },
  { id: 9, title: "Hades", platform: "Switch", genre: "Roguelike", status: "Terminado", progress: 100, hours: 44, eta: "0h", priority: "Baixa", mood: "Combate", score: 9.5, year: 2020, notes: "Fechado, mas sempre da vontade de voltar.", difficulty: "Alta" },
  { id: 10, title: "Death Stranding 2", platform: "PS5", genre: "Cinematic Adventure", status: "Wishlist", progress: 0, hours: 0, eta: "Sem data", priority: "Alta", mood: "Imersivo", score: 9, year: 2025, notes: "Vigiar lancamento e reviews.", difficulty: "Media" },
  { id: 11, title: "Dead Cells", platform: "PC", genre: "Roguelite", status: "Pausado", progress: 34, hours: 19, eta: "8h", priority: "Baixa", mood: "Arcade", score: 8.8, year: 2018, notes: "Bom para partidas rapidas.", difficulty: "Alta" },
  { id: 12, title: "Persona 3 Reload", platform: "PC", genre: "JRPG", status: "Backlog", progress: 0, hours: 0, eta: "65h", priority: "Media", mood: "Narrativo", score: 8.9, year: 2024, notes: "Jogo grande, so entra quando abrir espaco mental.", difficulty: "Baixa" },
];

export const yearlyEvolution: LinePoint[] = [
  { month: "Jan", finished: 2, started: 3 },
  { month: "Fev", finished: 1, started: 4 },
  { month: "Mar", finished: 3, started: 2 },
  { month: "Abr", finished: 2, started: 5 },
  { month: "Mai", finished: 4, started: 3 },
  { month: "Jun", finished: 2, started: 2 },
];

export const platformDistribution: PiePoint[] = [
  { name: "PC", value: 48 },
  { name: "PS5", value: 22 },
  { name: "Switch", value: 15 },
  { name: "Retro", value: 9 },
  { name: "Mobile", value: 6 },
];

export const backlogByDuration: BarPoint[] = [
  { name: "Ate 10h", total: 18 },
  { name: "10-25h", total: 24 },
  { name: "25-50h", total: 17 },
  { name: "50h+", total: 8 },
];

export const defaultSessions: SessionEntry[] = [
  { gameId: 1, date: "2026-03-15", durationMinutes: 130, note: "Missao principal + side quest", completionPercent: 62, mood: "Imersivo" },
  { gameId: 7, date: "2026-03-14", durationMinutes: 45, note: "Run bem melhor que ontem", completionPercent: 18, mood: "Run rapida" },
  { gameId: 2, date: "2026-03-11", durationMinutes: 90, note: "Capitulo novo, clima impecavel", completionPercent: 41, mood: "Narrativo" },
  { gameId: 9, date: "2026-03-06", durationMinutes: 55, note: "Mais uma tentativa sofrida e bonita", completionPercent: 73, mood: "Combate" },
];

export const plannerQueue: PlannerEntry[] = [
  { rank: 1, gameId: 6, reason: "Resolve a meta de jogo curto e libera dopamina rapida.", eta: "2h", fit: "Fim de semana curto" },
  { rank: 2, gameId: 4, reason: "Ja comecou e esta facil de retomar. Alto retorno por pouco atrito.", eta: "10h", fit: "Noites com energia" },
  { rank: 3, gameId: 5, reason: "Combina com seu gosto por acao estilosa sem compromisso de 50h+.", eta: "11h", fit: "Bloco medio" },
  { rank: 4, gameId: 3, reason: "Ja existe progresso, mas exige mais janela mental.", eta: "16h", fit: "Sessoes longas" },
];

export const tacticalGoals: Goal[] = [
  { label: "Finalizar 1 jogo curto", value: 70, tone: "sunset" },
  { label: "Registrar 5 sessoes", value: 80, tone: "violet" },
  { label: "Reduzir backlog em 2 jogos", value: 40, tone: "yellow" },
];

export const systemRules: Rule[] = [
  { tone: "cyan", text: "+ Jogos curtos recebem bonus para limpar backlog mais rapido." },
  { tone: "yellow", text: "+ Jogos ja iniciados sobem na fila por terem menor atrito de retorno." },
  { tone: "magenta", text: "+ Jogos longos entram quando houver espaco mental e janela de tempo real." },
];

export const profileAchievements: Achievement[] = [
  { icon: CheckCircle2, tone: "emerald", title: "39 jogos finalizados", description: "Historico solido e biblioteca viva." },
  { icon: Radar, tone: "cyan", title: "Radar de progresso ativo", description: "4 jogos com acompanhamento continuo." },
  { icon: PauseCircle, tone: "magenta", title: "2 jogos pausados", description: "Baixo atrito para retomar e gerar avanco real." },
  { icon: XCircle, tone: "yellow", title: "Gargalo de medio porte", description: "Faixa 10-25h segue como principal bloco do backlog." },
];

export const navigationItems: Array<{ key: ScreenKey; label: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "library", label: "Biblioteca", icon: Library },
  { key: "planner", label: "Planner", icon: FolderKanban },
  { key: "stats", label: "Estatisticas", icon: BarChart3 },
  { key: "profile", label: "Perfil", icon: User },
];

export const screenMeta: Record<ScreenKey, { before: string; accent: string }> = {
  dashboard: { before: "Visao", accent: "Geral" },
  library: { before: "Catalogo", accent: "Tatico" },
  planner: { before: "Fila de", accent: "Execucao" },
  stats: { before: "Telemetria", accent: "Pessoal" },
  profile: { before: "Camada de", accent: "Perfil" },
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
  Media: "cyan",
  Baixa: "neutral",
};

export const filterOptions: StatusFilter[] = ["Todos", "Backlog", "Jogando", "Pausado", "Terminado", "Wishlist"];
export const gameStatuses: Status[] = ["Backlog", "Jogando", "Pausado", "Terminado", "Wishlist"];
export const gamePriorities: Priority[] = ["Alta", "Media", "Baixa"];
export const importSources: ImportSource[] = ["csv", "steam", "playnite"];

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

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
  return "Media";
}

export function parseEtaHours(raw: string): number {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned.includes("sem data") || cleaned.includes("infinito")) return Number.POSITIVE_INFINITY;
  const match = cleaned.match(/(\d+[.,]?\d*)/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1].replace(",", "."));
}

export function formatDuration(durationMinutes: number): string {
  const safe = Math.max(0, Math.round(durationMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleString("pt-BR", { month: "short" }).replace(".", "").replace(/^\w/, (value) => value.toUpperCase());
}

export function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function createGameFormState(game?: Game): GameFormState {
  return {
    title: game?.title ?? "",
    platform: game?.platform ?? "PC",
    genre: game?.genre ?? "",
    status: game?.status ?? "Backlog",
    priority: game?.priority ?? "Media",
    progress: game ? String(game.progress) : "0",
    hours: game ? String(game.hours) : "0",
    eta: game?.eta ?? "12h",
    score: game ? String(game.score) : "",
    year: game ? String(game.year) : String(new Date().getFullYear()),
    mood: game?.mood ?? "",
    difficulty: game?.difficulty ?? "Media",
    notes: game?.notes ?? "",
  };
}

export function createSessionFormState(gameId?: number): SessionFormState {
  return {
    gameId: gameId ? String(gameId) : "",
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: "60",
    completionPercent: "",
    note: "",
    mood: "",
  };
}

function seedCreatedAt(index: number): string {
  const date = new Date("2025-10-08T12:00:00.000Z");
  date.setMonth(date.getMonth() + index);
  return date.toISOString();
}

function seedUpdatedAt(game: Game, index: number): string {
  const date = new Date(seedCreatedAt(index));
  date.setDate(date.getDate() + (game.status === "Terminado" ? 10 : 3));
  return date.toISOString();
}

function normalizeGameTitle(title: string): string {
  return title.trim().toLowerCase();
}

function mergePlatformList(current: string | undefined, platform: string): string {
  const tokens = new Set(
    [current, platform]
      .flatMap((value) => String(value || "").split(","))
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return Array.from(tokens).join(", ");
}

export function defaultGameToDbGame(game: Game, index: number): DbGameMetadata {
  return {
    id: game.id,
    title: game.title,
    normalizedTitle: normalizeGameTitle(game.title),
    genres: game.genre,
    estimatedTime: game.eta,
    difficulty: game.difficulty,
    releaseYear: game.year,
    platforms: game.platform,
    createdAt: seedCreatedAt(index),
    updatedAt: seedUpdatedAt(game, index),
  };
}

export function defaultGameToDbLibraryEntry(game: Game, index: number): DbLibraryEntry {
  return {
    id: game.id,
    gameId: game.id,
    platform: game.platform,
    sourceStore: "Manual",
    format: "digital",
    ownershipStatus: game.status === "Wishlist" ? "wishlist" : "owned",
    progressStatus: statusToDbStatus(game.status),
    playtimeMinutes: game.hours * 60,
    completionPercent: game.progress,
    priority: priorityToDbPriority(game.priority),
    personalRating: game.score,
    notes: game.notes,
    mood: game.mood,
    favorite: game.priority === "Alta",
    createdAt: seedCreatedAt(index),
    updatedAt: seedUpdatedAt(game, index),
  };
}

export function defaultSessionToDbSession(session: SessionEntry, index: number): DbPlaySession {
  const fallbackGame = defaultGames.find((game) => game.id === session.gameId);
  return {
    libraryEntryId: session.gameId,
    date: session.date,
    platform: fallbackGame?.platform ?? "PC",
    durationMinutes: session.durationMinutes,
    completionPercent: session.completionPercent,
    mood: session.mood,
    note: session.note,
    chapter: `Registro ${index + 1}`,
  };
}

export function composeLibraryRecords(games: DbGameMetadata[], libraryEntries: DbLibraryEntry[]): LibraryRecord[] {
  const gameMap = new Map(games.map((game) => [game.id, game]));
  return libraryEntries
    .map((libraryEntry) => {
      const game = gameMap.get(libraryEntry.gameId);
      if (!game) return null;
      return { game, libraryEntry };
    })
    .filter((record): record is LibraryRecord => Boolean(record));
}

export function dbGameToUiGame(record: LibraryRecord): Game {
  const { game, libraryEntry } = record;
  const genre = game.genres?.split(",")[0]?.trim() || game.genres || "Catalogo tatico";
  return {
    id: libraryEntry.id ?? Date.now(),
    title: game.title,
    platform: libraryEntry.platform || game.platforms?.split(",")[0]?.trim() || "PC",
    genre,
    status: dbStatusToStatus(libraryEntry),
    progress: Math.max(0, Math.min(100, Math.round(libraryEntry.completionPercent || 0))),
    hours: Math.max(0, Math.round((libraryEntry.playtimeMinutes || 0) / 60)),
    eta: game.estimatedTime || "Sem dado",
    priority: dbPriorityToPriority(libraryEntry.priority),
    mood: libraryEntry.mood || "Tatico",
    score: typeof libraryEntry.personalRating === "number" ? Number(libraryEntry.personalRating) : 0,
    year: game.releaseYear || new Date(game.createdAt || Date.now()).getFullYear(),
    notes: libraryEntry.notes || "Sem leitura registrada no sistema.",
    difficulty: game.difficulty || "Media",
  };
}

export function buildPlannerReason(game: Game): string {
  const reasons: string[] = [];
  const etaHours = parseEtaHours(game.eta);
  if (game.progress > 0) reasons.push("Ja existe progresso e o atrito de retorno e baixo.");
  if (etaHours <= 12) reasons.push("Cabe em bloco curto e ajuda a limpar backlog rapido.");
  if (game.priority === "Alta") reasons.push("Prioridade manual alta mantem o jogo no topo.");
  if (reasons.length === 0) reasons.push("Bom encaixe para manter o backlog em movimento.");
  return reasons.join(" ");
}

export function buildPlannerFit(game: Game): string {
  const etaHours = parseEtaHours(game.eta);
  if (etaHours <= 3) return "Fim de semana curto";
  if (etaHours <= 12) return "Bloco medio";
  if (game.status === "Pausado") return "Retorno imediato";
  if (game.mood.toLowerCase().includes("energia")) return "Noites com energia";
  return "Sessoes longas";
}

export function createDbGameFromForm(form: GameFormState, current?: LibraryRecord): LibraryRecord {
  const progress = Math.max(0, Math.min(100, Math.round(Number(form.progress) || 0)));
  const hours = Math.max(0, Number(form.hours) || 0);
  const title = form.title.trim();
  const platform = form.platform.trim() || "PC";
  const now = new Date().toISOString();

  return {
    game: {
      id: current?.game.id,
      title,
      normalizedTitle: normalizeGameTitle(title),
      slug: current?.game.slug,
      coverUrl: current?.game.coverUrl,
      rawgId: current?.game.rawgId,
      genres: form.genre.trim() || undefined,
      estimatedTime: form.eta.trim() || undefined,
      difficulty: form.difficulty.trim() || undefined,
      releaseYear: form.year ? Number(form.year) : undefined,
      platforms: mergePlatformList(current?.game.platforms, platform),
      developer: current?.game.developer,
      publisher: current?.game.publisher,
      createdAt: current?.game.createdAt || now,
      updatedAt: now,
    },
    libraryEntry: {
      id: current?.libraryEntry.id,
      gameId: current?.game.id ?? 0,
      platform,
      sourceStore: current?.libraryEntry.sourceStore || "Manual",
      edition: current?.libraryEntry.edition,
      format: current?.libraryEntry.format || "digital",
      ownershipStatus: form.status === "Wishlist" ? "wishlist" : "owned",
      progressStatus: statusToDbStatus(form.status),
      purchaseDate: current?.libraryEntry.purchaseDate,
      pricePaid: current?.libraryEntry.pricePaid,
      playtimeMinutes: Math.round(hours * 60),
      completionPercent: form.status === "Terminado" ? 100 : progress,
      priority: priorityToDbPriority(form.priority),
      personalRating: form.score ? Number(form.score) : undefined,
      notes: form.notes.trim() || undefined,
      checklist: current?.libraryEntry.checklist,
      mood: form.mood.trim() || undefined,
      favorite: current?.libraryEntry.favorite ?? form.priority === "Alta",
      lastSessionAt: current?.libraryEntry.lastSessionAt,
      createdAt: current?.libraryEntry.createdAt || now,
      updatedAt: now,
    },
  };
}

export function createDbGameFromImport(item: ImportPayload, currentGame?: DbGameMetadata, currentEntry?: DbLibraryEntry): LibraryRecord {
  const now = new Date().toISOString();
  return {
    game: {
      id: currentGame?.id,
      title: item.title.trim(),
      normalizedTitle: normalizeGameTitle(item.title),
      slug: currentGame?.slug,
      coverUrl: item.coverUrl || currentGame?.coverUrl,
      rawgId: item.rawgId ?? currentGame?.rawgId,
      genres: item.genres || currentGame?.genres,
      estimatedTime: item.estimatedTime || currentGame?.estimatedTime || (item.playtimeMinutes ? `${Math.max(1, Math.round(item.playtimeMinutes / 60))}h` : "Sem dado"),
      difficulty: item.difficulty || currentGame?.difficulty || "Media",
      releaseYear: item.releaseYear ?? currentGame?.releaseYear,
      platforms: mergePlatformList(currentGame?.platforms, item.platform),
      developer: item.developer || currentGame?.developer,
      publisher: item.publisher || currentGame?.publisher,
      createdAt: currentGame?.createdAt || now,
      updatedAt: now,
    },
    libraryEntry: {
      id: currentEntry?.id,
      gameId: currentGame?.id ?? 0,
      platform: item.platform.trim() || currentEntry?.platform || "PC",
      sourceStore: item.sourceStore || currentEntry?.sourceStore || "Importado",
      edition: currentEntry?.edition,
      format: item.format || currentEntry?.format || "digital",
      ownershipStatus: item.ownershipStatus || currentEntry?.ownershipStatus || "owned",
      progressStatus: item.progressStatus || currentEntry?.progressStatus || "not_started",
      purchaseDate: currentEntry?.purchaseDate,
      pricePaid: currentEntry?.pricePaid,
      playtimeMinutes: Math.max(item.playtimeMinutes || 0, currentEntry?.playtimeMinutes || 0),
      completionPercent: Math.max(item.completionPercent || 0, currentEntry?.completionPercent || 0),
      priority: item.priority || currentEntry?.priority || "medium",
      personalRating: item.personalRating ?? currentEntry?.personalRating,
      notes: item.notes || currentEntry?.notes,
      checklist: item.checklist || currentEntry?.checklist,
      mood: item.mood || currentEntry?.mood || "Importado",
      favorite: item.favorite ?? currentEntry?.favorite ?? item.priority === "high",
      lastSessionAt: currentEntry?.lastSessionAt,
      createdAt: currentEntry?.createdAt || now,
      updatedAt: now,
    },
  };
}

function progressStatusWeight(status: DbProgressStatus): number {
  switch (status) {
    case "completed_100":
      return 6;
    case "finished":
      return 5;
    case "playing":
      return 4;
    case "paused":
      return 3;
    case "replay_later":
      return 2;
    case "abandoned":
      return 1;
    case "archived":
      return 0;
    default:
      return 2;
  }
}

function priorityWeight(priority: DbPriority): number {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function mergeOwnershipStatus(current: DbLibraryEntry["ownershipStatus"], incoming: ImportPayload["ownershipStatus"]): DbLibraryEntry["ownershipStatus"] {
  if (current === "owned" || incoming === "owned") return "owned";
  if (current === "subscription" || incoming === "subscription") return "subscription";
  if (current === "borrowed" || incoming === "borrowed") return "borrowed";
  if (current === "emulated" || incoming === "emulated") return "emulated";
  return "wishlist";
}

function pickProgressStatus(left: DbProgressStatus, right: DbProgressStatus, completionPercent: number): DbProgressStatus {
  if (completionPercent >= 100) return "finished";
  return progressStatusWeight(right) > progressStatusWeight(left) ? right : left;
}

function mergeImportPayloads(current: ImportPayload, incoming: ImportPayload): ImportPayload {
  const completionPercent = Math.max(current.completionPercent || 0, incoming.completionPercent || 0);
  return {
    ...current,
    ...incoming,
    title: current.title || incoming.title,
    platform: incoming.platform || current.platform,
    sourceStore: incoming.sourceStore || current.sourceStore,
    format: incoming.format || current.format,
    ownershipStatus: mergeOwnershipStatus(current.ownershipStatus, incoming.ownershipStatus),
    progressStatus: pickProgressStatus(current.progressStatus, incoming.progressStatus, completionPercent),
    playtimeMinutes: Math.max(current.playtimeMinutes || 0, incoming.playtimeMinutes || 0),
    completionPercent,
    priority: priorityWeight(incoming.priority) > priorityWeight(current.priority) ? incoming.priority : current.priority,
    personalRating: incoming.personalRating ?? current.personalRating,
    notes: incoming.notes || current.notes,
    rawgId: incoming.rawgId ?? current.rawgId,
    genres: incoming.genres || current.genres,
    checklist: incoming.checklist || current.checklist,
    estimatedTime: incoming.estimatedTime || current.estimatedTime,
    mood: incoming.mood || current.mood,
    difficulty: incoming.difficulty || current.difficulty,
    releaseYear: incoming.releaseYear ?? current.releaseYear,
    favorite: current.favorite ?? incoming.favorite,
    coverUrl: incoming.coverUrl || current.coverUrl,
    developer: incoming.developer || current.developer,
    publisher: incoming.publisher || current.publisher,
  };
}

export function recordToImportPayload(record: LibraryRecord): ImportPayload {
  const { game, libraryEntry } = record;
  return {
    title: game.title,
    platform: libraryEntry.platform,
    sourceStore: libraryEntry.sourceStore,
    format: libraryEntry.format,
    ownershipStatus: libraryEntry.ownershipStatus,
    progressStatus: libraryEntry.progressStatus,
    playtimeMinutes: libraryEntry.playtimeMinutes,
    completionPercent: libraryEntry.completionPercent,
    priority: libraryEntry.priority,
    personalRating: libraryEntry.personalRating,
    notes: libraryEntry.notes,
    rawgId: game.rawgId,
    genres: game.genres,
    checklist: libraryEntry.checklist,
    estimatedTime: game.estimatedTime,
    mood: libraryEntry.mood,
    difficulty: game.difficulty,
    releaseYear: game.releaseYear,
    favorite: libraryEntry.favorite,
    coverUrl: game.coverUrl,
    developer: game.developer,
    publisher: game.publisher,
  };
}

export function buildImportPreview(parsed: ImportPayload[], existingRecords: LibraryRecord[]): ImportPreviewEntry[] {
  const existingMap = new Map(
    existingRecords.map((record) => [createImportKey(record.game.title, record.libraryEntry.platform), record]),
  );
  const previewMap = new Map<string, ImportPreviewEntry>();

  for (const item of parsed) {
    const key = createImportKey(item.title, item.platform);
    const current = previewMap.get(key);
    if (current) {
      current.payload = mergeImportPayloads(current.payload, item);
      current.duplicateCount += 1;
      continue;
    }

    const existing = existingMap.get(key);
    previewMap.set(key, {
      id: `${key}-${previewMap.size + 1}`,
      key,
      payload: item,
      status: existing ? "existing" : "new",
      action: existing ? "update" : "create",
      existingId: existing?.libraryEntry.id,
      existingTitle: existing?.game.title,
      duplicateCount: 0,
    });
  }

  return Array.from(previewMap.values()).sort((left, right) => {
    if (left.status !== right.status) return left.status === "new" ? -1 : 1;
    return left.payload.title.localeCompare(right.payload.title, "pt-BR");
  });
}

export function mergeImportedGame(existing: LibraryRecord, incoming: ImportPayload): LibraryRecord {
  const merged = createDbGameFromImport(incoming, existing.game, existing.libraryEntry);
  const completionPercent = Math.max(existing.libraryEntry.completionPercent || 0, incoming.completionPercent || 0);
  const priority =
    priorityWeight(incoming.priority) > priorityWeight(existing.libraryEntry.priority)
      ? incoming.priority
      : existing.libraryEntry.priority;

  return {
    game: {
      ...existing.game,
      ...merged.game,
      normalizedTitle: normalizeGameTitle(incoming.title || existing.game.title),
      platforms: mergePlatformList(existing.game.platforms, incoming.platform),
      updatedAt: new Date().toISOString(),
    },
    libraryEntry: {
      ...existing.libraryEntry,
      ...merged.libraryEntry,
      gameId: existing.game.id ?? merged.libraryEntry.gameId,
      ownershipStatus: mergeOwnershipStatus(existing.libraryEntry.ownershipStatus, incoming.ownershipStatus),
      progressStatus: pickProgressStatus(existing.libraryEntry.progressStatus, incoming.progressStatus, completionPercent),
      completionPercent,
      playtimeMinutes: Math.max(existing.libraryEntry.playtimeMinutes || 0, incoming.playtimeMinutes || 0),
      priority,
      favorite: Boolean(existing.libraryEntry.favorite || incoming.favorite || priority === "high"),
      updatedAt: new Date().toISOString(),
    },
  };
}

function buildLegacyRecords(games: LegacyGameRecord[]): LibraryRecord[] {
  const metadataByKey = new Map<string, DbGameMetadata>();
  const records: LibraryRecord[] = [];

  for (const item of games) {
    if (!item.id) continue;
    const normalizedTitle = normalizeGameTitle(item.title);
    let game = metadataByKey.get(normalizedTitle);
    if (!game) {
      game = {
        id: item.id,
        title: item.title,
        normalizedTitle,
        coverUrl: item.coverUrl,
        rawgId: item.rawgId,
        genres: item.genres,
        estimatedTime: item.estimatedTime,
        difficulty: item.difficulty,
        releaseYear: item.releaseYear,
        platforms: item.platform,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
      metadataByKey.set(normalizedTitle, game);
    } else {
      game.platforms = mergePlatformList(game.platforms, item.platform);
      game.updatedAt = game.updatedAt > item.updatedAt ? game.updatedAt : item.updatedAt;
    }

    records.push({
      game,
      libraryEntry: {
        id: item.id,
        gameId: game.id ?? item.id,
        platform: item.platform,
        sourceStore: item.sourceStore,
        edition: item.edition,
        format: item.format,
        ownershipStatus: item.ownershipStatus,
        progressStatus: item.progressStatus,
        purchaseDate: item.purchaseDate,
        pricePaid: item.pricePaid,
        playtimeMinutes: item.playtimeMinutes,
        completionPercent: item.completionPercent,
        priority: item.priority,
        personalRating: item.personalRating,
        notes: item.notes,
        checklist: item.checklist,
        mood: item.mood,
        favorite: item.favorite,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
  }

  return records;
}

function normalizeLegacyBackup(parsed: Record<string, unknown>): BackupPayload | null {
  if (!Array.isArray(parsed.games) || !Array.isArray(parsed.playSessions)) return null;
  const records = buildLegacyRecords(parsed.games as LegacyGameRecord[]);
  const games = Array.from(new Map(records.map((record) => [record.game.id, record.game])).values());
  const libraryEntries = records.map((record) => record.libraryEntry);

  return {
    version: typeof parsed.version === "number" ? parsed.version : 1,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    source: "mybacklog",
    games,
    libraryEntries,
    playSessions: (Array.isArray(parsed.playSessions) ? parsed.playSessions : []).map((session) => ({
      ...(session as Record<string, unknown>),
      libraryEntryId: (session as Record<string, number>).libraryEntryId ?? (session as Record<string, number>).gameId,
    })) as DbPlaySession[],
    reviews: (Array.isArray(parsed.reviews) ? parsed.reviews : []).map((review) => ({
      ...(review as Record<string, unknown>),
      libraryEntryId: (review as Record<string, number>).libraryEntryId ?? (review as Record<string, number>).gameId,
    })) as DbReview[],
    lists: (Array.isArray(parsed.lists) ? parsed.lists : []) as DbList[],
    tags: (Array.isArray(parsed.tags) ? parsed.tags : []) as DbTag[],
    gameTags: (Array.isArray(parsed.gameTags) ? parsed.gameTags : []).map((entry) => ({
      ...(entry as Record<string, unknown>),
      libraryEntryId: (entry as Record<string, number>).libraryEntryId ?? (entry as Record<string, number>).gameId,
    })) as DbGameTag[],
    goals: (Array.isArray(parsed.goals) ? parsed.goals : []) as DbGoal[],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function parseBackupText(text: string): BackupPayload | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const parsed = JSON.parse(trimmed);
  if (!isObject(parsed)) return null;

  if (!Array.isArray(parsed.libraryEntries)) {
    return normalizeLegacyBackup(parsed);
  }

  const payload: BackupPayload = {
    version: typeof parsed.version === "number" ? parsed.version : 1,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    source: "mybacklog",
    games: asArray<DbGameMetadata>(parsed.games),
    libraryEntries: asArray<DbLibraryEntry>(parsed.libraryEntries),
    playSessions: asArray<DbPlaySession>(parsed.playSessions),
    reviews: asArray<DbReview>(parsed.reviews),
    lists: asArray<DbList>(parsed.lists),
    tags: asArray<DbTag>(parsed.tags),
    gameTags: asArray<DbGameTag>(parsed.gameTags),
    goals: asArray<DbGoal>(parsed.goals),
  };

  if (!Array.isArray(parsed.games) || !Array.isArray(parsed.playSessions)) return null;
  return payload;
}

export function buildRestorePreview(payload: BackupPayload, mode: RestoreMode, current: BackupTables): RestorePreview {
  if (mode === "replace") {
    return {
      mode,
      payload,
      exportedAt: payload.exportedAt,
      source: payload.source,
      items: [
        { label: "Jogos", create: payload.games.length, update: 0, skip: 0 },
        { label: "Biblioteca", create: payload.libraryEntries.length, update: 0, skip: 0 },
        { label: "Sessoes", create: payload.playSessions.length, update: 0, skip: 0 },
        { label: "Reviews", create: payload.reviews.length, update: 0, skip: 0 },
        { label: "Listas", create: payload.lists.length, update: 0, skip: 0 },
        { label: "Tags", create: payload.tags.length, update: 0, skip: 0 },
        { label: "Relacoes tag", create: payload.gameTags.length, update: 0, skip: 0 },
        { label: "Metas", create: payload.goals.length, update: 0, skip: 0 },
      ],
    };
  }

  const currentGamesByTitle = new Map(current.games.map((game) => [game.normalizedTitle || normalizeGameTitle(game.title), game]));
  const currentGamesById = new Map(current.games.map((game) => [game.id, game]));
  const currentEntryByKey = new Map(
    current.libraryEntries.map((entry) => [createImportKey(currentGamesById.get(entry.gameId)?.title || "", entry.platform), entry] as const),
  );
  const currentListsByName = new Set(current.lists.map((list) => list.name.trim().toLowerCase()));
  const currentTagsByName = new Map(current.tags.map((tag) => [tag.name.trim().toLowerCase(), tag]));
  const currentGoalsByKey = new Set(current.goals.map((goal) => `${goal.type}::${goal.period}`));
  const currentReviewsByEntry = new Set(current.reviews.map((review) => review.libraryEntryId));
  const currentSessions = new Set(
    current.playSessions.map((session) => `${session.libraryEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`),
  );
  const currentGameTags = new Set(current.gameTags.map((entry) => `${entry.libraryEntryId}::${entry.tagId}`));

  const payloadGamesById = new Map(payload.games.map((game) => [game.id, game]));
  const resolvedGameIdByPayloadId = new Map<number, number>();
  const resolvedEntryIdByPayloadId = new Map<number, number>();
  const resolvedTagIdByPayloadId = new Map<number, number>();

  let gameCreate = 0;
  let gameUpdate = 0;
  let gameSkip = 0;
  const seenGameTitles = new Set<string>();
  for (const game of payload.games) {
    const normalizedTitle = game.normalizedTitle || normalizeGameTitle(game.title);
    if (seenGameTitles.has(normalizedTitle)) {
      gameSkip += 1;
      continue;
    }
    seenGameTitles.add(normalizedTitle);
    const existing = currentGamesByTitle.get(normalizedTitle);
    if (existing?.id != null && game.id != null) resolvedGameIdByPayloadId.set(game.id, existing.id);
    if (existing) gameUpdate += 1;
    else gameCreate += 1;
  }

  let entryCreate = 0;
  let entryUpdate = 0;
  let entrySkip = 0;
  const seenEntryKeys = new Set<string>();
  for (const entry of payload.libraryEntries) {
    const payloadGame = payloadGamesById.get(entry.gameId);
    const title = payloadGame?.title;
    if (!title) {
      entrySkip += 1;
      continue;
    }
    const key = createImportKey(title, entry.platform);
    if (seenEntryKeys.has(key)) {
      entrySkip += 1;
      continue;
    }
    seenEntryKeys.add(key);
    const existing = currentEntryByKey.get(key);
    if (existing?.id != null && entry.id != null) resolvedEntryIdByPayloadId.set(entry.id, existing.id);
    if (existing) entryUpdate += 1;
    else entryCreate += 1;
  }

  let sessionCreate = 0;
  let sessionSkip = 0;
  for (const session of payload.playSessions) {
    const targetEntryId = resolvedEntryIdByPayloadId.get(session.libraryEntryId);
    if (!targetEntryId) {
      sessionSkip += 1;
      continue;
    }
    const signature = `${targetEntryId}::${session.date}::${session.durationMinutes}::${(session.note || "").trim().toLowerCase()}::${session.completionPercent ?? ""}`;
    if (currentSessions.has(signature)) sessionSkip += 1;
    else sessionCreate += 1;
  }

  let reviewCreate = 0;
  let reviewUpdate = 0;
  let reviewSkip = 0;
  const seenReviewEntries = new Set<number>();
  for (const review of payload.reviews) {
    const targetEntryId = resolvedEntryIdByPayloadId.get(review.libraryEntryId);
    if (!targetEntryId || seenReviewEntries.has(targetEntryId)) {
      reviewSkip += 1;
      continue;
    }
    seenReviewEntries.add(targetEntryId);
    if (currentReviewsByEntry.has(targetEntryId)) reviewUpdate += 1;
    else reviewCreate += 1;
  }

  let listCreate = 0;
  let listUpdate = 0;
  let listSkip = 0;
  const seenLists = new Set<string>();
  for (const list of payload.lists) {
    const key = list.name.trim().toLowerCase();
    if (!key || seenLists.has(key)) {
      listSkip += 1;
      continue;
    }
    seenLists.add(key);
    if (currentListsByName.has(key)) listUpdate += 1;
    else listCreate += 1;
  }

  let tagCreate = 0;
  let tagUpdate = 0;
  let tagSkip = 0;
  const seenTags = new Set<string>();
  for (const tag of payload.tags) {
    const key = tag.name.trim().toLowerCase();
    if (!key || seenTags.has(key)) {
      tagSkip += 1;
      continue;
    }
    seenTags.add(key);
    const existing = currentTagsByName.get(key);
    if (existing?.id != null && tag.id != null) resolvedTagIdByPayloadId.set(tag.id, existing.id);
    if (existing) tagUpdate += 1;
    else tagCreate += 1;
  }

  let gameTagCreate = 0;
  let gameTagSkip = 0;
  const seenPairs = new Set<string>();
  for (const entry of payload.gameTags) {
    const targetEntryId = resolvedEntryIdByPayloadId.get(entry.libraryEntryId);
    const targetTagId = resolvedTagIdByPayloadId.get(entry.tagId);
    if (!targetEntryId || !targetTagId) {
      gameTagSkip += 1;
      continue;
    }
    const key = `${targetEntryId}::${targetTagId}`;
    if (currentGameTags.has(key) || seenPairs.has(key)) gameTagSkip += 1;
    else {
      seenPairs.add(key);
      gameTagCreate += 1;
    }
  }

  let goalCreate = 0;
  let goalUpdate = 0;
  let goalSkip = 0;
  const seenGoals = new Set<string>();
  for (const goal of payload.goals) {
    const key = `${goal.type}::${goal.period}`;
    if (seenGoals.has(key)) {
      goalSkip += 1;
      continue;
    }
    seenGoals.add(key);
    if (currentGoalsByKey.has(key)) goalUpdate += 1;
    else goalCreate += 1;
  }

  return {
    mode,
    payload,
    exportedAt: payload.exportedAt,
    source: payload.source,
    items: [
      { label: "Jogos", create: gameCreate, update: gameUpdate, skip: gameSkip },
      { label: "Biblioteca", create: entryCreate, update: entryUpdate, skip: entrySkip },
      { label: "Sessoes", create: sessionCreate, update: 0, skip: sessionSkip },
      { label: "Reviews", create: reviewCreate, update: reviewUpdate, skip: reviewSkip },
      { label: "Listas", create: listCreate, update: listUpdate, skip: listSkip },
      { label: "Tags", create: tagCreate, update: tagUpdate, skip: tagSkip },
      { label: "Relacoes tag", create: gameTagCreate, update: 0, skip: gameTagSkip },
      { label: "Metas", create: goalCreate, update: goalUpdate, skip: goalSkip },
    ],
  };
}

export function computePlannerScore(game: Game): number {
  let score = 0;
  const etaHours = parseEtaHours(game.eta);
  if (game.status === "Pausado") score += 36;
  if (game.status === "Jogando") score += 28;
  if (game.status === "Backlog") score += 12;
  if (game.priority === "Alta") score += 26;
  if (game.priority === "Media") score += 14;
  if (game.progress > 0) score += Math.min(22, Math.round(game.progress / 4));
  if (etaHours <= 5) score += 18;
  else if (etaHours <= 12) score += 14;
  else if (etaHours <= 25) score += 8;
  else if (etaHours <= 50) score += 2;
  else score -= 8;
  if (game.mood.toLowerCase().includes("cozy")) score += 4;
  if (game.mood.toLowerCase().includes("energia")) score += 6;
  if (game.status === "Wishlist") score = -999;
  if (game.status === "Terminado") score = -999;
  return score;
}
