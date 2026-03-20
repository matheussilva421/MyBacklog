import { deriveProgressStatus, recalculateLibraryEntryFromSessions } from "../../../core/catalogIntegrity";
import { buildPlatformNamesByGameId, resolveStructuredPlatforms } from "../../../core/structuredRelations";
import type { Game, GamePlatform, LibraryEntry, Platform, PlaySession } from "../../../core/types";

export type CatalogAuditIssueKind =
  | "progress_status_mismatch"
  | "playtime_mismatch"
  | "completion_mismatch"
  | "orphan_session"
  | "missing_metadata";

export type CatalogAuditIssue = {
  id: string;
  kind: CatalogAuditIssueKind;
  title: string;
  description: string;
  repairable: boolean;
  tone: "yellow" | "magenta" | "cyan";
  libraryEntryId?: number;
  gameId?: number;
  sessionId?: number;
  missingFields?: string[];
};

export type CatalogRepairUpdate = {
  libraryEntryId: number;
  updates: Partial<LibraryEntry>;
};

export type CatalogRepairPlan = {
  entryUpdates: CatalogRepairUpdate[];
  orphanSessionIds: number[];
};

export type CatalogAuditSummary = {
  totalIssues: number;
  repairableIssues: number;
  metadataIssues: number;
  orphanSessions: number;
  playtimeIssues: number;
  progressIssues: number;
};

export type CatalogAuditReport = {
  summary: CatalogAuditSummary;
  issues: CatalogAuditIssue[];
  repairPlan: CatalogRepairPlan;
};

const metadataLabels: Record<string, string> = {
  coverUrl: "capa",
  genres: "gêneros",
  estimatedTime: "ETA",
  platforms: "plataformas",
  developer: "estúdio",
  publisher: "publisher",
  releaseYear: "ano",
};

function summarizeMetadataGaps(game: Game, structuredPlatforms: string[] = []): string[] {
  return [
    "coverUrl",
    "genres",
    "estimatedTime",
    "platforms",
    "developer",
    "publisher",
    "releaseYear",
  ].filter((field) => {
    if (field === "platforms") {
      return structuredPlatforms.length === 0;
    }
    const value = game[field as keyof Game];
    if (typeof value === "number") return !Number.isFinite(value);
    return !String(value || "").trim();
  });
}

function buildMetadataIssue(
  game: Game,
  structuredPlatforms: string[],
  libraryEntryId?: number,
): CatalogAuditIssue | null {
  const missingFields = summarizeMetadataGaps(game, structuredPlatforms);
  if (missingFields.length === 0 || game.id == null) return null;

  const labels = missingFields.map((field) => metadataLabels[field] || field);
  return {
    id: `metadata-${game.id}`,
    kind: "missing_metadata",
    title: `${game.title} com metadado incompleto`,
    description: `Campos ausentes: ${labels.join(", ")}.`,
    repairable: false,
    tone: "cyan",
    gameId: game.id,
    libraryEntryId,
    missingFields: labels,
  };
}

