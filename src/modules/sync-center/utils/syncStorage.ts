import type { Setting as DbSetting } from "../../../core/types";

export type SyncHistoryEntry = {
  id: string;
  timestamp: string;
  action:
    | "auto-push"
    | "auto-pull"
    | "manual-push"
    | "manual-pull"
    | "manual-merge"
    | "manual-local"
    | "conflict"
    | "match"
    | "error";
  result: "success" | "skipped" | "conflict" | "error";
  message: string;
};

export const syncSettingsKeys = {
  autoSyncEnabled: "app.autoSyncEnabled",
  lastSuccessfulSyncAt: "app.lastSuccessfulSyncAt",
  syncHistory: "app.syncHistory",
  skipDefaultSeed: "app.skipDefaultSeed",
} as const;

export const localOnlySyncSettingKeys = new Set<string>([
  syncSettingsKeys.lastSuccessfulSyncAt,
  syncSettingsKeys.syncHistory,
  syncSettingsKeys.skipDefaultSeed,
]);

function readSetting(rows: DbSetting[], key: string): string | undefined {
  return rows.find((row) => row.key === key)?.value;
}

export function parseAutoSyncEnabled(settingRows: DbSetting[]): boolean {
  const raw = readSetting(settingRows, syncSettingsKeys.autoSyncEnabled);
  return raw == null ? true : raw === "true";
}

export function parseLastSuccessfulSyncAt(settingRows: DbSetting[]): string | null {
  const raw = readSetting(settingRows, syncSettingsKeys.lastSuccessfulSyncAt)?.trim();
  return raw ? raw : null;
}

export function parseSyncHistory(settingRows: DbSetting[]): SyncHistoryEntry[] {
  const raw = readSetting(settingRows, syncSettingsKeys.syncHistory);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry): entry is SyncHistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.id === "string" &&
        typeof entry.timestamp === "string" &&
        typeof entry.action === "string" &&
        typeof entry.result === "string" &&
        typeof entry.message === "string",
    );
  } catch {
    return [];
  }
}

export function normalizeSyncHistory(history: SyncHistoryEntry[], limit = 12): SyncHistoryEntry[] {
  return [...history].sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, limit);
}
