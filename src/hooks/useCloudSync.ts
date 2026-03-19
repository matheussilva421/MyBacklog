import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { BackupPayload } from "../backlog/shared";
import { db } from "../core/db";
import { pullFromCloud, pushToCloud } from "../lib/sync";

type SyncTables = Omit<BackupPayload, "version" | "exportedAt" | "source">;

export type InitialSyncDecision = "idle" | "pull-cloud" | "push-local" | "match" | "conflict";

export function stripBackupMeta(payload: BackupPayload): SyncTables {
  return {
    games: payload.games,
    libraryEntries: payload.libraryEntries,
    playSessions: payload.playSessions,
    reviews: payload.reviews,
    lists: payload.lists,
    libraryEntryLists: payload.libraryEntryLists,
    tags: payload.tags,
    gameTags: payload.gameTags,
    goals: payload.goals,
    settings: payload.settings,
  };
}

function sortRows<T>(rows: T[]): T[] {
  return [...rows].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

export function buildSyncFingerprint(tables: SyncTables): string {
  return JSON.stringify({
    games: sortRows(tables.games),
    libraryEntries: sortRows(tables.libraryEntries),
    playSessions: sortRows(tables.playSessions),
    reviews: sortRows(tables.reviews),
    lists: sortRows(tables.lists),
    libraryEntryLists: sortRows(tables.libraryEntryLists),
    tags: sortRows(tables.tags),
    gameTags: sortRows(tables.gameTags),
    goals: sortRows(tables.goals),
    settings: sortRows(tables.settings),
  });
}

function hasLocalData(tables: SyncTables) {
  return (
    tables.games.length > 0 ||
    tables.libraryEntries.length > 0 ||
    tables.playSessions.length > 0 ||
    tables.reviews.length > 0 ||
    tables.lists.length > 0 ||
    tables.libraryEntryLists.length > 0 ||
    tables.tags.length > 0 ||
    tables.gameTags.length > 0 ||
    tables.goals.length > 0 ||
    tables.settings.length > 0
  );
}

export function resolveInitialSyncDecision(
  localTables: SyncTables,
  cloudData: BackupPayload | null,
): {
  decision: InitialSyncDecision;
  localFingerprint: string;
  cloudFingerprint: string | null;
} {
  const localFingerprint = buildSyncFingerprint(localTables);
  const cloudTables = cloudData ? stripBackupMeta(cloudData) : null;
  const cloudFingerprint = cloudTables ? buildSyncFingerprint(cloudTables) : null;
  const localHasAnyData = hasLocalData(localTables);
  const cloudHasAnyData = cloudTables ? hasLocalData(cloudTables) : false;

  if (!localHasAnyData && !cloudHasAnyData) {
    return { decision: "idle", localFingerprint, cloudFingerprint };
  }

  if (!cloudHasAnyData && localHasAnyData) {
    return { decision: "push-local", localFingerprint, cloudFingerprint };
  }

  if (cloudHasAnyData && !localHasAnyData) {
    return { decision: "pull-cloud", localFingerprint, cloudFingerprint };
  }

  if (cloudFingerprint === localFingerprint) {
    return { decision: "match", localFingerprint, cloudFingerprint };
  }

  return { decision: "conflict", localFingerprint, cloudFingerprint };
}

function buildBackupPayload(tables: SyncTables): BackupPayload {
  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    source: "mybacklog",
    ...tables,
  };
}

