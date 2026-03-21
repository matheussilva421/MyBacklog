import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../core/db";
import {
  enqueueMutation,
  getPendingMutations,
  getPendingMutationsByType,
  getPendingMutationsByUuid,
  markMutationSynced,
  markMutationsSynced,
  incrementMutationRetry,
  purgeSyncedMutations,
  countPendingMutations,
  hasPendingMutation,
  cancelPendingMutations,
  getNextPendingMutation,
} from "./mutationQueue";

describe("mutationQueue", () => {
  beforeEach(async () => {
    await db.pendingMutations.clear();
  });

  describe("enqueueMutation", () => {
    it("deve enfileirar uma mutação pendente", async () => {
      const payload = { name: "Test Game", progressStatus: "playing" };
      await enqueueMutation("uuid-1", "game", "create", payload);

      const mutations = await getPendingMutations();
      expect(mutations.length).toBe(1);
      expect(mutations[0].uuid).toBe("uuid-1");
      expect(mutations[0].entityType).toBe("game");
      expect(mutations[0].mutationType).toBe("create");
      expect(JSON.parse(mutations[0].payload)).toEqual(payload);
      expect(mutations[0].syncedAt).toBe(null);
      expect(mutations[0].retryCount).toBe(0);
    });

    it("deve enfileirar múltiplas mutações em ordem FIFO", async () => {
      await enqueueMutation("uuid-1", "game", "create", { name: "Game 1" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await enqueueMutation("uuid-2", "libraryEntry", "update", { progressStatus: "playing" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await enqueueMutation("uuid-3", "playSession", "create", { durationMinutes: 30 });

      const mutations = await getPendingMutations();
      expect(mutations.length).toBe(3);
      expect(mutations[0].uuid).toBe("uuid-1");
      expect(mutations[1].uuid).toBe("uuid-2");
      expect(mutations[2].uuid).toBe("uuid-3");
    });
  });

  describe("getPendingMutations", () => {
    it("deve retornar apenas mutações não sincronizadas", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      await enqueueMutation("uuid-2", "game", "update", {});

      const pending = await getPendingMutations();
      await markMutationSynced(pending[0].id!);

      const remaining = await getPendingMutations();
      expect(remaining.length).toBe(1);
      expect(remaining[0].uuid).toBe("uuid-2");
    });
  });

  describe("getPendingMutationsByType", () => {
    it("deve filtrar mutações por tipo de entidade", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      await enqueueMutation("uuid-2", "libraryEntry", "update", {});
      await enqueueMutation("uuid-3", "game", "delete", {});

      const gameMutations = await getPendingMutationsByType("game");
      expect(gameMutations.length).toBe(2);
      expect(gameMutations.map((m) => m.uuid)).toEqual(["uuid-1", "uuid-3"]);
    });
  });

  describe("getPendingMutationsByUuid", () => {
    it("deve filtrar mutações por UUID", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      await enqueueMutation("uuid-1", "game", "update", {});
      await enqueueMutation("uuid-2", "libraryEntry", "update", {});

      const mutations = await getPendingMutationsByUuid("uuid-1");
      expect(mutations.length).toBe(2);
      expect(mutations.every((m) => m.uuid === "uuid-1")).toBe(true);
    });
  });

  describe("markMutationSynced / markMutationsSynced", () => {
    it("deve marcar mutação como sincronizada", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      const pending = await getPendingMutations();

      await markMutationSynced(pending[0].id!);

      const updated = await db.pendingMutations.get(pending[0].id!);
      expect(updated?.syncedAt).toBeDefined();
      expect(updated?.syncedAt).not.toBeNull();
    });

    it("deve marcar múltiplas mutações como sincronizadas", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      await enqueueMutation("uuid-2", "game", "update", {});
      const pending = await getPendingMutations();
      const ids = pending.map((m) => m.id!);

      await markMutationsSynced(ids);

      const updated = await getPendingMutations();
      expect(updated.length).toBe(0);
    });
  });

  describe("incrementMutationRetry", () => {
    it("deve incrementar contador de retry", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      const pending = await getPendingMutations();

      await incrementMutationRetry(pending[0].id!);
      await incrementMutationRetry(pending[0].id!);

      const updated = await db.pendingMutations.get(pending[0].id!);
      expect(updated?.retryCount).toBe(2);
    });
  });

  describe("purgeSyncedMutations", () => {
    it("deve remover mutações sincronizadas antigas", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      await enqueueMutation("uuid-2", "game", "update", {});

      const pending = await getPendingMutations();
      await markMutationSynced(pending[0].id!);

      // Simular tempo passado (mutations antigas)
      const oldMutations = await db.pendingMutations.toArray();
      for (const m of oldMutations) {
        if (m.syncedAt) {
          const oldDate = new Date(Date.now() - 100000).toISOString();
          await db.pendingMutations.update(m.id!, { syncedAt: oldDate });
        }
      }

      const purged = await purgeSyncedMutations(50000);
      expect(purged).toBe(1);

      const remaining = await getPendingMutations();
      expect(remaining.length).toBe(1);
    });

    it("deve retornar 0 se não houver mutações antigas", async () => {
      const purged = await purgeSyncedMutations();
      expect(purged).toBe(0);
    });
  });

  describe("countPendingMutations", () => {
    it("deve contar mutações pendentes", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      await enqueueMutation("uuid-2", "game", "update", {});
      await enqueueMutation("uuid-3", "libraryEntry", "delete", {});

      const count = await countPendingMutations();
      expect(count).toBe(3);
    });
  });

  describe("hasPendingMutation", () => {
    it("deve retornar true se houver mutação para UUID", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});

      const hasMutation = await hasPendingMutation("uuid-1");
      expect(hasMutation).toBe(true);
    });

    it("deve retornar false se não houver mutação para UUID", async () => {
      const hasMutation = await hasPendingMutation("uuid-nonexistent");
      expect(hasMutation).toBe(false);
    });
  });

  describe("cancelPendingMutations", () => {
    it("deve cancelar mutações pendentes para um UUID", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      await enqueueMutation("uuid-1", "game", "update", {});
      await enqueueMutation("uuid-2", "libraryEntry", "update", {});

      const cancelled = await cancelPendingMutations("uuid-1");
      expect(cancelled).toBe(2);

      const remaining = await getPendingMutations();
      expect(remaining.length).toBe(1);
      expect(remaining[0].uuid).toBe("uuid-2");
    });

    it("deve retornar 0 se não houver mutações para cancelar", async () => {
      const cancelled = await cancelPendingMutations("uuid-nonexistent");
      expect(cancelled).toBe(0);
    });
  });

  describe("getNextPendingMutation", () => {
    it("deve retornar próxima mutação pendente (FIFO)", async () => {
      await enqueueMutation("uuid-1", "game", "create", {});
      await new Promise((resolve) => setTimeout(resolve, 10));
      await enqueueMutation("uuid-2", "libraryEntry", "update", {});

      const next = await getNextPendingMutation();
      expect(next?.uuid).toBe("uuid-1");
    });

    it("deve retornar undefined se não houver mutações", async () => {
      const next = await getNextPendingMutation();
      expect(next).toBeUndefined();
    });
  });
});
