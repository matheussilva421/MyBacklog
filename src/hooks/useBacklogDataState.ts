import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyBacklogDataSnapshot,
  readBacklogDataSnapshot,
} from "../services/backlogRepository";

export function useBacklogDataState() {
  const [snapshot, setSnapshot] = useState(emptyBacklogDataSnapshot);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isMountedRef = useRef(true);
  const refreshRequestRef = useRef(0);

  const refreshData = useCallback(async (seed = false) => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;

    const nextSnapshot = await readBacklogDataSnapshot(seed);
    if (!isMountedRef.current || requestId !== refreshRequestRef.current) return;

    setSnapshot(nextSnapshot);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      refreshRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await refreshData(true);
      } catch {
        if (active) setNotice("Falha ao carregar a biblioteca local.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshData]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return useMemo(
    () => ({
      ...snapshot,
      loading,
      notice,
      submitting,
      setLoading,
      setNotice,
      setSubmitting,
      refreshData,
    }),
    [loading, notice, refreshData, snapshot, submitting],
  );
}
