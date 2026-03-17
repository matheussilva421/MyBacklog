import type { GameFormat, OwnershipStatus, Priority, ProgressStatus } from "./types";

export type ImportSource = "csv" | "steam" | "playnite";

export type ImportPayload = {
  title: string;
  platform: string;
  sourceStore: string;
  format: GameFormat;
  ownershipStatus: OwnershipStatus;
  progressStatus: ProgressStatus;
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
  coverUrl?: string;
  developer?: string;
  publisher?: string;
};

export function normalizeImportValue(value: string): string {
  return value.trim().toLowerCase();
}

export function createImportKey(title: string, platform: string): string {
  return `${normalizeImportValue(title)}::${normalizeImportValue(platform)}`;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvRows(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => normalizeImportValue(header));
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function parseMinutes(raw: string | number | undefined): number {
  if (typeof raw === "number") return Math.max(0, Math.round(raw));
  if (!raw) return 0;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function parseHoursToMinutes(raw: string | number | undefined): number {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 60)) : 0;
}

function mapOwnership(raw: string): OwnershipStatus {
  const value = normalizeImportValue(raw);
  if (["wishlist", "desejado"].includes(value)) return "wishlist";
  if (["subscription", "gamepass", "ps plus"].includes(value)) return "subscription";
  if (["borrowed", "emprestado"].includes(value)) return "borrowed";
  if (["emulated", "emulador"].includes(value)) return "emulated";
  return "owned";
}

function mapProgress(raw: string): ProgressStatus {
  const value = normalizeImportValue(raw);
  if (["playing", "jogando", "in progress"].includes(value)) return "playing";
  if (["paused", "pausado", "on hold"].includes(value)) return "paused";
  if (["finished", "terminado", "beaten"].includes(value)) return "finished";
  if (["completed_100", "100%", "platinado", "completed"].includes(value)) return "completed_100";
  if (["abandoned", "dropado", "dropped"].includes(value)) return "abandoned";
  if (["replay_later", "rejogar"].includes(value)) return "replay_later";
  if (["archived", "arquivado"].includes(value)) return "archived";
  return "not_started";
}

function mapPriority(raw: string): Priority {
  const value = normalizeImportValue(raw);
  if (["high", "alta"].includes(value)) return "high";
  if (["low", "baixa"].includes(value)) return "low";
  return "medium";
}

function defaultPayload(title: string): ImportPayload {
  return {
    title,
    platform: "PC",
    sourceStore: "Manual",
    format: "digital",
    ownershipStatus: "owned",
    progressStatus: "not_started",
    playtimeMinutes: 0,
    completionPercent: 0,
    priority: "medium",
  };
}

function fromCsvRows(rows: Array<Record<string, string>>, fallbackStore: string): ImportPayload[] {
  return rows
    .map((row) => {
      const title = row.title || row.name;
      if (!title) return null;
      const payload = defaultPayload(title);
      payload.platform = row.platform || row.plataforma || payload.platform;
      payload.sourceStore = row.sourcestore || row.loja || row.source || fallbackStore;
      payload.ownershipStatus = mapOwnership(row.ownershipstatus || row.ownership || row.posse || "");
      payload.progressStatus = mapProgress(row.progressstatus || row.progress || row.status || "");
      payload.priority = mapPriority(row.priority || row.prioridade || "");
      payload.genres = row.genres || row.generos || "";
      payload.notes = row.notes || row.notas || "";
      payload.personalRating = Number(row.personalrating || row.rating || row.userscore || 0) || undefined;
      payload.playtimeMinutes = parseMinutes(row.playtimeminutes || row.playtime_forever || row.playtime || 0);
      if (!payload.playtimeMinutes && row.playtimehours) payload.playtimeMinutes = parseHoursToMinutes(row.playtimehours);
      payload.completionPercent = Number(row.completionpercent || row.progresspercent || 0) || 0;
      payload.estimatedTime = row.estimatedtime || row.eta || undefined;
      payload.difficulty = row.difficulty || row.dificuldade || undefined;
      payload.releaseYear = Number(row.releaseyear || row.year || row.ano || 0) || undefined;
      payload.coverUrl = row.coverurl || row.cover || undefined;
      payload.developer = row.developer || row.studio || undefined;
      payload.publisher = row.publisher || row.publishers || undefined;
      return payload;
    })
    .filter((value): value is ImportPayload => Boolean(value));
}

