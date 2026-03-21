import { db } from "../core/db";
import type { EntityType } from "../core/types";

export interface SyncFailureEvent {
  id?: number;
  mutationId: number;
  entityType: EntityType;
  mutationType: "create" | "update" | "delete";
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  timestamp: string;
  resolvedAt?: string | null;
  resolution?: "success" | "discarded" | "manual-retry";
}

/**
 * Log de falha de sync no IndexedDB.
 */
export async function logSyncFailure(
  mutationId: number,
  entityType: EntityType,
  mutationType: "create" | "update" | "delete",
  error: unknown,
  retryCount: number,
): Promise<void> {
  await db.transaction("rw", db.pendingMutations, db.settings, async () => {
    const events = await db.settings.get({ key: "syncFailureEvents" });
    const currentEvents: SyncFailureEvent[] = events ? JSON.parse(events.value) : [];

    const newEvent: SyncFailureEvent = {
      mutationId,
      entityType,
      mutationType,
      errorCode: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      retryCount,
      timestamp: new Date().toISOString(),
    };

    // Manter apenas últimas 100 falhas
    const updatedEvents = [newEvent, ...currentEvents].slice(0, 100);

    await db.settings.put({
      key: "syncFailureEvents",
      value: JSON.stringify(updatedEvents),
      updatedAt: new Date().toISOString(),
    });
  });
}

/**
 * Marca uma falha como resolvida.
 */
export async function resolveSyncFailure(
  mutationId: number,
  resolution: "success" | "discarded" | "manual-retry",
): Promise<void> {
  await db.transaction("rw", db.pendingMutations, db.settings, async () => {
    const events = await db.settings.get({ key: "syncFailureEvents" });
    if (!events) return;

    const currentEvents: SyncFailureEvent[] = JSON.parse(events.value);
    const eventIndex = currentEvents.findIndex((e) => e.mutationId === mutationId && !e.resolvedAt);

    if (eventIndex !== -1) {
      currentEvents[eventIndex] = {
        ...currentEvents[eventIndex],
        resolvedAt: new Date().toISOString(),
        resolution,
      };

      await db.settings.put({
        key: "syncFailureEvents",
        value: JSON.stringify(currentEvents),
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Obtém estatísticas de falhas de sync.
 */
export async function getSyncFailureStats(): Promise<{
  totalFailures: number;
  resolvedFailures: number;
  pendingFailures: number;
  failuresByEntityType: Record<string, number>;
  failuresByMutationType: Record<string, number>;
}> {
  const events = await db.settings.get({ key: "syncFailureEvents" });
  if (!events) {
    return {
      totalFailures: 0,
      resolvedFailures: 0,
      pendingFailures: 0,
      failuresByEntityType: {},
      failuresByMutationType: {},
    };
  }

  const currentEvents: SyncFailureEvent[] = JSON.parse(events.value);

  const stats = {
    totalFailures: currentEvents.length,
    resolvedFailures: currentEvents.filter((e) => e.resolvedAt).length,
    pendingFailures: currentEvents.filter((e) => !e.resolvedAt).length,
    failuresByEntityType: {} as Record<string, number>,
    failuresByMutationType: {} as Record<string, number>,
  };

  currentEvents.forEach((event) => {
    stats.failuresByEntityType[event.entityType] = (stats.failuresByEntityType[event.entityType] || 0) + 1;
    stats.failuresByMutationType[event.mutationType] = (stats.failuresByMutationType[event.mutationType] || 0) + 1;
  });

  return stats;
}

/**
 * Remove eventos de falha antigos.
 */
export async function purgeOldSyncFailureEvents(olderThanDays: number = 30): Promise<number> {
  const events = await db.settings.get({ key: "syncFailureEvents" });
  if (!events) return 0;

  const currentEvents: SyncFailureEvent[] = JSON.parse(events.value);
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  const filteredEvents = currentEvents.filter((event) => new Date(event.timestamp).getTime() > cutoff);

  if (filteredEvents.length === currentEvents.length) return 0;

  await db.settings.put({
    key: "syncFailureEvents",
    value: JSON.stringify(filteredEvents),
    updatedAt: new Date().toISOString(),
  });

  return currentEvents.length - filteredEvents.length;
}
