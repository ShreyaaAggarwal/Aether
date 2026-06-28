/**
 * filterEngine.js
 * ----------------------------------------------------------------------
 * Feature 7: multi-choice categorical filters (automation_type, department,
 * industry, project_status). Filter state is a plain object of
 * { [field]: Set<string> } — an empty Set for a field means "no filter
 * applied to this field" (show everything), which keeps the common case
 * (no filters active) a cheap no-op rather than special-cased branches.
 */

export const FILTERABLE_FIELDS = ['automation_type', 'department', 'industry', 'project_status'];

export function createEmptyFilterState() {
  const state = {};
  for (const field of FILTERABLE_FIELDS) state[field] = new Set();
  return state;
}

/** Toggle one value within one field's filter set. Returns a NEW state object. */
export function toggleFilterValue(filterState, field, value) {
  const nextSet = new Set(filterState[field]);
  nextSet.has(value) ? nextSet.delete(value) : nextSet.add(value);
  return { ...filterState, [field]: nextSet };
}

export function clearFilterField(filterState, field) {
  return { ...filterState, [field]: new Set() };
}

export function clearAllFilters() {
  return createEmptyFilterState();
}

export function countActiveFilters(filterState) {
  return Object.values(filterState).reduce((sum, set) => sum + set.size, 0);
}

/** Pure predicate test — true if row passes every active filter field. */
export function rowPassesFilters(row, filterState) {
  for (const field of FILTERABLE_FIELDS) {
    const activeSet = filterState[field];
    if (activeSet.size === 0) continue; // no filter on this field
    if (!activeSet.has(row[field])) return false;
  }
  return true;
}

/**
 * Builds the distinct option list for a single filter field from the full
 * row universe — used to populate dropdown options. Computed once per
 * stream version, not per render, by the caller.
 */
export function getDistinctValues(rows, field) {
  const set = new Set();
  for (const row of rows) {
    if (row[field]) set.add(row[field]);
  }
  return Array.from(set).sort();
}