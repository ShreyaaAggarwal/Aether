import { memo } from 'react';
import { COLUMNS } from './columns.js';
import { HighlightedText } from './HighlightedText.jsx';
import { detectAlertCondition } from '../../engines/alertEngine.js';

/**
 * GridRow
 * ----------------------------------------------------------------------
 * This component is mounted ONCE PER VISIBLE SLOT and reused for the
 * lifetime of the grid — useVirtualizedWindow re-binds new `row` data to
 * the same slot as the user scrolls. React.memo means a slot only
 * re-renders if the actual row object reference it's bound to changed (or
 * its position/highlight props changed) — NOT on every parent render.
 *
 * POSITIONING: absolute + translate3d, never top/margin — translate3d is
 * composited on the GPU and never triggers layout/reflow, which is the
 * single biggest lever for hitting 60fps while 500+ rows are present.
 */
export const GridRow = memo(
  function GridRow({ row, offsetY, rowHeight, isSelected, onClick, highlightRanges, isStale }) {
    const alertReason = detectAlertCondition(row);

    return (
      <div
        className={`grid-row ${isSelected ? 'grid-row--selected' : ''} ${alertReason ? `grid-row--alert-${alertReason}` : ''} ${isStale ? 'grid-row--stale' : ''}`}
        style={{ height: rowHeight, transform: `translate3d(0, ${offsetY}px, 0)` }}
        role="row"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onClick();
        }}
        aria-selected={isSelected}
      >
        {COLUMNS.map((col) => {
          const raw = row[col.field];
          const display = col.formatter ? col.formatter(raw) : raw;
          const ranges = highlightRanges?.[col.field];

          return (
            <div
              key={col.field}
              className={`grid-row__cell ${col.mono ? 'mono' : ''} ${col.align === 'right' ? 'grid-row__cell--right' : ''}`}
              style={{ width: col.width }}
              role="cell"
            >
              {col.render === 'status' ? (
                <StatusPill status={display} />
              ) : col.render === 'roi' ? (
                <RoiValue value={raw} display={display} />
              ) : ranges ? (
                <HighlightedText text={String(display)} ranges={ranges} />
              ) : (
                display
              )}
            </div>
          );
        })}
      </div>
    );
  },
  (prev, next) =>
    prev.row === next.row &&
    prev.offsetY === next.offsetY &&
    prev.isSelected === next.isSelected &&
    prev.isStale === next.isStale &&
    prev.highlightRanges === next.highlightRanges
);

function StatusPill({ status }) {
  const cls =
    status === 'Completed' ? 'status-pill--completed' :
    status === 'Failed' ? 'status-pill--failed' :
    status === 'Active' ? 'status-pill--active' :
    'status-pill--default';
  return <span className={`status-pill ${cls}`}>{status}</span>;
}

function RoiValue({ value, display }) {
  const isNegative = Number(value) < 0;
  return <span className={isNegative ? 'roi-value--negative' : 'roi-value--positive'}>{display}</span>;
}