import { generateUuid } from "./utils";

/**
 * Helpers para criar entidades syncáveis com uuid, version, timestamps automáticos.
 */

export function withSyncMetadata<
  T extends {
    uuid?: string;
    version?: number;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
    updatedByDeviceId?: string;
  },
>(
  entity: Omit<T, "uuid" | "version" | "createdAt" | "updatedAt" | "deletedAt" | "updatedByDeviceId"> &
    Partial<Pick<T, "uuid" | "version" | "createdAt" | "updatedAt" | "deletedAt" | "updatedByDeviceId">>,
): T {
  const now = new Date().toISOString();
  return {
    ...entity,
    uuid: entity.uuid ?? generateUuid(),
    version: entity.version ?? 1,
    createdAt: entity.createdAt ?? now,
    updatedAt: entity.updatedAt ?? now,
    deletedAt: entity.deletedAt ?? null,
    updatedByDeviceId: entity.updatedByDeviceId,
  } as T;
}

export function withUpdateMetadata<T extends { version: number; updatedAt: string }>(
  entity: T & { version?: number; updatedAt?: string },
): T {
  return {
    ...entity,
    version: (entity.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}
