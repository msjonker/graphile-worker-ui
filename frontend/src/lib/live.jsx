import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';

const LiveContext = createContext(null);

export const REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
];

// Global live-refresh coordinator: a single interval drives a monotonically
// increasing `nonce` that data hooks watch. Auto-pauses when the tab is hidden.
export function LiveRefreshProvider({ children }) {
  const [intervalMs, setIntervalMs] = useState(() => {
    const raw = localStorage.getItem('gw-refresh');
    if (raw == null) return 5000;
    const saved = Number(raw);
    return Number.isFinite(saved) && saved >= 0 ? saved : 5000;
  });
  const [hidden, setHidden] = useState(document.hidden);
  const [nonce, setNonce] = useState(0);
  const savedInterval = useRef(intervalMs);

  useEffect(() => {
    savedInterval.current = intervalMs;
    try {
      localStorage.setItem('gw-refresh', String(intervalMs));
    } catch {}
  }, [intervalMs]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const live = intervalMs > 0 && !hidden;

  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => setNonce((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [live, intervalMs]);

  const refreshNow = useCallback(() => setNonce((n) => n + 1), []);

  return (
    <LiveContext.Provider value={{ intervalMs, setIntervalMs, live, hidden, nonce, refreshNow }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  return useContext(LiveContext);
}
