import { memo } from 'react';
import { COLUMNS } from './columns.js';

/**
 * GridHeader
 * ----------------------------------------------------------------------
 * Features 4 + 9. Plain click → single-column sort. Shift-click → append/
 * flip within a compound multi-column sort. The small superscript number
 * next to the arrow shows sort PRIORITY (1 = primary key) when more than
 * one column is active, satisfying "priority indicators."
 */
export const GridHeader = memo(function GridHeader({ sortKeys, onSort }) {
  return (
    <div className="grid-header" role="row">
      {COLUMNS.map((col) => {
        const sortIndex = sortKeys.findIndex((k) => k.field === col.field);
        const isSorted = sortIndex !== -1;
        const direction = isSorted ? sortKeys[sortIndex].direction : null;

        return (
          <div
            key={col.field}
            role="columnheader"
            className={`grid-header__cell ${col.align === 'right' ? 'grid-header__cell--right' : ''} ${isSorted ? 'grid-header__cell--sorted' : ''}`}
            style={{ width: col.width }}
            onClick={col.sortable ? (e) => onSort(col.field, e.shiftKey) : undefined}
            tabIndex={col.sortable ? 0 : -1}
            onKeyDown={
              col.sortable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSort(col.field, e.shiftKey);
                  }
                : undefined
            }
            aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            <span>{col.label}</span>
            {isSorted && (
              <span className="grid-header__sort-indicator">
                <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>
                {sortKeys.length > 1 && <sup>{sortIndex + 1}</sup>}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});