import { getPendingMutations, markMutationsSynced, incrementMutationRetry } from "./mutationQueue";
import { pushEntityToCloud, deleteEntityInCloud } from "./incrementalSync";
import { auth } from "./firebase";
import type { EntityType } from "../core/types";

/**
 * Sync engine para processar fila de mutações pendentes.
 * Envia operações create/update/delete para o Firestore.
 */

const BATCH_SIZE = 10;

/**
 * Processa uma única mutação pendente.
 */
async function processMutation(mutation: {
  id: number;
  uuid: string;
  entityType: EntityType;
  mutationType: "create" | "update" | "delete";
  payload: string;
}): Promise<boolean> {
  try {
    if (!auth) return false;

    const user = auth.currentUser;
    if (!user) return false;

    const uid = user.uid;
    const parsedPayload = JSON.parse(mutation.payload);

    // Mapear entityType para nome da coleção
    const collectionMap: Record<EntityType, string> = {
      game: "games",
      libraryEntry: "library-entries",
      playSession: "play-sessions",
      review: "reviews",
      list: "lists",
      tag: "tags",
      store: "stores",
      platform: "platforms",
      goal: "goals",
      savedView: "saved-views",
      importJob: "import-jobs",
      libraryEntryStore: "library-entry-stores",
      libraryEntryList: "library-entry-lists",
      gameTag: "game-tags",
      gamePlatform: "game-platforms",
      setting: "settings",
    };

    const collectionName = collectionMap[mutation.entityType];

    if (mutation.mutationType === "delete") {
      const now = new Date().toISOString();
      await deleteEntityInCloud(uid, collectionName, mutation.uuid, now);
    } else {
      await pushEntityToCloud(uid, collectionName, parsedPayload);
    }

    return true;
  } catch (error) {
    console.error(`[SyncEngine] Erro ao processar mutação ${mutation.id}:`, error);
    return false;
  }
}

/**
 * Processa toda a fila de mutações pendentes.
 * Usa concorrência limitada para evitar rate limiting do Firestore.
 */
export async function processMutationQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pending = await getPendingMutations();

  if (pending.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Processar em batches
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (m) => {
        if (!m.id) return false;
        const success = await processMutation({
          id: m.id,
          uuid: m.uuid,
          entityType: m.entityType,
          mutationType: m.mutationType,
          payload: m.payload,
        });
        if (success) {
          succeeded++;
        } else {
          failed++;
        }
        processed++;
        return success;
      }),
    );

    // Marcar mutações sincronizadas
    const successIds = batch
      .map((m, idx) => {
        const result = batchResults[idx];
        return result.status === "fulfilled" && result.value && m.id ? m.id : null;
      })
      .filter((id): id is number => id !== null);

    if (successIds.length > 0) {
      await markMutationsSynced(successIds);
    }

    // Incrementar retry para falhas
    const failIds = batch
      .map((m, idx) => {
        const result = batchResults[idx];
        return result.status !== "fulfilled" || !result.value ? m.id : null;
      })
      .filter((id): id is number => id !== null);

    for (const id of failIds) {
      await incrementMutationRetry(id);
    }
  }

  return { processed, succeeded, failed };
}

/**
 * Wrapper seguro para processar fila com tratamento de erro.
 */
export async function syncPendingMutations(): Promise<void> {
  try {
    const result = await processMutationQueue();
    if (result.processed > 0) {
      console.log(`[SyncEngine] Sync concluído: ${result.succeeded}/${result.processed} mutações sincronizadas`);
    }
  } catch (error) {
    console.error("[SyncEngine] Erro crítico no sync:", error);
  }
}