export function buildCatalogAuditReport(args: {
  games: Game[];
  libraryEntries: LibraryEntry[];
  sessions: PlaySession[];
  platformRows?: Platform[];
  gamePlatformRows?: GamePlatform[];
}): CatalogAuditReport {
  const { games, libraryEntries, sessions, platformRows = [], gamePlatformRows = [] } = args;
  const issues: CatalogAuditIssue[] = [];
  const gameById = new Map(games.map((game) => [game.id, game] as const));
  const entryById = new Map(libraryEntries.map((entry) => [entry.id, entry] as const));
  const platformNamesByGameId = buildPlatformNamesByGameId(platformRows, gamePlatformRows);
  const sessionsByEntryId = new Map<number, PlaySession[]>();
  const repairPlan: CatalogRepairPlan = {
    entryUpdates: [],
    orphanSessionIds: [],
  };

  for (const session of sessions) {
    const entry = entryById.get(session.libraryEntryId);
    if (!entry?.id) {
      if (session.id != null) repairPlan.orphanSessionIds.push(session.id);
      issues.push({
        id: `orphan-session-${session.id ?? `${session.libraryEntryId}-${session.date}`}`,
        kind: "orphan_session",
        title: "Sessão órfã encontrada",
        description: `A sessão em ${session.date} referencia o item ${session.libraryEntryId}, que não existe mais na biblioteca.`,
        repairable: session.id != null,
        tone: "magenta",
        sessionId: session.id,
      });
      continue;
    }

    const current = sessionsByEntryId.get(session.libraryEntryId);
    if (current) current.push(session);
    else sessionsByEntryId.set(session.libraryEntryId, [session]);
  }

  for (const entry of libraryEntries) {
    if (!entry.id) continue;
    const linkedSessions = sessionsByEntryId.get(entry.id) ?? [];
    const nextState = recalculateLibraryEntryFromSessions(entry, linkedSessions);
    const game = gameById.get(entry.gameId);

    if (linkedSessions.length > 0 && entry.playtimeMinutes !== nextState.playtimeMinutes) {
      issues.push({
        id: `playtime-${entry.id}`,
        kind: "playtime_mismatch",
        title: `Horas divergentes em ${game?.title ?? `item ${entry.id}`}`,
        description: `O item registra ${entry.playtimeMinutes} min, mas as sessões somam ${nextState.playtimeMinutes} min.`,
        repairable: true,
        tone: "yellow",
        libraryEntryId: entry.id,
        gameId: game?.id,
      });
    }

    if (linkedSessions.length > 0 && entry.completionPercent !== nextState.completionPercent) {
      issues.push({
        id: `completion-${entry.id}`,
        kind: "completion_mismatch",
        title: `Progresso consolidado divergente em ${game?.title ?? `item ${entry.id}`}`,
        description: `O item está em ${entry.completionPercent}%, mas a telemetria consolidada aponta ${nextState.completionPercent}%.`,
        repairable: true,
        tone: "yellow",
        libraryEntryId: entry.id,
        gameId: game?.id,
      });
    }

    const expectedStatus = deriveProgressStatus({
      currentStatus: entry.progressStatus,
      completionPercent: nextState.completionPercent,
      playtimeMinutes: nextState.playtimeMinutes,
      hasSessions: linkedSessions.length > 0,
    });

    if (entry.progressStatus !== expectedStatus) {
      issues.push({
        id: `status-${entry.id}`,
        kind: "progress_status_mismatch",
        title: `Status inconsistente em ${game?.title ?? `item ${entry.id}`}`,
        description: `O item está marcado como "${entry.progressStatus}", mas o estado consolidado correto é "${expectedStatus}".`,
        repairable: true,
        tone: "magenta",
        libraryEntryId: entry.id,
        gameId: game?.id,
      });
    }

    const metadataIssue = game
      ? buildMetadataIssue(
          game,
          resolveStructuredPlatforms(game, entry.platform, platformNamesByGameId),
          entry.id,
        )
      : null;
    if (metadataIssue) issues.push(metadataIssue);

    const updates: Partial<LibraryEntry> = {};
    if (linkedSessions.length > 0 && entry.playtimeMinutes !== nextState.playtimeMinutes) {
      updates.playtimeMinutes = nextState.playtimeMinutes;
    }
    if (linkedSessions.length > 0 && entry.completionPercent !== nextState.completionPercent) {
      updates.completionPercent = nextState.completionPercent;
    }
    if (entry.progressStatus !== expectedStatus) {
      updates.progressStatus = expectedStatus;
    }
    if ((entry.lastSessionAt || "") !== (nextState.lastSessionAt || "")) {
      updates.lastSessionAt = nextState.lastSessionAt;
    }
    if ((entry.completionDate || "") !== (nextState.completionDate || "")) {
      updates.completionDate = nextState.completionDate;
    }

    if (Object.keys(updates).length > 0) {
      repairPlan.entryUpdates.push({
        libraryEntryId: entry.id,
        updates,
      });
    }
  }

  const repairableIssues = issues.filter((issue) => issue.repairable).length;
  const metadataIssues = issues.filter((issue) => issue.kind === "missing_metadata").length;
  const orphanSessions = issues.filter((issue) => issue.kind === "orphan_session").length;
  const playtimeIssues = issues.filter((issue) => issue.kind === "playtime_mismatch").length;
  const progressIssues = issues.filter(
    (issue) => issue.kind === "progress_status_mismatch" || issue.kind === "completion_mismatch",
  ).length;

  return {
    summary: {
      totalIssues: issues.length,
      repairableIssues,
      metadataIssues,
      orphanSessions,
      playtimeIssues,
      progressIssues,
    },
    issues,
    repairPlan,
  };
}
