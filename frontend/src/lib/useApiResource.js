import { useEffect, useRef, useState, useCallback } from 'react';
import { useLive } from './live.jsx';

// Fetch a REST resource on mount and whenever the global live nonce advances or
// `deps` change. Retains the previous value while refetching so the UI doesn't
// flicker between polls.
export function useApiResource(fetcher, deps = []) {
  const { nonce } = useLive();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      if (mounted.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) setError(err);
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, nonce, ...deps]);

  return { data, error, loading, refetch: run };
}
