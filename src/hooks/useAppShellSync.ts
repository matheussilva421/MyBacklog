import { useEffect } from "react";
import type { User } from "firebase/auth";
import type { useBacklogApp } from "./useBacklogApp";
import { useCloudSync } from "./useCloudSync";

type BacklogAppState = ReturnType<typeof useBacklogApp>;

export function useAppShellSync(args: { app: BacklogAppState; user: User | null; isAuthEnabled: boolean }) {
  const sync = useCloudSync({
    user: args.isAuthEnabled ? args.user : null,
    isAuthEnabled: args.isAuthEnabled,
    autoSyncEnabled: args.app.preferences.autoSyncEnabled,
    readBackupTables: args.app.readBackupTables,
    refreshData: args.app.refreshData,
    setNotice: args.app.setNotice,
  });
  const { debouncedTriggerSync } = sync;

  useEffect(() => {
    if (!args.isAuthEnabled || !args.user || args.app.loading || !args.app.preferences.autoSyncEnabled) {
      return;
    }

    // Usar versão debouncada para auto-sync para agrupar mudanças rápidas
    void debouncedTriggerSync();
  }, [
    args.app.autoSyncWatchKey,
    args.app.loading,
    args.app.preferences.autoSyncEnabled,
    args.isAuthEnabled,
    args.user,
    debouncedTriggerSync,
  ]);

  return sync;
}
