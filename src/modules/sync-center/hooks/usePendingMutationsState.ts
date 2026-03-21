import { useEffect, useState } from "react";
import type { PendingMutation } from "../../core/types";
import {
  getPendingMutations,
  getPermanentFailures,
  getTemporaryFailures,
  resetMutationRetry,
  deletePendingMutation,
  bulkResetMutationRetry,
  bulkDeletePendingMutations,
} from "../../../lib/mutationQueue";

export type MutationStatus = "pending" | "temporary-failure" | "permanent-failure";

export function usePendingMutationsState() {
  const [pending, setPending] = useState<PendingMutation[]>([]);
  const [permanentFailures, setPermanentFailures] = useState<PendingMutation[]>([]);
  const [temporaryFailures, setTemporaryFailures] = useState<PendingMutation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMutations = async () => {
    setIsLoading(true);
    try {
      const [pendingMutations, permanent, temporary] = await Promise.all([
        getPendingMutations(),
        getPermanentFailures(),
        getTemporaryFailures(),
      ]);
      setPending(pendingMutations);
      setPermanentFailures(permanent);
      setTemporaryFailures(temporary);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMutations();
    // Polling a cada 10 segundos para atualizar estado
    const intervalId = setInterval(loadMutations, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleRetry = async (id: number) => {
    await resetMutationRetry(id);
    await loadMutations();
  };

  const handleRetryAll = async () => {
    const ids = permanentFailures.map((m) => m.id!).filter(Boolean) as number[];
    await bulkResetMutationRetry(ids);
    await loadMutations();
  };

  const handleDelete = async (id: number) => {
    await deletePendingMutation(id);
    await loadMutations();
  };

  const handleDeleteAll = async () => {
    const ids = permanentFailures.map((m) => m.id!).filter(Boolean) as number[];
    await bulkDeletePendingMutations(ids);
    await loadMutations();
  };

  const handleDiscardAll = async () => {
    const ids = pending.map((m) => m.id!).filter(Boolean) as number[];
    await bulkDeletePendingMutations(ids);
    await loadMutations();
  };

  return {
    pending,
    permanentFailures,
    temporaryFailures,
    isLoading,
    stats: {
      total: pending.length,
      permanent: permanentFailures.length,
      temporary: temporaryFailures.length,
    },
    retry: handleRetry,
    retryAll: handleRetryAll,
    delete: handleDelete,
    deleteAll: handleDeleteAll,
    discardAll: handleDiscardAll,
    refresh: loadMutations,
  };
}
