import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { BackupPayload } from "../backlog/shared";
import { db } from "../core/db";
import { pullFromCloud, pushToCloud } from "../lib/sync";
import { upsertSettingsRows } from "../modules/settings/utils/settingsStorage";
import {
  buildBackupPayload,
  buildSyncComparison,
  buildSyncFingerprint,
  mergeSyncTables,
  stripBackupMeta,
  type SyncComparison,
  type SyncTables,
} from "../modules/sync-center/utils/syncEngine";
import {
  normalizeSyncHistory,
  parseLastSuccessfulSyncAt,
  parseSyncHistory,
  syncSettingsKeys,
  type SyncHistoryEntry,
} from "../modules/sync-center/utils/syncStorage";

export {
  buildSyncFingerprint,
  resolveInitialSyncDecision,
  stripBackupMeta,
} from "../modules/sync-center/utils/syncEngine";

export type SyncMode =
  | "local-only"
  | "cloud-synced"
  | "conflict"
  | "offline"
  | "auth-required";

type UseCloudSyncArgs = {
  user: User | null;
  isAuthEnabled: boolean;
  autoSyncEnabled: boolean;
  readBackupTables: () => Promise<SyncTables>;
  refreshData: () => Promise<void>;
  setNotice: (msg: string) => void;
};

function createHistoryEntry(
  action: SyncHistoryEntry["action"],
  result: SyncHistoryEntry["result"],
  message: string,
): SyncHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    action,
    result,
    message,
  };
}

function isCloudPermissionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return code === "permission-denied" || message.includes("Missing or insufficient permissions");
}

async function replaceLocalTables(tables: SyncTables) {
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

      if (tables.games.length > 0) await db.games.bulkPut(tables.games);
      if (tables.libraryEntries.length > 0) await db.libraryEntries.bulkPut(tables.libraryEntries);
      if (tables.playSessions.length > 0) await db.playSessions.bulkPut(tables.playSessions);
      if (tables.reviews.length > 0) await db.reviews.bulkPut(tables.reviews);
      if (tables.lists.length > 0) await db.lists.bulkPut(tables.lists);
      if (tables.libraryEntryLists.length > 0) {
        await db.libraryEntryLists.bulkPut(tables.libraryEntryLists);
      }
      if (tables.tags.length > 0) await db.tags.bulkPut(tables.tags);
      if (tables.gameTags.length > 0) await db.gameTags.bulkPut(tables.gameTags);
      if (tables.goals.length > 0) await db.goals.bulkPut(tables.goals);
      if (tables.settings.length > 0) await db.settings.bulkPut(tables.settings);
    },
  );
}

