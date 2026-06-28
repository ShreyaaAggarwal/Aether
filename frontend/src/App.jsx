import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useStreamEngine } from './hooks/useStreamEngine.js';
import { useWorkspace } from './hooks/useWorkspace.js';
import { applySort, nextSortKeys } from './engines/sortEngine.js';
import { buildHaystack, tokenize, matchesAllTokens, computeHighlightRanges } from './engines/searchEngine.js';
import { createEmptyFilterState, toggleFilterValue, clearFilterField, clearAllFilters, rowPassesFilters, getDistinctValues, FILTERABLE_FIELDS } from './engines/filterEngine.js';
import { reconcileAlerts } from './engines/alertEngine.js';

import { AmbientGrid } from './components/layout/AmbientGrid.jsx';
import { GlobalHeader } from './components/layout/GlobalHeader.jsx';
import { PauseControl } from './components/layout/PauseControl.jsx';
import { KpiRibbon } from './components/kpi/KpiRibbon.jsx';
import { AlertStack } from './components/alerts/AlertStack.jsx';
import { SearchBar } from './components/filters/SearchBar.jsx';
import { MultiSelectDropdown } from './components/filters/MultiSelectDropdown.jsx';
import { VirtualizedGrid } from './components/grid/VirtualizedGrid.jsx';
import { InspectorPanel } from './components/inspector/InspectorPanel.jsx';
import { FooterDiagnostics } from './components/footer/FooterDiagnostics.jsx';
import { WorkspaceToggleBar } from './components/panels/WorkspaceToggleBar.jsx';

const FILTER_LABELS = {
  automation_type: 'Automation Type',
  department: 'Department',
  industry: 'Industry',
  project_status: 'Status',
};

const DEFAULT_SORT_KEYS = [{ field: 'annual_savings_usd', direction: 'desc' }];

// CSV column order for export — matches the grid's visible columns.
const EXPORT_FIELDS = [
  'project_id',
  'project_name',
  'company_id',
  'project_status',
  'automation_type',
  'robots_deployed',
  'budget_usd',
  'annual_savings_usd',
  'roi_percent',
  'employee_hours_saved',
  'department',
  'industry',
  'implementation_partner',
  'country',
  'start_date',
];

/**
 * Serializes `rows` (already filtered + sorted) into a CSV string and
 * triggers a browser download. Runs inside requestIdleCallback so it
 * never blocks the streaming RAF loop or React's commit phase.
 *
 * WHY NOT A WEB WORKER:
 * The data is already a plain JS array in the main thread. Transferring
 * 50k rows to a worker via postMessage involves structured-clone cost that
 * exceeds the serialization cost itself for this data size. requestIdleCallback
 * yields to the browser between the build and the download trigger, which
 * is sufficient to keep the stream uninterrupted.
 */
function exportSnapshot(rows, sortKeys, searchQuery) {
  const idleCallback = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 0); // Safari fallback

  idleCallback(() => {
    // Build header row.
    const header = EXPORT_FIELDS.join(',');

    // Build data rows. We escape each cell value to handle commas and quotes
    // inside field values (e.g. project names with commas).
    const csvRows = rows.map((row) =>
      EXPORT_FIELDS.map((field) => {
        const val = row[field] ?? '';
        const str = String(val);
        // RFC 4180: wrap in quotes if value contains comma, quote, or newline.
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );

    const csv = [header, ...csvRows].join('\n');

    // Build filename: timestamp + active filter/search context.
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const queryPart = searchQuery ? `_q-${searchQuery.trim().replace(/\s+/g, '-').slice(0, 20)}` : '';
    const sortPart = sortKeys.length > 0 ? `_sort-${sortKeys[0].field}` : '';
    const filename = `rpa-snapshot_${ts}${queryPart}${sortPart}_${rows.length}rows.csv`;

    // Trigger download via a temporary Blob URL — fully client-side, no server.
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    // Clean up — revoke the object URL after a short delay so the browser
    // has time to initiate the download before we release the reference.
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    }, 1000);
  });
}

