import { memo, useMemo } from 'react';
import { useVirtualizedWindow } from '../../hooks/useVirtualizedWindow.js';
import { GridHeader } from './GridHeader.jsx';
import { GridRow } from './GridRow.jsx';
import { ROW_HEIGHT } from './gridConstants.js';

export const VirtualizedGrid = memo(function VirtualizedGrid({
  rows,
  sortKeys,
  onSort,
  selectedRowId,
  onRowClick,
  highlightsByRowId,
  isPaused,
}) {
  const { containerRef, handleScroll, firstIndex, windowSize, totalHeight, offsetY } =
    useVirtualizedWindow({ totalRows: rows.length, rowHeight: ROW_HEIGHT, overscan: 8 });

  const visibleSlice = useMemo(
    () => rows.slice(firstIndex, firstIndex + windowSize),
    [rows, firstIndex, windowSize]
  );

  return (
    <div className="virtualized-grid">
      <GridHeader sortKeys={sortKeys} onSort={onSort} />

      <div
        className="virtualized-grid__scroller"
        ref={containerRef}
        onScroll={handleScroll}
        role="rowgroup"
        aria-rowcount={rows.length}
      >
        {/* 
          FIX: The spacer establishes the true scrollable height so the
          browser scrollbar thumb is correctly sized for N rows.
          The window div is position:absolute inside it, translated to
          the correct offset — only windowSize (~30-60) DOM nodes exist.
        */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translate3d(0, ${offsetY}px, 0)` }}>
            {visibleSlice.map((row, i) => (
              <GridRow
                // FIX: key by SLOT INDEX not row.project_id.
                // Keying by project_id tells React "this is a unique persistent
                // component" — as rows scroll in/out, React unmounts the old
                // component and mounts a brand new one for the new project_id.
                // With 23,000 rows that means 23,000 mount operations and 23,000
                // live DOM nodes simultaneously = 523MB heap + 25fps.
                //
                // Keying by slot index (0..windowSize-1) tells React "this slot
                // is permanent, just update its props." React reuses the same
                // DOM node, memo's comparator runs, and if row reference hasn't
                // changed the DOM is not touched at all. This is what makes it
                // O(windowSize) instead of O(totalRows).
                key={firstIndex + i}
                row={row}
                rowHeight={ROW_HEIGHT}
                offsetY={i * ROW_HEIGHT}
                isSelected={row.project_id === selectedRowId}
                isStale={isPaused}
                highlightRanges={highlightsByRowId?.get(row.project_id)}
                onClick={() => onRowClick(row)}
              />
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="virtualized-grid__empty">
          No telemetry rows match the active filters and search query.
        </div>
      )}
    </div>
  );
});