import { db } from "../core/db";
import type { PendingMutation, MutationType, EntityType } from "../core/types";

/**
 * Fila local de mutações pendentes para sync incremental.
 * Armazena operações create/update/delete que ainda não foram sincronizadas.
 */

export const MAX_RETRY_COUNT = 5;

/**
 * Enfileira uma mutação pendente.
 */
export async function enqueueMutation(
  uuid: string,
  entityType: EntityType,
  mutationType: MutationType,
  payload: unknown,
): Promise<void> {
  await db.pendingMutations.add({
    uuid,
    entityType,
    mutationType,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    syncedAt: null,
    retryCount: 0,
  });
}

/**
 * Obtém todas as mutações pendentes não sincronizadas.
 */
export async function getPendingMutations(): Promise<PendingMutation[]> {
  const allMutations = await db.pendingMutations.toArray();
  return allMutations
    .filter((m) => !m.syncedAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Obtém mutações pendentes por tipo de entidade.
 */
export async function getPendingMutationsByType(entityType: EntityType): Promise<PendingMutation[]> {
  const allMutations = await getPendingMutations();
  return allMutations.filter((m) => m.entityType === entityType);
}

/**
 * Obtém mutações pendentes por UUID.
 */
export async function getPendingMutationsByUuid(uuid: string): Promise<PendingMutation[]> {
  const allMutations = await getPendingMutations();
  return allMutations.filter((m) => m.uuid === uuid);
}

/**
 * Marca uma mutação como sincronizada.
 */
export async function markMutationSynced(id: number): Promise<void> {
  await db.pendingMutations.update(id, {
    syncedAt: new Date().toISOString(),
  });
}

/**
 * Marca múltiplas mutações como sincronizadas.
 */
export async function markMutationsSynced(ids: number[]): Promise<void> {
  for (const id of ids) {
    await markMutationSynced(id);
  }
}

/**
 * Incrementa contador de retry de uma mutação.
 */
export async function incrementMutationRetry(id: number): Promise<void> {
  const mutation = await db.pendingMutations.get(id);
  if (!mutation) return;

  await db.pendingMutations.update(id, {
    retryCount: mutation.retryCount + 1,
  });
}

/**
 * Remove mutações sincronizadas antigas (cleanup).
 */
export async function purgeSyncedMutations(olderThanMs: number = 86400000): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const syncedMutations = await db.pendingMutations
    .filter((m: { syncedAt?: string | null }) => Boolean(m.syncedAt && m.syncedAt < cutoff))
    .toArray();

  if (syncedMutations.length === 0) return 0;

  await db.pendingMutations.bulkDelete(syncedMutations.map((m) => m.id!).filter(Boolean));
  return syncedMutations.length;
}

/**
 * Conta mutações pendentes por entidade.
 */
export async function countPendingMutations(): Promise<number> {
  const allMutations = await db.pendingMutations.toArray();
  return allMutations.filter((m) => !m.syncedAt).length;
}

/**
 * Verifica se há mutações pendentes para um UUID específico.
 */
export async function hasPendingMutation(uuid: string): Promise<boolean> {
  const mutations = await getPendingMutationsByUuid(uuid);
  return mutations.length > 0;
}

/**
 * Cancela mutações pendentes para um UUID (em caso de conflito ou rollback).
 */
export async function cancelPendingMutations(uuid: string): Promise<number> {
  const mutations = await getPendingMutationsByUuid(uuid);
  if (mutations.length === 0) return 0;

  await db.pendingMutations.bulkDelete(mutations.map((m) => m.id!).filter(Boolean));
  return mutations.length;
}

/**
 * Obtém a próxima mutação pendente a ser processada (FIFO).
 */
export async function getNextPendingMutation(): Promise<PendingMutation | undefined> {
  const mutations = await getPendingMutations();
  return mutations[0];
}

/**
 * Obtém todas as mutações com falha permanente (retryCount >= MAX_RETRY_COUNT).
 */
export async function getPermanentFailures(): Promise<PendingMutation[]> {
  const allMutations = await db.pendingMutations.toArray();
  return allMutations.filter((m) => !m.syncedAt && m.retryCount >= MAX_RETRY_COUNT);
}

/**
 * Obtém todas as mutações com falha temporária (0 < retryCount < MAX_RETRY_COUNT).
 */
export async function getTemporaryFailures(): Promise<PendingMutation[]> {
  const allMutations = await db.pendingMutations.toArray();
  return allMutations.filter((m) => !m.syncedAt && m.retryCount > 0 && m.retryCount < MAX_RETRY_COUNT);
}

/**
 * Reseta contador de retry de uma mutação.
 */
export async function resetMutationRetry(id: number): Promise<void> {
  await db.pendingMutations.update(id, {
    retryCount: 0,
  });
}

/**
 * Remove uma mutação pendente.
 */
export async function deletePendingMutation(id: number): Promise<void> {
  await db.pendingMutations.delete(id);
}

/**
 * Reseta contador de retry de múltiplas mutações.
 */
export async function bulkResetMutationRetry(ids: number[]): Promise<void> {
  for (const id of ids) {
    await resetMutationRetry(id);
  }
}

/**
 * Remove múltiplas mutações pendentes.
 */
export async function bulkDeletePendingMutations(ids: number[]): Promise<void> {
  await db.pendingMutations.bulkDelete(ids);
}
