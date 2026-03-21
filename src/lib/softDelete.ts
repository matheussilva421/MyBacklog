import { db } from "../core/db";
import type { Table } from "dexie";

/**
 * Utilitário para soft delete (tombstone) de entidades syncáveis.
 * Em vez de remover o registro, marca deletedAt para sincronização.
 */

const DEVICE_ID_KEY = "deviceId";

function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId(): Promise<string> {
  const row = await db.settings.get({ key: DEVICE_ID_KEY });
  if (row?.value) return row.value;

  const newId = generateDeviceId();
  await db.settings.add({
    key: DEVICE_ID_KEY,
    value: newId,
    updatedAt: new Date().toISOString(),
  });

  return newId;
}

export function isDeleted(entity: { deletedAt?: string | null }): boolean {
  return Boolean(entity.deletedAt);
}

export function filterDeleted<T extends { deletedAt?: string | null }>(entities: T[]): T[] {
  return entities.filter((e) => !isDeleted(e));
}

/**
 * Marca uma entidade como deletada (soft delete).
 * Incrementa version, atualiza updatedAt e deletedAt.
 */
export async function softDelete<T extends { id?: number; uuid?: string; version?: number; updatedAt?: string; deletedAt?: string | null; updatedByDeviceId?: string }>(
  tableName: keyof typeof db,
  id: number,
  deviceId: string,
): Promise<void> {
  const table = db[tableName] as unknown as Table<T, number>;
  const entity = await table.get(id);

  if (!entity) {
    console.warn(`softDelete: entidade não encontrada em ${String(tableName)} com id ${id}`);
    return;
  }

  // Se já está deletada, não faz nada
  if (entity.deletedAt) {
    return;
  }

  const now = new Date().toISOString();

  await table.update(id, {
    deletedAt: now,
    updatedAt: now,
    updatedByDeviceId: deviceId,
    version: (entity.version ?? 0) + 1,
  } as any);
}

/**
 * Hard delete permanente - remove a entidade do banco.
 * Usar apenas para limpeza de tombstones antigos ou dados locais.
 */
export async function hardDelete<T extends { id?: number }>(
  tableName: keyof typeof db,
  id: number,
): Promise<void> {
  const table = db[tableName] as unknown as Table<T, number>;
  await table.delete(id);
}

/**
 * Remove permanentemente todas as entidades marcadas como deletedAt.
 * Útil para limpeza periódica do banco.
 */
export async function purgeDeletedEntities(tableName: keyof typeof db): Promise<number> {
  const table = db[tableName] as unknown as Table<{ id?: number; deletedAt?: string | null }, number>;
  const deletedEntities = await table.where("deletedAt").aboveOrEqual("").toArray();

  if (deletedEntities.length === 0) {
    return 0;
  }

  await table.bulkDelete(deletedEntities.map((e: { id?: number }) => e.id!).filter(Boolean));
  return deletedEntities.length;
}