export function useCloudSync({
  user,
  isAuthEnabled,
  autoSyncEnabled,
  readBackupTables,
  refreshData,
  setNotice,
}: UseCloudSyncArgs) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [comparison, setComparison] = useState<SyncComparison | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string | null>(null);
  const [isWorkingLocal, setIsWorkingLocal] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  const historyRef = useRef<SyncHistoryEntry[]>([]);
  const previousFingerprintRef = useRef<string | null>(null);
  const cloudSnapshotRef = useRef<BackupPayload | null>(null);

  useEffect(() => {
    historyRef.current = syncHistory;
  }, [syncHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const persistSyncMeta = useCallback(
    async (nextHistory: SyncHistoryEntry[], nextLastSuccessfulSyncAt: string | null) => {
      await db.transaction("rw", db.settings, async () => {
        await upsertSettingsRows([
          {
            key: syncSettingsKeys.syncHistory,
            value: JSON.stringify(normalizeSyncHistory(nextHistory)),
          },
          {
            key: syncSettingsKeys.lastSuccessfulSyncAt,
            value: nextLastSuccessfulSyncAt ?? "",
          },
        ]);
      });
    },
    [],
  );

  const pushHistory = useCallback(
    async (
      action: SyncHistoryEntry["action"],
      result: SyncHistoryEntry["result"],
      message: string,
      nextLastSuccessfulSyncAt = lastSuccessfulSyncAt,
    ) => {
      const nextHistory = normalizeSyncHistory([
        createHistoryEntry(action, result, message),
        ...historyRef.current,
      ]);
      historyRef.current = nextHistory;
      setSyncHistory(nextHistory);
      if (nextLastSuccessfulSyncAt !== lastSuccessfulSyncAt) {
        setLastSuccessfulSyncAt(nextLastSuccessfulSyncAt);
      }
      await persistSyncMeta(nextHistory, nextLastSuccessfulSyncAt);
    },
    [lastSuccessfulSyncAt, persistSyncMeta],
  );

  const hydrateLocalSyncState = useCallback((localTables: SyncTables) => {
    const nextHistory = parseSyncHistory(localTables.settings);
    const nextLastSuccessfulSyncAt = parseLastSuccessfulSyncAt(localTables.settings);
    historyRef.current = nextHistory;
    setSyncHistory(nextHistory);
    setLastSuccessfulSyncAt(nextLastSuccessfulSyncAt);
    previousFingerprintRef.current = buildSyncFingerprint(localTables);
  }, []);

  const applySnapshotLocally = useCallback(
    async (tables: SyncTables, nextLastSyncAt: string | null) => {
      await replaceLocalTables(tables);
      await persistSyncMeta(historyRef.current, nextLastSyncAt);
      await refreshData();
      previousFingerprintRef.current = buildSyncFingerprint(tables);
    },
    [persistSyncMeta, refreshData],
  );

  const finalizeMatchState = useCallback((localTables: SyncTables, cloudData: BackupPayload | null) => {
    const nextComparison = buildSyncComparison(localTables, cloudData);
    setComparison(nextComparison);
    cloudSnapshotRef.current = cloudData;
    previousFingerprintRef.current = nextComparison.localFingerprint;
    setIsWorkingLocal(false);
    return nextComparison;
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const localTables = await readBackupTables();
      if (!active) return;

      hydrateLocalSyncState(localTables);

      if (!isAuthEnabled) {
        setComparison(null);
        setIsWorkingLocal(false);
        cloudSnapshotRef.current = null;
        return;
      }

      if (!user || !isOnline) {
        setComparison(null);
        return;
      }

      try {
        setIsSyncing(true);
        const cloudData = await pullFromCloud(user.uid);
        if (!active) return;

        const nextComparison = buildSyncComparison(localTables, cloudData);
        setComparison(nextComparison);
        cloudSnapshotRef.current = cloudData;

        if (nextComparison.decision === "idle" || nextComparison.decision === "match") {
          previousFingerprintRef.current = nextComparison.localFingerprint;
          setIsWorkingLocal(false);
          return;
        }

        if (
          (nextComparison.decision === "push-local" || nextComparison.decision === "pull-cloud") &&
          !autoSyncEnabled
        ) {
          setIsWorkingLocal(true);
          return;
        }

        if (nextComparison.decision === "push-local") {
          const payload = buildBackupPayload(localTables);
          await pushToCloud(user.uid, payload);
          if (!active) return;
          const successAt = payload.exportedAt;
          cloudSnapshotRef.current = payload;
          setLastSuccessfulSyncAt(successAt);
          finalizeMatchState(localTables, payload);
          await pushHistory(
            "auto-push",
            "success",
            "Backup local enviado automaticamente para a nuvem.",
            successAt,
          );
          return;
        }

        if (nextComparison.decision === "pull-cloud" && cloudData) {
          const cloudTables = stripBackupMeta(cloudData);
          await applySnapshotLocally(cloudTables, cloudData.exportedAt);
          if (!active) return;
          setLastSuccessfulSyncAt(cloudData.exportedAt);
          finalizeMatchState(cloudTables, cloudData);
          await pushHistory(
            "auto-pull",
            "success",
            "Snapshot remoto aplicado automaticamente na base local.",
            cloudData.exportedAt,
          );
          return;
        }

        setIsWorkingLocal(false);
        await pushHistory(
          "conflict",
          "conflict",
          "Conflito detectado entre a base local e a nuvem. A sincronização automática foi pausada.",
        );
        setNotice(
          "Conflito detectado entre a base local e a nuvem. Revise a Central de Sync para decidir como continuar.",
        );
      } catch (error) {
        if (isCloudPermissionError(error)) {
          if (!active) return;
          setIsWorkingLocal(true);
          await pushHistory(
            "error",
            "skipped",
            "A nuvem está indisponível para esta conta. O app continuará operando em modo local.",
          );
          setNotice("Sincronização em nuvem indisponível para esta conta. O app continuará em modo local.");
          return;
        }
        console.error("Cloud sync bootstrap error:", error);
        if (!active) return;
        await pushHistory("error", "error", "Falha ao inicializar a sincronização com a nuvem.");
        setNotice("Falha ao sincronizar com a nuvem.");
      } finally {
        if (active) {
          setIsSyncing(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    applySnapshotLocally,
    autoSyncEnabled,
    finalizeMatchState,
    hydrateLocalSyncState,
    isAuthEnabled,
    isOnline,
    pushHistory,
    readBackupTables,
    setNotice,
    user,
  ]);

  const syncMode = useMemo<SyncMode>(() => {
    if (!isAuthEnabled) return "local-only";
    if (!user) return "auth-required";
    if (!isOnline) return "offline";
    if (isWorkingLocal) return "local-only";
    if (comparison?.decision === "conflict") return "conflict";
    return "cloud-synced";
  }, [comparison?.decision, isAuthEnabled, isOnline, isWorkingLocal, user]);

  const runPushFlow = useCallback(
    async (action: "auto-push" | "manual-push") => {
      if (!user || !isAuthEnabled || !isOnline) return;

      setIsSyncing(true);
      try {
        const [localTables, cloudData] = await Promise.all([readBackupTables(), pullFromCloud(user.uid)]);
        const nextComparison = buildSyncComparison(localTables, cloudData);
        setComparison(nextComparison);
        cloudSnapshotRef.current = cloudData;

        if (nextComparison.decision === "conflict") {
          setIsWorkingLocal(false);
          await pushHistory(
            "conflict",
            "conflict",
            "Conflito detectado antes do envio. Nenhum dado foi sobrescrito.",
          );
          setNotice("Conflito detectado antes do envio. Abra a Central de Sync para decidir.");
          return;
        }

        if (
          action === "auto-push" &&
          nextComparison.localFingerprint === previousFingerprintRef.current &&
          nextComparison.decision === "match"
        ) {
          return;
        }

        const payload = buildBackupPayload(localTables);
        await pushToCloud(user.uid, payload);

        const successAt = payload.exportedAt;
        setLastSuccessfulSyncAt(successAt);
        finalizeMatchState(localTables, payload);
        await pushHistory(
          action,
          "success",
          action === "auto-push"
            ? "Alterações locais enviadas automaticamente para a nuvem."
            : "Snapshot local enviado manualmente para a nuvem.",
          successAt,
        );
      } catch (error) {
        if (isCloudPermissionError(error)) {
          await pushHistory(action, "skipped", "A conta não tem permissão para gravar na nuvem. Mantendo modo local.");
          setNotice("Sua conta não tem permissão para gravar na nuvem. O app segue em modo local.");
          setIsWorkingLocal(true);
          return;
        }
        console.error("Cloud sync push error:", error);
        await pushHistory(action, "error", "Falha ao enviar o snapshot local para a nuvem.");
        setNotice("Falha ao enviar backup para a nuvem.");
      } finally {
        setIsSyncing(false);
      }
    },
    [
      finalizeMatchState,
      isAuthEnabled,
      isOnline,
      pushHistory,
      readBackupTables,
      setNotice,
      user,
    ],
  );

  const pullCloudToLocal = useCallback(async () => {
    if (!user || !isAuthEnabled) return;
    if (!isOnline) {
      setNotice("Você está offline. Reconecte para puxar o snapshot remoto.");
      return;
    }

    setIsSyncing(true);
    try {
      const cloudData = await pullFromCloud(user.uid);
      if (!cloudData) {
        await pushHistory("manual-pull", "skipped", "Nenhum snapshot remoto encontrado para puxar.");
        setNotice("Nenhum snapshot remoto encontrado.");
        return;
      }

      const cloudTables = stripBackupMeta(cloudData);
      await applySnapshotLocally(cloudTables, cloudData.exportedAt);
      setLastSuccessfulSyncAt(cloudData.exportedAt);
      finalizeMatchState(cloudTables, cloudData);
      await pushHistory(
        "manual-pull",
        "success",
        "Snapshot remoto aplicado manualmente na base local.",
        cloudData.exportedAt,
      );
      setNotice("Snapshot remoto aplicado na base local.");
    } catch (error) {
      if (isCloudPermissionError(error)) {
        await pushHistory("manual-pull", "skipped", "A conta não tem permissão para ler o snapshot remoto.");
        setNotice("Sua conta não tem permissão para ler a nuvem.");
        setIsWorkingLocal(true);
        return;
      }
      console.error("Cloud sync pull error:", error);
      await pushHistory("manual-pull", "error", "Falha ao puxar o snapshot remoto.");
      setNotice("Falha ao puxar a nuvem.");
    } finally {
      setIsSyncing(false);
    }
  }, [
    applySnapshotLocally,
    finalizeMatchState,
    isAuthEnabled,
    isOnline,
    pushHistory,
    setNotice,
    user,
  ]);

  const mergeLocalAndCloud = useCallback(async () => {
    if (!user || !isAuthEnabled) return;
    if (!isOnline) {
      setNotice("Você está offline. Reconecte para mesclar snapshots.");
      return;
    }

    setIsSyncing(true);
    try {
      const [localTables, cloudData] = await Promise.all([readBackupTables(), pullFromCloud(user.uid)]);
      if (!cloudData) {
        await runPushFlow("manual-push");
        return;
      }

      const mergedTables = mergeSyncTables(localTables, stripBackupMeta(cloudData));
      const mergedPayload = buildBackupPayload(mergedTables);

      await pushToCloud(user.uid, mergedPayload);
      await applySnapshotLocally(mergedTables, mergedPayload.exportedAt);
      setLastSuccessfulSyncAt(mergedPayload.exportedAt);
      setIsWorkingLocal(false);
      finalizeMatchState(mergedTables, mergedPayload);
      await pushHistory(
        "manual-merge",
        "success",
        "Snapshots local e remoto foram mesclados com preservação de histórico.",
        mergedPayload.exportedAt,
      );
      setNotice("Merge concluído entre base local e nuvem.");
    } catch (error) {
      if (isCloudPermissionError(error)) {
        await pushHistory("manual-merge", "skipped", "A conta não tem permissão para mesclar com a nuvem.");
        setNotice("Sua conta não tem permissão para mesclar com a nuvem.");
        setIsWorkingLocal(true);
        return;
      }
      console.error("Cloud sync merge error:", error);
      await pushHistory("manual-merge", "error", "Falha ao mesclar snapshots local e remoto.");
      setNotice("Falha ao mesclar os dados de sync.");
    } finally {
      setIsSyncing(false);
    }
  }, [
    applySnapshotLocally,
    finalizeMatchState,
    isAuthEnabled,
    isOnline,
    pushHistory,
    readBackupTables,
    runPushFlow,
    setNotice,
    user,
  ]);

  const workLocal = useCallback(async () => {
    setIsWorkingLocal(true);
    await pushHistory(
      "manual-local",
      "skipped",
      "Modo local ativado. A sincronização automática ficou pausada até nova ação manual.",
    );
    setNotice("Modo local ativado. A sincronização automática ficará pausada até nova decisão.");
  }, [pushHistory, setNotice]);

  const triggerSyncToCloud = useCallback(async () => {
    if (!autoSyncEnabled || isWorkingLocal || comparison?.decision === "conflict") {
      return;
    }
    await runPushFlow("auto-push");
  }, [autoSyncEnabled, comparison?.decision, isWorkingLocal, runPushFlow]);

  const pushLocalToCloud = useCallback(async () => {
    setIsWorkingLocal(false);
    await runPushFlow("manual-push");
  }, [runPushFlow]);

  return {
    isSyncing,
    isSyncBlockedByConflict: comparison?.decision === "conflict",
    isOnline,
    syncMode,
    autoSyncEnabled,
    comparison,
    cloudExportedAt: comparison?.cloudExportedAt ?? cloudSnapshotRef.current?.exportedAt ?? null,
    lastSuccessfulSyncAt,
    syncHistory,
    triggerSyncToCloud,
    pushLocalToCloud,
    pullCloudToLocal,
    mergeLocalAndCloud,
    workLocal,
  };
}
