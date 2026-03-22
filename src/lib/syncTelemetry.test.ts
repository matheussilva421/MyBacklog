import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  logSyncFailure,
  resolveSyncFailure,
  getSyncFailureStats,
  purgeOldSyncFailureEvents,
  type SyncFailureEvent,
} from "./syncTelemetry";
import { db } from "../core/db";

// Mock do db.settings
vi.mock("../core/db", () => ({
  db: {
    transaction: vi.fn(async (...args: unknown[]) => {
      const fn = args[args.length - 1];
      return await fn();
    }),
    settings: {
      get: vi.fn(),
      put: vi.fn(),
    },
  },
}));

const mockDb = db as {
  transaction: ReturnType<typeof vi.fn>;
  settings: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
};

describe("syncTelemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("logSyncFailure", () => {
    it("deve logar uma nova falha de sync", async () => {
      mockDb.settings.get.mockResolvedValue(null);

      await logSyncFailure(1, "game", "create", new Error("Network error"), 2);

      expect(mockDb.settings.put).toHaveBeenCalledWith({
        key: "syncFailureEvents",
        value: expect.any(String),
        updatedAt: expect.any(String),
      });

      const putCall = mockDb.settings.put.mock.calls[0][0];
      const events = JSON.parse(putCall.value) as SyncFailureEvent[];
      expect(events).toHaveLength(1);
      expect(events[0].mutationId).toBe(1);
      expect(events[0].entityType).toBe("game");
      expect(events[0].mutationType).toBe("create");
      expect(events[0].errorCode).toBe("Error");
      expect(events[0].errorMessage).toBe("Network error");
      expect(events[0].retryCount).toBe(2);
    });

    it("deve adicionar falha à lista existente e manter apenas 100", async () => {
      const existingEvents = Array.from({ length: 100 }, (_, i) => ({
        mutationId: i,
        entityType: "game" as const,
        mutationType: "create" as const,
        errorCode: "Error",
        errorMessage: "Error message",
        retryCount: 0,
        timestamp: new Date().toISOString(),
      }));

      mockDb.settings.get.mockResolvedValue({
        key: "syncFailureEvents",
        value: JSON.stringify(existingEvents),
      });

      await logSyncFailure(101, "review", "update", new Error("Timeout"), 3);

      const putCall = mockDb.settings.put.mock.calls[0][0];
      const events = JSON.parse(putCall.value) as SyncFailureEvent[];
      expect(events).toHaveLength(100);
      expect(events[0].mutationId).toBe(101); // Nova falha adicionada no início
    });
  });

  describe("resolveSyncFailure", () => {
    it("deve marcar falha como resolvida com success", async () => {
      const existingEvents: SyncFailureEvent[] = [
        {
          mutationId: 1,
          entityType: "game",
          mutationType: "create",
          errorCode: "Error",
          errorMessage: "Network error",
          retryCount: 2,
          timestamp: new Date().toISOString(),
        },
      ];

      mockDb.settings.get.mockResolvedValue({
        key: "syncFailureEvents",
        value: JSON.stringify(existingEvents),
      });

      await resolveSyncFailure(1, "success");

      const putCall = mockDb.settings.put.mock.calls[0][0];
      const events = JSON.parse(putCall.value) as SyncFailureEvent[];
      expect(events[0].resolvedAt).toBeDefined();
      expect(events[0].resolution).toBe("success");
    });

    it("deve retornar sem fazer nada se evento não existir", async () => {
      mockDb.settings.get.mockResolvedValue(null);

      await resolveSyncFailure(999, "discarded");

      expect(mockDb.settings.put).not.toHaveBeenCalled();
    });

    it("deve marcar falha como resolvida com discarded", async () => {
      const existingEvents: SyncFailureEvent[] = [
        {
          mutationId: 1,
          entityType: "review",
          mutationType: "delete",
          errorCode: "Error",
          errorMessage: "Not found",
          retryCount: 5,
          timestamp: new Date().toISOString(),
        },
      ];

      mockDb.settings.get.mockResolvedValue({
        key: "syncFailureEvents",
        value: JSON.stringify(existingEvents),
      });

      await resolveSyncFailure(1, "discarded");

      const putCall = mockDb.settings.put.mock.calls[0][0];
      const events = JSON.parse(putCall.value) as SyncFailureEvent[];
      expect(events[0].resolution).toBe("discarded");
    });
  });

  describe("getSyncFailureStats", () => {
    it("deve retornar stats vazios quando não há eventos", async () => {
      mockDb.settings.get.mockResolvedValue(null);

      const stats = await getSyncFailureStats();

      expect(stats).toEqual({
        totalFailures: 0,
        resolvedFailures: 0,
        pendingFailures: 0,
        failuresByEntityType: {},
        failuresByMutationType: {},
      });
    });

    it("deve calcular stats corretamente", async () => {
      const existingEvents: SyncFailureEvent[] = [
        {
          mutationId: 1,
          entityType: "game",
          mutationType: "create",
          errorCode: "Error",
          errorMessage: "Network error",
          retryCount: 2,
          timestamp: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          resolution: "success",
        },
        {
          mutationId: 2,
          entityType: "review",
          mutationType: "update",
          errorCode: "Error",
          errorMessage: "Timeout",
          retryCount: 3,
          timestamp: new Date().toISOString(),
        },
        {
          mutationId: 3,
          entityType: "game",
          mutationType: "delete",
          errorCode: "Error",
          errorMessage: "Not found",
          retryCount: 5,
          timestamp: new Date().toISOString(),
        },
      ];

      mockDb.settings.get.mockResolvedValue({
        key: "syncFailureEvents",
        value: JSON.stringify(existingEvents),
      });

      const stats = await getSyncFailureStats();

      expect(stats.totalFailures).toBe(3);
      expect(stats.resolvedFailures).toBe(1);
      expect(stats.pendingFailures).toBe(2);
      expect(stats.failuresByEntityType).toEqual({
        game: 2,
        review: 1,
      });
      expect(stats.failuresByMutationType).toEqual({
        create: 1,
        update: 1,
        delete: 1,
      });
    });
  });

  describe("purgeOldSyncFailureEvents", () => {
    it("deve remover eventos mais antigos que 30 dias por padrão", async () => {
      const now = Date.now();
      const oldEvent = {
        mutationId: 1,
        entityType: "game" as const,
        mutationType: "create" as const,
        errorCode: "Error",
        errorMessage: "Old error",
        retryCount: 0,
        timestamp: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString(), // 31 dias atrás
      };

      const recentEvent = {
        mutationId: 2,
        entityType: "review" as const,
        mutationType: "update" as const,
        errorCode: "Error",
        errorMessage: "Recent error",
        retryCount: 1,
        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás
      };

      mockDb.settings.get.mockResolvedValue({
        key: "syncFailureEvents",
        value: JSON.stringify([oldEvent, recentEvent]),
      });

      const removed = await purgeOldSyncFailureEvents();

      expect(removed).toBe(1);
      expect(mockDb.settings.put).toHaveBeenCalledWith({
        key: "syncFailureEvents",
        value: JSON.stringify([recentEvent]),
        updatedAt: expect.any(String),
      });
    });

    it("deve retornar 0 se não há eventos para remover", async () => {
      const recentEvent = {
        mutationId: 1,
        entityType: "game" as const,
        mutationType: "create" as const,
        errorCode: "Error",
        errorMessage: "Recent error",
        retryCount: 0,
        timestamp: new Date().toISOString(),
      };

      mockDb.settings.get.mockResolvedValue({
        key: "syncFailureEvents",
        value: JSON.stringify([recentEvent]),
      });

      const removed = await purgeOldSyncFailureEvents(30);

      expect(removed).toBe(0);
      expect(mockDb.settings.put).not.toHaveBeenCalled();
    });

    it("deve retornar 0 se não há eventos", async () => {
      mockDb.settings.get.mockResolvedValue(null);

      const removed = await purgeOldSyncFailureEvents();

      expect(removed).toBe(0);
    });
  });
});