export default function App() {
  const { version, isPaused, queueDepth, isReady, lastEvent, togglePause, engine } = useStreamEngine();
  const { panels, togglePanel, resetWorkspace } = useWorkspace();

  const [sortKeys, setSortKeys] = useState(DEFAULT_SORT_KEYS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState(createEmptyFilterState);
  const [selectedRow, setSelectedRow] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const lastTickAtRef = useRef(performance.now());

  const allRows = useMemo(() => engine.getAllRows(), [engine, version]);

  useEffect(() => {
    lastTickAtRef.current = performance.now();
  }, [version]);

  useEffect(() => {
    if (!lastEvent || lastEvent.type === 'buffering') return;
    const changedKeys = lastEvent.changedKeys || [];
    const changedRows = changedKeys.map((k) => engine.getRow(k)).filter(Boolean);
    setAlerts((prev) => reconcileAlerts(prev, changedRows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  const filterOptions = useMemo(() => {
    const opts = {};
    for (const field of FILTERABLE_FIELDS) opts[field] = getDistinctValues(allRows, field);
    return opts;
  }, [allRows]);

  const haystacks = useMemo(() => {
    const map = new Map();
    for (const row of allRows) map.set(row.project_id, buildHaystack(row));
    return map;
  }, [allRows]);

  const searchTokens = useMemo(() => tokenize(searchQuery), [searchQuery]);

  const filteredRows = useMemo(
    () => allRows.filter((row) => rowPassesFilters(row, filterState)),
    [allRows, filterState]
  );

  const searchedRows = useMemo(() => {
    if (searchTokens.length === 0) return filteredRows;
    return filteredRows.filter((row) => {
      const entry = haystacks.get(row.project_id);
      return entry && matchesAllTokens(entry.haystack, searchTokens);
    });
  }, [filteredRows, searchTokens, haystacks]);

  const visibleRows = useMemo(() => applySort(searchedRows, sortKeys), [searchedRows, sortKeys]);

  const highlightsByRowId = useMemo(() => {
    if (searchTokens.length === 0) return null;
    const map = new Map();
    for (const row of visibleRows) {
      const entry = haystacks.get(row.project_id);
      if (entry) map.set(row.project_id, computeHighlightRanges(entry, searchTokens));
    }
    return map;
  }, [visibleRows, searchTokens, haystacks]);

  const kpis = useMemo(() => {
    let totalRobots = 0;
    let totalSavings = 0;
    for (const row of allRows) {
      totalRobots += Math.max(0, Number(row.robots_deployed) || 0);
      totalSavings += Math.max(0, Number(row.annual_savings_usd) || 0);
    }
    return {
      totalRowsStreamed: engine.getStats().totalRowsStreamed,
      totalRobotsDeployed: totalRobots,
      totalSavings,
    };
  }, [allRows, engine, version]);

  const handleSort = useCallback((field, isShift) => {
    setSortKeys((prev) => nextSortKeys(prev, field, isShift));
  }, []);

  const handleRowClick = useCallback(
    (row) => {
      if (!isPaused) return;
      setSelectedRow(row);
    },
    [isPaused]
  );

  const handleNavigate = useCallback((nextRow) => setSelectedRow(nextRow), []);
  const handleCloseInspector = useCallback(() => setSelectedRow(null), []);

  const handlePinAlert = useCallback((id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)));
  }, []);

  const handleDismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setFilterState(createEmptyFilterState());
    setSortKeys(DEFAULT_SORT_KEYS);
    setSelectedRow(null);
    setAlerts([]);
    resetWorkspace();
  }, [resetWorkspace]);

  // Export handler: snapshots the current visibleRows (already filtered +
  // sorted) and delegates to exportSnapshot which runs inside
  // requestIdleCallback — zero impact on the live stream or React renders.
  const handleExport = useCallback(() => {
    // Snapshot the array reference at click time — if the stream ticks
    // during the idle callback, the exported data reflects what the operator
    // saw when they clicked, not a later mutation.
    const snapshot = visibleRows;
    exportSnapshot(snapshot, sortKeys, searchQuery);
  }, [visibleRows, sortKeys, searchQuery]);

  if (!isReady) {
    return (
      <div className="boot-screen">
        <AmbientGrid />
        <div className="boot-screen__content">
          <span className="boot-screen__mark">Aether</span>
          <span className="boot-screen__status mono">Establishing telemetry link…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AmbientGrid />

      <GlobalHeader isPaused={isPaused} lastTickAgoMs={performance.now() - lastTickAtRef.current} />

      {panels.kpiRibbon && (
        <KpiRibbon
          totalRowsStreamed={kpis.totalRowsStreamed}
          totalRobotsDeployed={kpis.totalRobotsDeployed}
          totalSavings={kpis.totalSavings}
        />
      )}

      <div className="command-toolbar">
        <PauseControl isPaused={isPaused} queueDepth={queueDepth} onToggle={togglePause} />
        {panels.filterBar && (
          <>
            <SearchBar value={searchQuery} onChange={setSearchQuery} resultCount={visibleRows.length} />
            <div className="filter-row">
              {FILTERABLE_FIELDS.map((field) => (
                <MultiSelectDropdown
                  key={field}
                  label={FILTER_LABELS[field]}
                  options={filterOptions[field]}
                  selected={filterState[field]}
                  onToggle={(value) => setFilterState((prev) => toggleFilterValue(prev, field, value))}
                  onClear={() => setFilterState((prev) => clearFilterField(prev, field))}
                />
              ))}
              <button className="filter-row__clear-all" onClick={() => setFilterState(clearAllFilters())}>
                Clear All
              </button>
            </div>
          </>
        )}
        <WorkspaceToggleBar
          panels={panels}
          onToggle={togglePanel}
          onReset={handleReset}
          onExport={handleExport}
        />
      </div>

      {panels.alertStack && (
        <AlertStack alerts={alerts} onPin={handlePinAlert} onDismiss={handleDismissAlert} />
      )}

      {panels.grid && (
        <main className="workspace">
          <VirtualizedGrid
            rows={visibleRows}
            sortKeys={sortKeys}
            onSort={handleSort}
            selectedRowId={selectedRow?.project_id}
            onRowClick={handleRowClick}
            highlightsByRowId={highlightsByRowId}
            isPaused={isPaused}
          />
        </main>
      )}

      {panels.footerDiagnostics && (
        <FooterDiagnostics
          totalTicks={engine.getStats().totalTicks}
          visibleRowCount={visibleRows.length}
          totalRowCount={allRows.length}
          queueDepth={queueDepth}
          isPaused={isPaused}
        />
      )}

      {selectedRow && (
        <InspectorPanel
          row={selectedRow}
          rows={visibleRows}
          onClose={handleCloseInspector}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}