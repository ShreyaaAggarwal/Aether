import { useState, useCallback, useEffect } from 'react';

/**
 * useWorkspace
 * ----------------------------------------------------------------------
 * Feature 6: panel visibility persisted to localStorage. A hard refresh
 * must restore the exact same set of visible/hidden panels.
 *
 * We store a flat { [panelId]: boolean } map under one key (rather than
 * one localStorage key per panel) — fewer storage round-trips, and it
 * makes "reset workspace" a single write instead of N deletes.
 */
const STORAGE_KEY = 'rpa-monitor:workspace:v1';

export const DEFAULT_PANELS = {
  kpiRibbon: true,
  alertStack: true,
  filterBar: true,
  grid: true,
  footerDiagnostics: true,
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PANELS;
    const parsed = JSON.parse(raw);
    // merge with defaults so a future new panel always appears, even for
    // returning users with an older saved blob
    return { ...DEFAULT_PANELS, ...parsed };
  } catch {
    return DEFAULT_PANELS;
  }
}

export function useWorkspace() {
  const [panels, setPanels] = useState(loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
    } catch {
      // storage unavailable (private browsing / quota) — fail silently,
      // workspace just won't persist this session
    }
  }, [panels]);

  const togglePanel = useCallback((panelId) => {
    setPanels((prev) => ({ ...prev, [panelId]: !prev[panelId] }));
  }, []);

  const resetWorkspace = useCallback(() => {
    setPanels(DEFAULT_PANELS);
  }, []);

  return { panels, togglePanel, resetWorkspace };
}