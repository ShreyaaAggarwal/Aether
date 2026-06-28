/**
 * sortEngine.js
 * ----------------------------------------------------------------------
 * Features 4 & 9: single-column sort, and shift-click compound multi-column
 * sort with a visible priority order (1st key, 2nd key, 3rd key...).
 *
 * SORT STATE SHAPE:
 *   sortKeys: Array<{ field: string, direction: 'asc' | 'desc' }>
 * Index 0 = primary key, index 1 = tiebreaker, etc. Shift-clicking a column
 * that's already in the list flips its direction in place; shift-clicking a
 * new column appends it; a plain click (no shift) resets the list to just
 * that one column.
 *
 * STABILITY:
 * Array.prototype.sort is stable per the ES2019 spec in every modern engine,
 * so a simple compound comparator already gives us "stable ordering" for
 * free — rows that tie on every active key keep their relative array order
 * across re-sorts, which matters because dataStream.js mutates row identity
 * every 200ms and we don't want jitter on ties.
 */

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function compareValues(a, b, field) {
  const av = a[field];
  const bv = b[field];

  if (typeof av === 'number' && typeof bv === 'number') {
    return av - bv;
  }
  // string/categorical compare (handles country, industry, automation_type, etc.)
  return collator.compare(String(av ?? ''), String(bv ?? ''));
}

/** Builds a single compound comparator from an ordered list of sort keys. */
export function buildComparator(sortKeys) {
  if (!sortKeys || sortKeys.length === 0) return null;

  return (a, b) => {
    for (const { field, direction } of sortKeys) {
      const cmp = compareValues(a, b, field);
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0; // fully tied — stable sort preserves prior order
  };
}

/** Pure: returns a NEW sorted array, never mutates the input. */
export function applySort(rows, sortKeys) {
  const comparator = buildComparator(sortKeys);
  if (!comparator) return rows;
  return [...rows].sort(comparator);
}

/**
 * Reducer-style helper for click/shift-click handling on a column header.
 * Returns the next sortKeys array.
 */
export function nextSortKeys(currentSortKeys, field, isShiftClick) {
  const existingIndex = currentSortKeys.findIndex((k) => k.field === field);

  if (!isShiftClick) {
    // Plain click: if it's already the sole/primary key, flip direction;
    // otherwise reset to a fresh single-key sort ascending.
    if (currentSortKeys.length === 1 && existingIndex === 0) {
      return [{ field, direction: currentSortKeys[0].direction === 'asc' ? 'desc' : 'asc' }];
    }
    return [{ field, direction: 'asc' }];
  }

  // Shift-click: multi-column compound sort
  if (existingIndex === -1) {
    return [...currentSortKeys, { field, direction: 'asc' }];
  }
  const updated = [...currentSortKeys];
  updated[existingIndex] = {
    field,
    direction: updated[existingIndex].direction === 'asc' ? 'desc' : 'asc',
  };
  return updated;
}