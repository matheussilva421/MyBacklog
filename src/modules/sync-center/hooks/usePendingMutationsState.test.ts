import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePendingMutationsState } from "./usePendingMutationsState";

// Mock do módulo mutationQueue
vi.mock("../../../lib/mutationQueue", async () => {
  const actual = await import("../../../lib/mutationQueue");
  return {
    ...actual,
    getPendingMutations: vi.fn(),
    getPermanentFailures: vi.fn(),
    getTemporaryFailures: vi.fn(),
    resetMutationRetry: vi.fn(),
    deletePendingMutation: vi.fn(),
    bulkResetMutationRetry: vi.fn(),
    bulkDeletePendingMutations: vi.fn(),
  };
});

const mockMutationQueue = await import("../../../lib/mutationQueue");

describe("usePendingMutationsState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar mutações pendentes no mount", async () => {
    vi.spyOn(mockMutationQueue, "getPendingMutations").mockResolvedValue([
      {
        id: 1,
        uuid: "uuid-1",
        entityType: "game",
        mutationType: "create",
        payload: "{}",
        createdAt: "2026-03-21",
        retryCount: 0,
      } as any,
    ]);
    vi.spyOn(mockMutationQueue, "getPermanentFailures").mockResolvedValue([]);
    vi.spyOn(mockMutationQueue, "getTemporaryFailures").mockResolvedValue([]);

    const { result } = renderHook(() => usePendingMutationsState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pending).toHaveLength(1);
    expect(result.current.stats.total).toBe(1);
  });

  it("deve carregar falhas permanentes e temporárias", async () => {
    vi.spyOn(mockMutationQueue, "getPendingMutations").mockResolvedValue([]);
    vi.spyOn(mockMutationQueue, "getPermanentFailures").mockResolvedValue([
      {
        id: 2,
        uuid: "uuid-2",
        entityType: "playSession",
        mutationType: "update",
        payload: "{}",
        createdAt: "2026-03-20",
        retryCount: 5,
      } as any,
    ]);
    vi.spyOn(mockMutationQueue, "getTemporaryFailures").mockResolvedValue([
      {
        id: 3,
        uuid: "uuid-3",
        entityType: "review",
        mutationType: "delete",
        payload: "{}",
        createdAt: "2026-03-19",
        retryCount: 2,
      } as any,
    ]);

    const { result } = renderHook(() => usePendingMutationsState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.permanentFailures).toHaveLength(1);
    expect(result.current.temporaryFailures).toHaveLength(1);
    expect(result.current.stats.permanent).toBe(1);
    expect(result.current.stats.temporary).toBe(1);
  });

  it("deve chamar retry ao chamar handleRetry", async () => {
    vi.spyOn(mockMutationQueue, "resetMutationRetry").mockResolvedValue();
    vi.spyOn(mockMutationQueue, "getPendingMutations").mockResolvedValue([
      {
        id: 1,
        uuid: "uuid-1",
        entityType: "game",
        mutationType: "create",
        payload: "{}",
        createdAt: "2026-03-21",
        retryCount: 3,
      } as any,
    ]);
    vi.spyOn(mockMutationQueue, "getPermanentFailures").mockResolvedValue([]);
    vi.spyOn(mockMutationQueue, "getTemporaryFailures").mockResolvedValue([]);

    const { result } = renderHook(() => usePendingMutationsState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.retry(1);

    expect(mockMutationQueue.resetMutationRetry).toHaveBeenCalledWith(1);
    expect(mockMutationQueue.getPendingMutations).toHaveBeenCalledTimes(2);
  });

  it("deve chamar retryAll ao chamar handleRetryAll", async () => {
    vi.spyOn(mockMutationQueue, "bulkResetMutationRetry").mockResolvedValue();
    vi.spyOn(mockMutationQueue, "getPermanentFailures").mockResolvedValue([
      { id: 1, uuid: "uuid-1", entityType: "game", mutationType: "create", payload: "{}", createdAt: "2026-03-21", retryCount: 5 } as any,
      { id: 2, uuid: "uuid-2", entityType: "review", mutationType: "update", payload: "{}", createdAt: "2026-03-20", retryCount: 5 } as any,
    ]);
    vi.spyOn(mockMutationQueue, "getPendingMutations").mockResolvedValue([]);
    vi.spyOn(mockMutationQueue, "getTemporaryFailures").mockResolvedValue([]);

    const { result } = renderHook(() => usePendingMutationsState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.retryAll();

    expect(mockMutationQueue.bulkResetMutationRetry).toHaveBeenCalledWith([1, 2]);
  });

  it("deve chamar delete ao chamar handleDelete", async () => {
    vi.spyOn(mockMutationQueue, "deletePendingMutation").mockResolvedValue();
    vi.spyOn(mockMutationQueue, "getPendingMutations").mockResolvedValue([
      {
        id: 1,
        uuid: "uuid-1",
        entityType: "game",
        mutationType: "create",
        payload: "{}",
        createdAt: "2026-03-21",
        retryCount: 0,
      } as any,
    ]);
    vi.spyOn(mockMutationQueue, "getPermanentFailures").mockResolvedValue([]);
    vi.spyOn(mockMutationQueue, "getTemporaryFailures").mockResolvedValue([]);

    const { result } = renderHook(() => usePendingMutationsState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.delete(1);

    expect(mockMutationQueue.deletePendingMutation).toHaveBeenCalledWith(1);
  });

  it("deve chamar deleteAll ao chamar handleDeleteAll", async () => {
    vi.spyOn(mockMutationQueue, "bulkDeletePendingMutations").mockResolvedValue();
    vi.spyOn(mockMutationQueue, "getPermanentFailures").mockResolvedValue([
      { id: 1, uuid: "uuid-1", entityType: "game", mutationType: "create", payload: "{}", createdAt: "2026-03-21", retryCount: 5 } as any,
    ]);
    vi.spyOn(mockMutationQueue, "getPendingMutations").mockResolvedValue([]);
    vi.spyOn(mockMutationQueue, "getTemporaryFailures").mockResolvedValue([]);

    const { result } = renderHook(() => usePendingMutationsState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.deleteAll();

    expect(mockMutationQueue.bulkDeletePendingMutations).toHaveBeenCalledWith([1]);
  });

  it("deve chamar discardAll ao chamar handleDiscardAll", async () => {
    vi.spyOn(mockMutationQueue, "bulkDeletePendingMutations").mockResolvedValue();
    vi.spyOn(mockMutationQueue, "getPendingMutations").mockResolvedValue([
      { id: 1, uuid: "uuid-1", entityType: "game", mutationType: "create", payload: "{}", createdAt: "2026-03-21", retryCount: 0 } as any,
      { id: 2, uuid: "uuid-2", entityType: "review", mutationType: "update", payload: "{}", createdAt: "2026-03-20", retryCount: 0 } as any,
    ]);
    vi.spyOn(mockMutationQueue, "getPermanentFailures").mockResolvedValue([]);
    vi.spyOn(mockMutationQueue, "getTemporaryFailures").mockResolvedValue([]);

    const { result } = renderHook(() => usePendingMutationsState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.discardAll();

    expect(mockMutationQueue.bulkDeletePendingMutations).toHaveBeenCalledWith([1, 2]);
  });
});
