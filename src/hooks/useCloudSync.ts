import { useEffect, useRef, useState } from "react";
import { User } from "firebase/auth";
import { pushToCloud, pullFromCloud } from "../lib/sync";
import type { BackupPayload } from "../backlog/shared";
import { db } from "../core/db";

export function useCloudSync(
  user: User | null,
  readBackupTables: () => Promise<Omit<BackupPayload, "version" | "exportedAt" | "source">>,
  refreshData: () => Promise<void>,
  setNotice: (msg: string) => void
) {
  const [isSyncing, setIsSyncing] = useState(false);
  const isPullingRef = useRef(false);
  const previousExportRef = useRef<string | null>(null);

  // 1. Pull on Login
  useEffect(() => {
    if (!user) return;

    let active = true;
    (async () => {
      try {
        setIsSyncing(true);
        const cloudData = await pullFromCloud(user.uid);
        
        if (!cloudData && active) {
          // No cloud data yet, let's push our local data if we have any
          const tables = await readBackupTables();
          const hasData = tables.games.length > 0 || tables.libraryEntries.length > 0;
          if (hasData) {
            const payload: BackupPayload = {
              version: 4,
              exportedAt: new Date().toISOString(),
              source: "mybacklog",
              ...tables,
            };
            await pushToCloud(user.uid, payload);
            previousExportRef.current = JSON.stringify(payload);
          }
          return;
        }

        if (cloudData && active) {
          isPullingRef.current = true;
          // Subsituição total para garantir sincronia idêntica entre dispositivos
          await db.transaction(
            "rw",
            [db.games, db.libraryEntries, db.playSessions, db.reviews, db.lists, db.libraryEntryLists, db.tags, db.gameTags, db.goals, db.settings, db.importJobs],
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
              await db.importJobs.clear();

              if (cloudData.games?.length) await db.games.bulkPut(cloudData.games);
              if (cloudData.libraryEntries?.length) await db.libraryEntries.bulkPut(cloudData.libraryEntries);
              if (cloudData.playSessions?.length) await db.playSessions.bulkPut(cloudData.playSessions);
              if (cloudData.reviews?.length) await db.reviews.bulkPut(cloudData.reviews);
              if (cloudData.lists?.length) await db.lists.bulkPut(cloudData.lists);
              if (cloudData.libraryEntryLists?.length) await db.libraryEntryLists.bulkPut(cloudData.libraryEntryLists);
              if (cloudData.tags?.length) await db.tags.bulkPut(cloudData.tags);
              if (cloudData.gameTags?.length) await db.gameTags.bulkPut(cloudData.gameTags);
              if (cloudData.goals?.length) await db.goals.bulkPut(cloudData.goals);
              if (cloudData.settings?.length) await db.settings.bulkPut(cloudData.settings);
            }
          );
          await refreshData();
          previousExportRef.current = JSON.stringify(cloudData);
          setNotice("Dados sincronizados da nuvem com sucesso.");
        }
      } catch (err) {
        console.error("Sync error:", err);
        setNotice("Falha ao sincronizar com a nuvem.");
      } finally {
        if (active) {
          setIsSyncing(false);
          // Allow some time for React hooks to settle after refreshData
          setTimeout(() => {
            isPullingRef.current = false;
          }, 1000);
        }
      }
    })();

    return () => { active = false; };
  }, [user]);

  // 2. We expose a manual trigger to push to cloud, or we can use an interval/listener
  // To avoid performance hits, we implement a manual sync trigger
  const triggerSyncToCloud = async () => {
    if (!user || isPullingRef.current || isSyncing) return;
    try {
      setIsSyncing(true);
      const tables = await readBackupTables();
      const payload: BackupPayload = {
        version: 4,
        exportedAt: new Date().toISOString(),
        source: "mybacklog",
        ...tables,
      };
      
      const currentExportString = JSON.stringify(payload);
      if (currentExportString === previousExportRef.current) {
        // No changes
        return;
      }
      
      await pushToCloud(user.uid, payload);
      previousExportRef.current = currentExportString;
    } catch (err) {
      console.error("Push sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, triggerSyncToCloud };
}
