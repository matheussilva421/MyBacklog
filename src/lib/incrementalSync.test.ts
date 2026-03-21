import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("firebase/firestore", () => {
  const mockSetDoc = vi.fn();
  const mockGetDoc = vi.fn();
  const mockUpdateDoc = vi.fn();
  const mockDeleteDoc = vi.fn();
  const mockGetDocs = vi.fn();
  const mockCollection = vi.fn().mockReturnValue({ id: "mock-collection" });
  const mockDoc = vi.fn().mockReturnValue({ id: "mock-doc-ref" });
  const mockQuery = vi.fn().mockReturnValue({ id: "mock-query" });
  const mockWhere = vi.fn().mockReturnValue({ id: "mock-where-query" });

  const mockTimestamp = {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    now: vi.fn(() => ({ toDate: () => new Date() })),
  };

  return {
    __esModule: true,
    collection: mockCollection,
    doc: mockDoc,
    getDoc: mockGetDoc,
    setDoc: mockSetDoc,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    getDocs: mockGetDocs,
    query: mockQuery,
    where: mockWhere,
    Timestamp: mockTimestamp,
    // Export mocks para teste
    mockSetDoc,
    mockGetDoc,
    mockUpdateDoc,
    mockDeleteDoc,
    mockGetDocs,
    mockCollection,
    mockDoc,
    mockQuery,
    mockWhere,
    mockTimestamp,
  };
});

vi.mock("./firebase", () => ({
  cloudDb: {},
}));

// Import após mocks
import {
  pushEntityToCloud,
  pullEntitiesFromCloud,
  deleteEntityInCloud,
  hardDeleteEntityInCloud,
  batchPushEntitiesToCloud,
  getLastSyncTimestamp,
  updateLastSyncTimestamp,
} from "./incrementalSync";

// Import dos mocks
const firestoreMocks = await import("firebase/firestore");

describe("incrementalSync", () => {
  const mockUid = "test-user-123";
  const mockEntity = {
    uuid: "entity-uuid-1",
    version: 1,
    updatedAt: "2026-03-21T12:00:00.000Z",
    createdAt: "2026-03-21T10:00:00.000Z",
    deletedAt: null,
    name: "Test Entity",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("pushEntityToCloud", () => {
    it("deve fazer push de uma entidade para o Firestore", async () => {
      firestoreMocks.mockSetDoc.mockResolvedValue(undefined);

      await pushEntityToCloud(mockUid, "games", mockEntity);

      expect(firestoreMocks.mockSetDoc).toHaveBeenCalledTimes(1);
      const callArgs = firestoreMocks.mockSetDoc.mock.calls[0];
      expect(callArgs[1]).toEqual(
        expect.objectContaining({
          uuid: mockEntity.uuid,
          version: mockEntity.version,
          name: mockEntity.name,
        }),
      );
      expect(callArgs[2]).toEqual({ merge: true });
    });
  });

  describe("pullEntitiesFromCloud", () => {
    it("deve fazer pull de entidades sem filtro de tempo", async () => {
      const mockSnap = {
        docs: [
          {
            id: "entity-1",
            data: () => ({
              name: "Entity 1",
              version: 1,
              updatedAt: firestoreMocks.mockTimestamp.fromDate(new Date("2026-03-21T12:00:00.000Z")),
            }),
          },
        ],
      };
      firestoreMocks.mockGetDocs.mockResolvedValue(mockSnap);

      const result = await pullEntitiesFromCloud(mockUid, "games");

      expect(result.length).toBe(1);
      expect(result[0].uuid).toBe("entity-1");
    });

    it("deve converter timestamps do Firestore para ISO string", async () => {
      const mockSnap = {
        docs: [
          {
            id: "entity-1",
            data: () => ({
              name: "Entity 1",
              version: 1,
              updatedAt: firestoreMocks.mockTimestamp.fromDate(new Date("2026-03-21T12:00:00.000Z")),
              createdAt: firestoreMocks.mockTimestamp.fromDate(new Date("2026-03-21T10:00:00.000Z")),
            }),
          },
        ],
      };
      firestoreMocks.mockGetDocs.mockResolvedValue(mockSnap);

      const result = await pullEntitiesFromCloud(mockUid, "games");

      expect(typeof result[0].updatedAt).toBe("string");
      expect(result[0].updatedAt).toBe("2026-03-21T12:00:00.000Z");
    });
  });

  describe("deleteEntityInCloud", () => {
    it("deve marcar entidade como deletada (tombstone)", async () => {
      firestoreMocks.mockUpdateDoc.mockResolvedValue(undefined);

      const deletedAt = "2026-03-21T15:00:00.000Z";
      await deleteEntityInCloud(mockUid, "games", "entity-uuid-1", deletedAt);

      expect(firestoreMocks.mockUpdateDoc).toHaveBeenCalledTimes(1);
      const callArgs = firestoreMocks.mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toEqual(
        expect.objectContaining({
          deletedAt: expect.any(Object),
          updatedAt: expect.any(Object),
        }),
      );
    });
  });

  describe("hardDeleteEntityInCloud", () => {
    it("deve remover entidade permanentemente", async () => {
      firestoreMocks.mockDeleteDoc.mockResolvedValue(undefined);

      await hardDeleteEntityInCloud(mockUid, "games", "entity-uuid-1");

      expect(firestoreMocks.mockDeleteDoc).toHaveBeenCalledTimes(1);
      expect(firestoreMocks.mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe("batchPushEntitiesToCloud", () => {
    it("deve fazer push de múltiplas entidades em lotes", async () => {
      firestoreMocks.mockSetDoc.mockResolvedValue(undefined);

      const entities = [
        { ...mockEntity, uuid: "uuid-1", name: "Entity 1" },
        { ...mockEntity, uuid: "uuid-2", name: "Entity 2" },
        { ...mockEntity, uuid: "uuid-3", name: "Entity 3" },
      ];

      await batchPushEntitiesToCloud(mockUid, "games", entities, 2);

      expect(firestoreMocks.mockSetDoc).toHaveBeenCalledTimes(3);
    });
  });

  describe("getLastSyncTimestamp / updateLastSyncTimestamp", () => {
    it("deve retornar null se não houver metadata de sync", async () => {
      firestoreMocks.mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getLastSyncTimestamp(mockUid, "games");

      expect(result).toBe(null);
    });

    it("deve retornar timestamp salvo", async () => {
      const mockTimestampDate = new Date("2026-03-21T12:00:00.000Z");
      firestoreMocks.mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          lastSyncAt: firestoreMocks.mockTimestamp.fromDate(mockTimestampDate),
        }),
      });

      const result = await getLastSyncTimestamp(mockUid, "games");

      expect(result).toBe("2026-03-21T12:00:00.000Z");
    });

    it("deve atualizar timestamp de sync", async () => {
      firestoreMocks.mockSetDoc.mockResolvedValue(undefined);

      const now = "2026-03-21T15:00:00.000Z";
      await updateLastSyncTimestamp(mockUid, "games", now);

      expect(firestoreMocks.mockSetDoc).toHaveBeenCalledTimes(1);
      const callArgs = firestoreMocks.mockSetDoc.mock.calls[0];
      expect(callArgs[1]).toEqual(
        expect.objectContaining({
          lastSyncAt: expect.any(Object),
          updatedAt: expect.any(Object),
        }),
      );
      expect(callArgs[2]).toEqual({ merge: true });
    });
  });
});
