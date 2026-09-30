import { useCallback, useEffect, useState } from "react";
import type { ApiResult } from "../api";

export type Resource<T> = {
  data: T | null;
  // API error code of the last failed load; null while loading or after success.
  error: string | null;
  loading: boolean;
  reload: () => void;
  // Replace the data after a mutation returned the new state, without refetching.
  setData: (data: T) => void;
};

// Loads once on mount and whenever `load` changes — so `load` must be memoised with
// useCallback, or every render refetches (docs/architecture.md).
export function useResource<T>(load: () => Promise<ApiResult<T>>): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void load().then((result) => {
      if (cancelled) return;
      if (result.ok) setData(result.data);
      else setError(result.code);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}