export function parseImportText(source: ImportSource, text: string): ImportPayload[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if ((source === "playnite" || source === "steam") && (trimmed.startsWith("[") || trimmed.startsWith("{"))) {
    const jsonData = JSON.parse(trimmed);
    const list = Array.isArray(jsonData) ? jsonData : jsonData.games ?? jsonData.items ?? [];
    if (!Array.isArray(list)) return [];
    return list
      .map((item: Record<string, unknown>) => {
        const title = String(item.name ?? item.title ?? item.Name ?? "").trim();
        if (!title) return null;
        const payload = defaultPayload(title);
        payload.platform = String(item.platform ?? item.platforms ?? item.Platforms ?? payload.platform)
          .split(",")[0]
          .trim() || payload.platform;
        payload.sourceStore = String(
          item.sourceStore ?? item.store ?? item.Source ?? (source === "steam" ? "Steam" : "Playnite"),
        );
        payload.ownershipStatus = mapOwnership(String(item.ownershipStatus ?? item.Owned ?? "owned"));
        payload.progressStatus = mapProgress(String(item.progressStatus ?? item.CompletionStatus ?? "not_started"));
        payload.playtimeMinutes = parseMinutes(
          (item.playtimeMinutes ?? item.playtime_forever ?? item.Playtime) as string | number | undefined,
        );
        if (!payload.playtimeMinutes) {
          payload.playtimeMinutes = parseHoursToMinutes(item.HoursPlayed as string | number | undefined);
        }
        payload.personalRating = Number(item.personalRating ?? item.UserScore ?? 0) || undefined;
        payload.notes = String(item.notes ?? item.Notes ?? "") || undefined;
        payload.genres = String(item.genres ?? item.Genres ?? "") || undefined;
        payload.estimatedTime = String(item.estimatedTime ?? item.ETA ?? "") || undefined;
        payload.difficulty = String(item.difficulty ?? item.Difficulty ?? "") || undefined;
        payload.releaseYear = Number(item.releaseYear ?? item.Year ?? 0) || undefined;
        payload.coverUrl = String(item.coverUrl ?? item.background_image ?? "") || undefined;
        payload.developer = String(item.developer ?? item.Developer ?? "") || undefined;
        payload.publisher = String(item.publisher ?? item.Publisher ?? "") || undefined;
        return payload;
      })
      .filter((value): value is ImportPayload => Boolean(value));
  }

  const rows = parseCsvRows(trimmed);
  return fromCsvRows(rows, source === "steam" ? "Steam" : source === "playnite" ? "Playnite" : "CSV");
}

export function dedupeImport(
  incoming: ImportPayload[],
  existing: Array<Pick<ImportPayload, "title" | "platform">>,
): { toCreate: ImportPayload[]; duplicates: number } {
  const existingMap = new Map(existing.map((game) => [createImportKey(game.title, game.platform), game]));
  const batchMap = new Map<string, ImportPayload>();
  let duplicates = 0;

  for (const item of incoming) {
    const key = createImportKey(item.title, item.platform);
    if (existingMap.has(key) || batchMap.has(key)) {
      duplicates += 1;
      const previous = batchMap.get(key);
      if (previous) {
        previous.playtimeMinutes = Math.max(previous.playtimeMinutes, item.playtimeMinutes);
        previous.completionPercent = Math.max(previous.completionPercent, item.completionPercent);
      }
      continue;
    }
    batchMap.set(key, item);
  }

  return { toCreate: Array.from(batchMap.values()), duplicates };
}

function escapeCsv(value: string | number | undefined): string {
  if (value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function gamesToCsv(records: ImportPayload[]): string {
  const headers = [
    "title",
    "platform",
    "sourceStore",
    "ownershipStatus",
    "progressStatus",
    "priority",
    "playtimeMinutes",
    "completionPercent",
    "personalRating",
    "genres",
    "estimatedTime",
    "difficulty",
    "releaseYear",
    "developer",
    "publisher",
    "notes",
  ];

  const rows = records.map((record) =>
    headers
      .map((header) => escapeCsv((record as unknown as Record<string, string | number | undefined>)[header]))
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
