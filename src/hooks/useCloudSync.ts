import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { BackupPayload } from "../backlog/shared";
import { db } from "../core/db";
import { clearCloudBackup, pullFromCloud, pushToCloud } from "../lib/sync";
import { acquireSyncLockWrapper, releaseSyncLockWrapper } from "../lib/tabSyncLockWrapper";
import { debounce } from "../lib/debounce";
import { syncPendingMutations } from "../lib/syncEngine";
import { upsertSettingsRows } from "../modules/settings/utils/settingsStorage";
import {
  buildBackupPayload,
  buildSyncComparison,
  buildSyncFingerprint,
  createEmptySyncTables,
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
import { clearBacklogDataForFreshStart } from "../services/backlogRepository";
import { logger } from "../lib/logger";

export {
  buildSyncFingerprint,
  resolveInitialSyncDecision,
  stripBackupMeta,
} from "../modules/sync-center/utils/syncEngine";

export type SyncMode = "local-only" | "cloud-synced" | "conflict" | "offline" | "auth-required";

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

function getErrorTextField(error: unknown, field: "code" | "message") {
  if (!error || typeof error !== "object") return "";
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

function isCloudPermissionError(error: unknown) {
  const code = getErrorTextField(error, "code");
  const message = getErrorTextField(error, "message");
  return code === "permission-denied" || message.includes("Missing or insufficient permissions");
}

export function shouldBlockPushBecauseOfConflict(
  action: "auto-push" | "manual-push",
  decision: SyncComparison["decision"],
) {
  return decision === "conflict" && action !== "manual-push";
}

function logSyncError(message: string, error: unknown) {
  logger.error(message, error);
}

async function replaceLocalTables(tables: SyncTables) {
  await db.transaction(
    "rw",
    [
      db.pendingMutations,
      db.games,
      db.libraryEntries,
      db.stores,
      db.libraryEntryStores,
      db.platforms,
      db.gamePlatforms,
      db.playSessions,
      db.reviews,
      db.lists,
      db.libraryEntryLists,
      db.tags,
      db.gameTags,
      db.goals,
      db.settings,
      db.savedViews,
    ],
    async () => {
      // Limpar todas as tabelas na ordem correta para evitar conflitos
      await db.savedViews.clear();
      await db.gamePlatforms.clear();
      await db.platforms.clear();
      await db.libraryEntryStores.clear();
      await db.stores.clear();
      await db.libraryEntryLists.clear();
      await db.gameTags.clear();
      await db.reviews.clear();
      await db.playSessions.clear();
      await db.goals.clear();
      await db.tags.clear();
      await db.lists.clear();
      await db.libraryEntries.clear();
      await db.games.clear();
      // Settings devem ser limpas ANTES de inserir novos dados para evitar conflito
      await db.settings.clear();

      // Inserir novos dados em ordem que respeite foreign keys
      if (tables.games.length > 0) await db.games.bulkPut(tables.games);
      if (tables.libraryEntries.length > 0) await db.libraryEntries.bulkPut(tables.libraryEntries);
      if (tables.stores.length > 0) await db.stores.bulkPut(tables.stores);
      if (tables.libraryEntryStores.length > 0) {
        await db.libraryEntryStores.bulkPut(tables.libraryEntryStores);
      }
      if (tables.platforms.length > 0) await db.platforms.bulkPut(tables.platforms);
      if (tables.gamePlatforms.length > 0) await db.gamePlatforms.bulkPut(tables.gamePlatforms);
      if (tables.playSessions.length > 0) await db.playSessions.bulkPut(tables.playSessions);
      if (tables.reviews.length > 0) await db.reviews.bulkPut(tables.reviews);
      if (tables.lists.length > 0) await db.lists.bulkPut(tables.lists);
      if (tables.libraryEntryLists.length > 0) {
        await db.libraryEntryLists.bulkPut(tables.libraryEntryLists);
      }
      if (tables.tags.length > 0) await db.tags.bulkPut(tables.tags);
      if (tables.gameTags.length > 0) await db.gameTags.bulkPut(tables.gameTags);
      if (tables.goals.length > 0) await db.goals.bulkPut(tables.goals);
      // Settings são inseridas por último
      if (tables.settings.length > 0) await db.settings.bulkPut(tables.settings);
      if (tables.savedViews.length > 0) await db.savedViews.bulkPut(tables.savedViews);
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
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const historyRef = useRef<SyncHistoryEntry[]>([]);
  const lastSuccessfulSyncAtRef = useRef<string | null>(null);
  const previousFingerprintRef = useRef<string | null>(null);
  const cloudSnapshotRef = useRef<BackupPayload | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emptySyncTables = useMemo(() => createEmptySyncTables(), []);

  useEffect(() => {
    historyRef.current = syncHistory;
  }, [syncHistory]);

  useEffect(() => {
    lastSuccessfulSyncAtRef.current = lastSuccessfulSyncAt;
  }, [lastSuccessfulSyncAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      // Agendar reconnect polling quando voltar a ficar online
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Tentar sync em 5 segundos
      reconnectTimeoutRef.current = setTimeout(() => {
        if (user && isAuthEnabled && autoSyncEnabled) {
          // Disparar um re-check do sync
          window.dispatchEvent(new CustomEvent("mybacklog:sync-request"));
        }
      }, 5000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      // Limpar timeout pendente se ficar offline
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [autoSyncEnabled, isAuthEnabled, user]);

  const persistSyncMeta = useCallback(
    async (nextHistory: SyncHistoryEntry[], nextLastSuccessfulSyncAt: string | null) => {
      // Usar refs diretamente dentro do callback para evitar dependências desatualizadas
      const historyToPersist = nextHistory.length > 0 ? nextHistory : historyRef.current;
      const lastSyncAtToPersist =
        nextLastSuccessfulSyncAt !== null ? nextLastSuccessfulSyncAt : lastSuccessfulSyncAtRef.current;

      await db.transaction("rw", db.settings, db.pendingMutations, async () => {
        await upsertSettingsRows([
          {
            key: syncSettingsKeys.syncHistory,
            value: JSON.stringify(normalizeSyncHistory(historyToPersist)),
          },
          {
            key: syncSettingsKeys.lastSuccessfulSyncAt,
            value: lastSyncAtToPersist ?? "",
          },
        ]);
      });
    },
    [], // Intencionalmente vazio - usa refs para acessar valores mais recentes
  );

  const commitLastSuccessfulSyncAt = useCallback((value: string | null) => {
    lastSuccessfulSyncAtRef.current = value;
    setLastSuccessfulSyncAt(value);
  }, []);

  const pushHistory = useCallback(
    async (
      action: SyncHistoryEntry["action"],
      result: SyncHistoryEntry["result"],
      message: string,
      nextLastSuccessfulSyncAt = lastSuccessfulSyncAtRef.current,
    ) => {
      const nextHistory = normalizeSyncHistory([createHistoryEntry(action, result, message), ...historyRef.current]);
      historyRef.current = nextHistory;
      setSyncHistory(nextHistory);
      if (nextLastSuccessfulSyncAt !== lastSuccessfulSyncAtRef.current) {
        commitLastSuccessfulSyncAt(nextLastSuccessfulSyncAt);
      }
      await persistSyncMeta(nextHistory, nextLastSuccessfulSyncAt);
    },
    [commitLastSuccessfulSyncAt, persistSyncMeta],
  );

  const hydrateLocalSyncState = useCallback(
    (localTables: SyncTables) => {
      const nextHistory = parseSyncHistory(localTables.settings);
      const nextLastSuccessfulSyncAt = parseLastSuccessfulSyncAt(localTables.settings);
      historyRef.current = nextHistory;
      setSyncHistory(nextHistory);
      commitLastSuccessfulSyncAt(nextLastSuccessfulSyncAt);
      previousFingerprintRef.current = buildSyncFingerprint(localTables);
    },
    [commitLastSuccessfulSyncAt],
  );

  const applySnapshotLocally = useCallback(
    async (tables: SyncTables, nextLastSyncAt: string | null) => {
      await replaceLocalTables(tables);
      await persistSyncMeta(historyRef.current, nextLastSyncAt);
      await refreshData();
      previousFingerprintRef.current = buildSyncFingerprint(tables);
    },
    [persistSyncMeta, refreshData],
  );

  const acquireSyncLock = useCallback(async () => {
    return await acquireSyncLockWrapper();
  }, []);

  const releaseSyncLock = useCallback((token: symbol | null) => {
    releaseSyncLockWrapper(token);
  }, []);

  const finalizeMatchState = useCallback(
    (localTables: SyncTables, cloudData: BackupPayload | null, mergedAt?: string | null) => {
      const nextComparison = buildSyncComparison(localTables, cloudData, mergedAt);
      setComparison(nextComparison);
      cloudSnapshotRef.current = cloudData;
      previousFingerprintRef.current = nextComparison.localFingerprint;
      setIsWorkingLocal(false);
      return nextComparison;
    },
    [],
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
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

        const syncToken = await acquireSyncLock();
        if (!syncToken) return;

        try {
          // Already inside try block, sync operation continues
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
            commitLastSuccessfulSyncAt(successAt);
            finalizeMatchState(localTables, payload);
            await pushHistory("auto-push", "success", "Backup local enviado automaticamente para a nuvem.", successAt);
            return;
          }

          if (nextComparison.decision === "pull-cloud" && cloudData) {
            const cloudTables = stripBackupMeta(cloudData);
            await applySnapshotLocally(cloudTables, cloudData.exportedAt);
            if (!active) return;
            commitLastSuccessfulSyncAt(cloudData.exportedAt);
            finalizeMatchState(cloudTables, cloudData);
            await pushHistory(
              "auto-pull",
              "success",
              "Snapshot remoto aplicado automaticamente na base local.",
              cloudData.exportedAt,
            );
            return;
          }

          if (nextComparison.decision === "auto-merge") {
            // Auto-merge: reconciliar dados automaticamente
            if (!cloudData) {
              // Não deveria acontecer, mas tratar como conflito se cloudData for null
              setIsWorkingLocal(false);
              await pushHistory("conflict", "conflict", "Conflito detectado: dados da nuvem inesperadamente ausentes.");
              return;
            }

            const cloudTables = stripBackupMeta(cloudData);
            const mergedTables = mergeSyncTables(localTables, cloudTables);
            const mergedPayload = buildBackupPayload(mergedTables);

            await pushToCloud(user.uid, mergedPayload);
            if (!active) return;

            await applySnapshotLocally(mergedTables, mergedPayload.exportedAt);
            commitLastSuccessfulSyncAt(mergedPayload.exportedAt);
            finalizeMatchState(mergedTables, mergedPayload, mergedPayload.exportedAt);

            // Contar registros mesclados para log
            const mergedSessionCount = mergedTables.playSessions.length;
            const mergedGameCount = mergedTables.games.length;

            await pushHistory(
              "auto-pull",
              "success",
              `Auto-merge: ${mergedGameCount} jogos e ${mergedSessionCount} sessões reconciliados automaticamente.`,
              mergedPayload.exportedAt,
            );
            return;
          }

          setIsWorkingLocal(false);
          await pushHistory(
            "conflict",
            "conflict",
            "Conflito detectado entre base local e nuvem. Revise as diferenças antes de manter local, puxar nuvem, mesclar ou seguir só local.",
          );
          setNotice(
            "Conflito detectado entre base local e nuvem. Abra a Central de Sync e escolha conscientemente como resolver.",
          );
        } finally {
          setIsSyncing(false);
          releaseSyncLock(syncToken);
        }
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
        logSyncError("Cloud sync bootstrap error:", error);
        if (!active) return;
        await pushHistory("error", "error", "Falha ao inicializar a sincronização com a nuvem.");
        setNotice("Falha ao sincronizar com a nuvem.");
      }
    })();

    return () => {
      active = false;
    };
  }, [
    acquireSyncLock,
    applySnapshotLocally,
    autoSyncEnabled,
    commitLastSuccessfulSyncAt,
    finalizeMatchState,
    hydrateLocalSyncState,
    isAuthEnabled,
    isOnline,
    pushHistory,
    readBackupTables,
    releaseSyncLock,
    setNotice,
    user,
  ]);

  // Listener para eventos de sync-request (disparado quando volta a ficar online)
  useEffect(() => {
    const handleSyncRequest = () => {
      // Se está online, tem usuário e auto-sync está ativo, tentar sync
      if (isOnline && user && isAuthEnabled && autoSyncEnabled && !isSyncing) {
        // Disparar um novo bootstrap do sync
        void (async () => {
          const syncToken = await acquireSyncLock();
          if (!syncToken) return;

          try {
            setIsSyncing(true);

            const localTables = await readBackupTables();
            const cloudData = await pullFromCloud(user.uid);

            if (cloudData) {
              const nextComparison = buildSyncComparison(localTables, cloudData);

              if (nextComparison.decision === "match" || nextComparison.decision === "auto-merge") {
                // Sync bem-sucedido, atualizar estado
                finalizeMatchState(localTables, cloudData);
                setNotice("Sincronização restabelecida após reconnect.");
              } else if (nextComparison.decision === "conflict") {
                setNotice("Conflito detectado após reconnect. Revise a Central de Sync.");
              }
            }
          } catch (error) {
            logSyncError("Reconnect sync error:", error);
          } finally {
            setIsSyncing(false);
            releaseSyncLock(syncToken);
          }
        })();
      }
    };

    window.addEventListener("mybacklog:sync-request", handleSyncRequest);

    return () => {
      window.removeEventListener("mybacklog:sync-request", handleSyncRequest);
    };
  }, [
    acquireSyncLock,
    autoSyncEnabled,
    finalizeMatchState,
    isAuthEnabled,
    isOnline,
    isSyncing,
    readBackupTables,
    releaseSyncLock,
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
    async (
      action: "auto-push" | "manual-push",
      options: {
        lockToken?: symbol;
        cloudData?: BackupPayload | null;
        localTables?: SyncTables;
      } = {},
    ) => {
      if (!user || !isAuthEnabled || !isOnline) return;
      const syncToken = options.lockToken ?? (await acquireSyncLock());
      if (!syncToken) return;

      try {
        setIsSyncing(true);
        const [localTables, cloudData] = await Promise.all([
          options.localTables ? Promise.resolve(options.localTables) : readBackupTables(),
          options.cloudData !== undefined ? Promise.resolve(options.cloudData) : pullFromCloud(user.uid),
        ]);
        const nextComparison = buildSyncComparison(localTables, cloudData);
        setComparison(nextComparison);
        cloudSnapshotRef.current = cloudData;

        if (shouldBlockPushBecauseOfConflict(action, nextComparison.decision)) {
          setIsWorkingLocal(false);
          await pushHistory(
            "conflict",
            "conflict",
            "Conflito detectado antes do envio. Nenhum snapshot foi sobrescrito sem confirmação manual.",
          );
          setNotice("Conflito detectado antes do envio. Revise as diferenças na Central de Sync.");
          return;
        }

        if (nextComparison.decision === "idle") {
          previousFingerprintRef.current = nextComparison.localFingerprint;
          setIsWorkingLocal(false);
          if (action === "manual-push") {
            await pushHistory(action, "skipped", "Nada para enviar. A base local e a nuvem já estão vazias.");
            setNotice("Nada para enviar. Local e nuvem já estão vazios.");
          }
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
        commitLastSuccessfulSyncAt(successAt);
        finalizeMatchState(localTables, payload);
        await pushHistory(
          action,
          "success",
          action === "auto-push"
            ? "Alterações locais enviadas automaticamente para a nuvem."
            : "Base local confirmada como origem e enviada manualmente para a nuvem.",
          successAt,
        );
      } catch (error) {
        if (isCloudPermissionError(error)) {
          await pushHistory(action, "skipped", "A conta não tem permissão para gravar na nuvem. Mantendo modo local.");
          setNotice("Sua conta não tem permissão para gravar na nuvem. O app segue em modo local.");
          setIsWorkingLocal(true);
          return;
        }
        logSyncError("Cloud sync push error:", error);
        await pushHistory(action, "error", "Falha ao enviar o snapshot local para a nuvem.");
        setNotice("Falha ao enviar backup para a nuvem.");
      } finally {
        if (!options.lockToken) {
          setIsSyncing(false);
          releaseSyncLock(syncToken);
        }
      }
    },
    [
      acquireSyncLock,
      commitLastSuccessfulSyncAt,
      finalizeMatchState,
      isAuthEnabled,
      isOnline,
      pushHistory,
      readBackupTables,
      releaseSyncLock,
      setNotice,
      user,
    ],
  );

  const resetLocalAndCloud = useCallback(async () => {
    if (isAuthEnabled && !user) {
      setNotice("Faça login antes de apagar também o snapshot remoto.");
      return;
    }

    if (isAuthEnabled && !isOnline) {
      setNotice("Você está offline. Reconecte para apagar local e nuvem ao mesmo tempo.");
      return;
    }

    const syncToken = await acquireSyncLock();
    if (!syncToken) return;

    let cloudCleared = false;

    try {
      setIsSyncing(true);
      if (isAuthEnabled && user) {
        await clearCloudBackup(user.uid);
        cloudCleared = true;
      }

      await clearBacklogDataForFreshStart();
      await refreshData();

      historyRef.current = [];
      setSyncHistory([]);
      commitLastSuccessfulSyncAt(null);
      setComparison(buildSyncComparison(emptySyncTables, null));
      previousFingerprintRef.current = buildSyncFingerprint(emptySyncTables);
      cloudSnapshotRef.current = null;
      setIsWorkingLocal(false);

      setNotice(
        isAuthEnabled
          ? "Base local e snapshot remoto foram apagados. O app voltou ao estado inicial."
          : "Base local apagada. Como a nuvem não está configurada, o reset foi aplicado só neste dispositivo.",
      );
    } catch (error) {
      logSyncError("Cloud sync reset error:", error);
      setNotice(
        cloudCleared
          ? "O snapshot remoto foi apagado, mas a limpeza local falhou. Tente novamente antes de continuar."
          : "Falha ao apagar local e nuvem. Nenhum reset completo foi concluído.",
      );
    } finally {
      setIsSyncing(false);
      releaseSyncLock(syncToken);
    }
  }, [
    acquireSyncLock,
    commitLastSuccessfulSyncAt,
    emptySyncTables,
    isAuthEnabled,
    isOnline,
    refreshData,
    releaseSyncLock,
    setNotice,
    user,
  ]);

  const pullCloudToLocal = useCallback(async () => {
    if (!user || !isAuthEnabled) return;
    if (!isOnline) {
      setNotice("Você está offline. Reconecte para puxar o snapshot remoto.");
      return;
    }
    const syncToken = await acquireSyncLock();
    if (!syncToken) return;
    try {
      setIsSyncing(true);
      const cloudData = await pullFromCloud(user.uid);
      if (!cloudData) {
        await pushHistory("manual-pull", "skipped", "Nenhum snapshot remoto encontrado para puxar.");
        setNotice("Nenhum snapshot remoto encontrado.");
        return;
      }

      const cloudTables = stripBackupMeta(cloudData);
      await applySnapshotLocally(cloudTables, cloudData.exportedAt);
      commitLastSuccessfulSyncAt(cloudData.exportedAt);
      finalizeMatchState(cloudTables, cloudData);
      await pushHistory(
        "manual-pull",
        "success",
        "Snapshot remoto confirmado como origem e aplicado manualmente na base local.",
        cloudData.exportedAt,
      );
      setNotice("Snapshot remoto aplicado na base local como fonte de verdade.");
    } catch (error) {
      if (isCloudPermissionError(error)) {
        await pushHistory("manual-pull", "skipped", "A conta não tem permissão para ler o snapshot remoto.");
        setNotice("Sua conta não tem permissão para ler a nuvem.");
        setIsWorkingLocal(true);
        return;
      }
      logSyncError("Cloud sync pull error:", error);
      await pushHistory("manual-pull", "error", "Falha ao puxar o snapshot remoto.");
      setNotice("Falha ao puxar a nuvem.");
    } finally {
      setIsSyncing(false);
      releaseSyncLock(syncToken);
    }
  }, [
    acquireSyncLock,
    applySnapshotLocally,
    commitLastSuccessfulSyncAt,
    finalizeMatchState,
    isAuthEnabled,
    isOnline,
    pushHistory,
    releaseSyncLock,
    setNotice,
    user,
  ]);

  const mergeLocalAndCloud = useCallback(async () => {
    if (!user || !isAuthEnabled) return;
    if (!isOnline) {
      setNotice("Você está offline. Reconecte para mesclar snapshots.");
      return;
    }
    const syncToken = await acquireSyncLock();
    if (!syncToken) return;
    try {
      setIsSyncing(true);
      const [localTables, cloudData] = await Promise.all([readBackupTables(), pullFromCloud(user.uid)]);
      if (!cloudData) {
        await runPushFlow("manual-push", {
          lockToken: syncToken,
          cloudData: null,
          localTables,
        });
        return;
      }

      const mergedTables = mergeSyncTables(localTables, stripBackupMeta(cloudData));
      const mergedPayload = buildBackupPayload(mergedTables);

      await pushToCloud(user.uid, mergedPayload);
      await applySnapshotLocally(mergedTables, mergedPayload.exportedAt);
      commitLastSuccessfulSyncAt(mergedPayload.exportedAt);
      setIsWorkingLocal(false);
      finalizeMatchState(mergedTables, mergedPayload, mergedPayload.exportedAt);
      await pushHistory(
        "manual-merge",
        "success",
        "Snapshots local e remoto foram reconciliados com merge seguro e preservação de histórico.",
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
      logSyncError("Cloud sync merge error:", error);
      await pushHistory("manual-merge", "error", "Falha ao mesclar snapshots local e remoto.");
      setNotice("Falha ao mesclar os dados de sync.");
    } finally {
      setIsSyncing(false);
      releaseSyncLock(syncToken);
    }
  }, [
    acquireSyncLock,
    applySnapshotLocally,
    commitLastSuccessfulSyncAt,
    finalizeMatchState,
    isAuthEnabled,
    isOnline,
    pushHistory,
    readBackupTables,
    releaseSyncLock,
    runPushFlow,
    setNotice,
    user,
  ]);

  const workLocal = useCallback(async () => {
    setIsWorkingLocal(true);
    await pushHistory(
      "manual-local",
      "skipped",
      "Modo somente local ativado. A sincronização automática ficou pausada até nova decisão manual.",
    );
    setNotice("Modo somente local ativado. O auto-sync seguirá pausado até nova decisão manual.");
  }, [pushHistory, setNotice]);

  const triggerSyncToCloud = useCallback(async () => {
    if (!autoSyncEnabled || isWorkingLocal || comparison?.decision === "conflict") {
      return;
    }
    const result = await runPushFlow("auto-push");
    // Processar fila de mutações pendentes após push
    await syncPendingMutations();
    return result;
  }, [autoSyncEnabled, comparison?.decision, isWorkingLocal, runPushFlow]);

  // Versão debouncada para auto-sync (5 segundos)
  const debouncedTriggerSync = useMemo(() => debounce(() => triggerSyncToCloud(), 5000), [triggerSyncToCloud]);

  // Intervalo periódico para processar fila de mutações pendentes (30 segundos)
  useEffect(() => {
    if (!isAuthEnabled || !user || !isOnline || isWorkingLocal || isSyncing) {
      return;
    }

    const intervalId = setInterval(async () => {
      // Verificar se há mutações pendentes antes de disparar sync
      const { db } = await import("../core/db");
      const pendingCount = await db.pendingMutations.filter((m: { syncedAt?: string | null }) => !m.syncedAt).count();

      if (pendingCount > 0) {
        await triggerSyncToCloud();
      }
    }, 30000); // 30 segundos

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthEnabled, isOnline, isSyncing, isWorkingLocal, triggerSyncToCloud, user]);

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
    debouncedTriggerSync,
    pushLocalToCloud,
    pullCloudToLocal,
    mergeLocalAndCloud,
    workLocal,
    resetLocalAndCloud,
  };
}