export function useCloudSync(
  user: User | null,
  readBackupTables: () => Promise<SyncTables>,
  refreshData: () => Promise<void>,
  setNotice: (msg: string) => void,
) {
  const [isSyncing, setIsSyncing] = useState(false);
  const isPullingRef = useRef(false);
  const syncBlockedByConflictRef = useRef(false);
  const previousFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      isPullingRef.current = false;
      syncBlockedByConflictRef.current = false;
      previousFingerprintRef.current = null;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    (async () => {
      try {
        setIsSyncing(true);
        const [cloudData, localTables] = await Promise.all([pullFromCloud(user.uid), readBackupTables()]);
        const { decision, localFingerprint, cloudFingerprint } = resolveInitialSyncDecision(localTables, cloudData);

        if (!active) return;

        if (decision === "idle") {
          previousFingerprintRef.current = localFingerprint;
          return;
        }

        if (decision === "push-local") {
          await pushToCloud(user.uid, buildBackupPayload(localTables));
          previousFingerprintRef.current = localFingerprint;
          return;
        }

        if (decision === "match") {
          previousFingerprintRef.current = localFingerprint;
          return;
        }

        if (decision === "conflict") {
          syncBlockedByConflictRef.current = true;
          previousFingerprintRef.current = localFingerprint;
          setNotice(
            "Conflito detectado entre a base local e a nuvem. Os dados locais foram mantidos e a sincronizacao automatica foi pausada nesta sessao.",
          );
          return;
        }

        if (decision === "pull-cloud" && cloudData) {
          isPullingRef.current = true;

          await db.transaction(
            "rw",
            [
              db.games,
              db.libraryEntries,
              db.playSessions,
              db.reviews,
              db.lists,
              db.libraryEntryLists,
              db.tags,
              db.gameTags,
              db.goals,
              db.settings,
            ],
            async () => {
              await db.libraryEntryLists.clear();
              await db.gameTags.clear();
              await db.reviews.clear();
              await db.playSessions.clear();
              await db.goals.clear();
              await db.tags.clear();
              await db.lists.clear();
              await db.libraryEntries.clear();
              await db.games.clear();
              await db.settings.clear();

              if (cloudData.games.length > 0) await db.games.bulkPut(cloudData.games);
              if (cloudData.libraryEntries.length > 0) await db.libraryEntries.bulkPut(cloudData.libraryEntries);
              if (cloudData.playSessions.length > 0) await db.playSessions.bulkPut(cloudData.playSessions);
              if (cloudData.reviews.length > 0) await db.reviews.bulkPut(cloudData.reviews);
              if (cloudData.lists.length > 0) await db.lists.bulkPut(cloudData.lists);
              if (cloudData.libraryEntryLists.length > 0) {
                await db.libraryEntryLists.bulkPut(cloudData.libraryEntryLists);
              }
              if (cloudData.tags.length > 0) await db.tags.bulkPut(cloudData.tags);
              if (cloudData.gameTags.length > 0) await db.gameTags.bulkPut(cloudData.gameTags);
              if (cloudData.goals.length > 0) await db.goals.bulkPut(cloudData.goals);
              if (cloudData.settings.length > 0) await db.settings.bulkPut(cloudData.settings);
            },
          );

          await refreshData();
          previousFingerprintRef.current = cloudFingerprint;
          setNotice("Dados sincronizados da nuvem com sucesso.");
        }
      } catch (error) {
        console.error("Cloud sync bootstrap error:", error);
        if (active) {
          setNotice("Falha ao sincronizar com a nuvem.");
        }
      } finally {
        if (active) {
          setIsSyncing(false);
          window.setTimeout(() => {
            isPullingRef.current = false;
          }, 300);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const triggerSyncToCloud = useCallback(async () => {
    if (!user || isPullingRef.current || isSyncing || syncBlockedByConflictRef.current) {
      return;
    }

    try {
      setIsSyncing(true);
      const tables = await readBackupTables();
      const currentFingerprint = buildSyncFingerprint(tables);

      if (currentFingerprint === previousFingerprintRef.current) {
        return;
      }

      await pushToCloud(user.uid, buildBackupPayload(tables));
      previousFingerprintRef.current = currentFingerprint;
    } catch (error) {
      console.error("Cloud sync push error:", error);
      setNotice("Falha ao enviar backup para a nuvem.");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, readBackupTables, setNotice, user]);

  return {
    isSyncing,
    isSyncBlockedByConflict: syncBlockedByConflictRef.current,
    triggerSyncToCloud,
  };
}
