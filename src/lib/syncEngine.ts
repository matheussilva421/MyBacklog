import { getPendingMutations, markMutationsSynced, incrementMutationRetry, MAX_RETRY_COUNT } from "./mutationQueue";
import { pushEntityToCloud, deleteEntityInCloud } from "./incrementalSync";
import { logSyncFailure, resolveSyncFailure } from "./syncTelemetry";
import { auth } from "./firebase";
import type { EntityType } from "../core/types";

/**
 * Sync engine para processar fila de mutações pendentes.
 * Envia operações create/update/delete para o Firestore.
 */

const BATCH_SIZE = 10;
const BASE_DELAY_MS = 1000; // 1 segundo
const MAX_DELAY_MS = 300000; // 5 minutos

/**
 * Calcula delay com backoff exponencial baseado no retryCount.
 * Fórmula: min(BASE_DELAY * 2^retryCount, MAX_DELAY)
 */
export function calculateBackoffDelay(retryCount: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, retryCount);
  return Math.min(exponentialDelay, MAX_DELAY_MS);
}

/**
 * Delay assíncrono.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processa uma única mutação pendente.
 */
async function processMutation(mutation: {
  id: number;
  uuid: string;
  entityType: EntityType;
  mutationType: "create" | "update" | "delete";
  payload: string;
  retryCount: number;
}): Promise<boolean> {
  // Verificar se excedeu máximo de retries
  if (mutation.retryCount >= MAX_RETRY_COUNT) {
    console.error(
      `[SyncEngine] Muição ${mutation.id} excedeu máximo de ${MAX_RETRY_COUNT} retries. Marcada como falha permanente.`,
    );
    return false;
  }

  // Aplicar delay com backoff exponencial para retries
  if (mutation.retryCount > 0) {
    const delay = calculateBackoffDelay(mutation.retryCount);
    console.log(
      `[SyncEngine] Aguardando ${delay}ms antes de retry #${mutation.retryCount} para mutação ${mutation.id}`,
    );
    await sleep(delay);
  }

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
    await logSyncFailure(mutation.id, mutation.entityType, mutation.mutationType, error, mutation.retryCount);
    return false;
  }
}

/**
 * Processa toda a fila de mutações pendentes.
 * Usa concorrência limitada para evitar rate limiting do Firestore.
 * Aplica backoff exponencial para retries e respeita limite máximo de retries.
 */
export async function processMutationQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  permanentFailures: number;
}> {
  const pending = await getPendingMutations();

  if (pending.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, permanentFailures: 0 };
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let permanentFailures = 0;

  // Processar em batches
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (m) => {
        if (!m.id) return { success: false, permanentFailure: false };

        // Verificar se excedeu máximo de retries antes de processar
        if (m.retryCount >= MAX_RETRY_COUNT) {
          console.error(`[SyncEngine] Muição ${m.id} excedeu máximo de ${MAX_RETRY_COUNT} retries. Ignorada.`);
          return { success: false, permanentFailure: true };
        }

        const success = await processMutation({
          id: m.id,
          uuid: m.uuid,
          entityType: m.entityType,
          mutationType: m.mutationType,
          payload: m.payload,
          retryCount: m.retryCount,
        });
        if (success) {
          succeeded++;
        } else {
          failed++;
        }
        processed++;
        return { success, permanentFailure: false };
      }),
    );

    // Marcar mutações sincronizadas
    const successIds = batch
      .map((m, idx) => {
        const result = batchResults[idx];
        return result.status === "fulfilled" && result.value.success && m.id ? m.id : null;
      })
      .filter((id): id is number => id !== null);

    if (successIds.length > 0) {
      await markMutationsSynced(successIds);
      // Resolver falhas de sync para mutações bem-sucedidas
      for (const id of successIds) {
        await resolveSyncFailure(id, "success");
      }
    }

    // Incrementar retry para falhas temporárias
    const failIds = batch
      .map((m, idx) => {
        const result = batchResults[idx];
        const permanentFailure = result.status === "fulfilled" && result.value.permanentFailure;
        if (permanentFailure) {
          permanentFailures++;
          return null;
        }
        return (result.status !== "fulfilled" || !result.value.success) && !permanentFailure ? m.id : null;
      })
      .filter((id): id is number => id !== null);

    for (const id of failIds) {
      await incrementMutationRetry(id);
    }
  }

  return { processed, succeeded, failed, permanentFailures };
}

/**
 * Wrapper seguro para processar fila com tratamento de erro.
 */
export async function syncPendingMutations(): Promise<void> {
  try {
    const result = await processMutationQueue();
    if (result.processed > 0) {
      console.log(
        `[SyncEngine] Sync concluído: ${result.succeeded}/${result.processed} mutações sincronizadas` +
          (result.permanentFailures > 0 ? `, ${result.permanentFailures} falhas permanentes` : ""),
      );
    }
  } catch (error) {
    console.error("[SyncEngine] Erro crítico no sync:", error);
  }
}
