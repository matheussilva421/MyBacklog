import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../core/db";
import { softDelete, isDeleted, filterDeleted, hardDelete, purgeDeletedEntities } from "./softDelete";

describe("softDelete", () => {
  beforeEach(async () => {
    // Limpar tags antes de cada teste
    await db.tags.clear();
  });

  describe("isDeleted", () => {
    it("deve retornar false para entidade sem deletedAt", () => {
      const entity = { id: 1, name: "Test", deletedAt: undefined };
      expect(isDeleted(entity)).toBe(false);
    });

    it("deve retornar false para entidade com deletedAt null", () => {
      const entity = { id: 1, name: "Test", deletedAt: null };
      expect(isDeleted(entity)).toBe(false);
    });

    it("deve retornar true para entidade com deletedAt definido", () => {
      const entity = { id: 1, name: "Test", deletedAt: new Date().toISOString() };
      expect(isDeleted(entity)).toBe(true);
    });
  });

  describe("filterDeleted", () => {
    it("deve filtrar entidades deletadas", () => {
      const entities = [
        { id: 1, name: "A", deletedAt: null },
        { id: 2, name: "B", deletedAt: new Date().toISOString() },
        { id: 3, name: "C", deletedAt: undefined },
        { id: 4, name: "D", deletedAt: new Date().toISOString() },
      ];

      const filtered = filterDeleted(entities);
      expect(filtered.length).toBe(2);
      expect(filtered.map((e) => e.id)).toEqual([1, 3]);
    });

    it("deve retornar todas as entidades se nenhuma estiver deletada", () => {
      const entities = [
        { id: 1, name: "A", deletedAt: null },
        { id: 2, name: "B", deletedAt: null },
      ];

      const filtered = filterDeleted(entities);
      expect(filtered.length).toBe(2);
    });

    it("deve retornar array vazio se todas estiverem deletadas", () => {
      const entities = [
        { id: 1, name: "A", deletedAt: new Date().toISOString() },
        { id: 2, name: "B", deletedAt: new Date().toISOString() },
      ];

      const filtered = filterDeleted(entities);
      expect(filtered.length).toBe(0);
    });
  });

  describe("softDelete", () => {
    it("deve marcar entidade como deletada", async () => {
      const now = new Date().toISOString();
      const tagId = await db.tags.add({
        uuid: "test-uuid",
        version: 1,
        name: "Test Tag",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      await softDelete("tags", tagId, "device-test");

      const updatedTag = await db.tags.get(tagId);
      expect(updatedTag?.deletedAt).toBeDefined();
      expect(updatedTag?.deletedAt).not.toBeNull();
      expect(updatedTag?.version).toBe(2);
      expect(updatedTag?.updatedByDeviceId).toBe("device-test");
    });

    it("deve ser idempotente - não fazer nada se já estiver deletada", async () => {
      const now = new Date().toISOString();
      const tagId = await db.tags.add({
        uuid: "test-uuid",
        version: 1,
        name: "Test Tag",
        createdAt: now,
        updatedAt: now,
        deletedAt: now,
      });

      await softDelete("tags", tagId, "device-test");
      await softDelete("tags", tagId, "device-test-2");

      const updatedTag = await db.tags.get(tagId);
      expect(updatedTag?.deletedAt).toBe(now);
      expect(updatedTag?.version).toBe(1);
      expect(updatedTag?.updatedByDeviceId).toBeUndefined();
    });

    it("deve avisar se entidade não existir", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await softDelete("tags", 99999, "device-test");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "softDelete: entidade não encontrada em tags com id 99999",
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe("hardDelete", () => {
    it("deve remover entidade permanentemente", async () => {
      const now = new Date().toISOString();
      const tagId = await db.tags.add({
        uuid: "test-uuid",
        version: 1,
        name: "Test Tag",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      await hardDelete("tags", tagId);

      const deletedTag = await db.tags.get(tagId);
      expect(deletedTag).toBeUndefined();
    });
  });

  describe("purgeDeletedEntities", () => {
    it("deve remover todas as entidades deletadas", async () => {
      const now = new Date().toISOString();
      await db.tags.bulkAdd([
        {
          uuid: "uuid-1",
          version: 1,
          name: "Active Tag",
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          uuid: "uuid-2",
          version: 1,
          name: "Deleted Tag",
          createdAt: now,
          updatedAt: now,
          deletedAt: now,
        },
        {
          uuid: "uuid-3",
          version: 1,
          name: "Also Deleted",
          createdAt: now,
          updatedAt: now,
          deletedAt: now,
        },
      ]);

      const purged = await purgeDeletedEntities("tags");

      expect(purged).toBe(2);
      const remaining = await db.tags.toArray();
      expect(remaining.length).toBe(1);
      expect(remaining[0].name).toBe("Active Tag");
    });

    it("deve retornar 0 se não houver entidades deletadas", async () => {
      const now = new Date().toISOString();
      await db.tags.bulkAdd([
        {
          uuid: "uuid-1",
          version: 1,
          name: "Active Tag 1",
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          uuid: "uuid-2",
          version: 1,
          name: "Active Tag 2",
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ]);

      const purged = await purgeDeletedEntities("tags");
      expect(purged).toBe(0);
    });
  });
});
