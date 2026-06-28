/**
 * formatters.js
 * ----------------------------------------------------------------------
 * Centralized numeric sanitation (Feature 2). Every formatter is a pure
 * function with no allocation beyond what Intl.NumberFormat needs — and
 * the Intl formatters themselves are constructed ONCE at module scope,
 * not per-call, since `new Intl.NumberFormat()` is surprisingly expensive
 * and this runs inside a 500-row grid re-rendering every 200ms.
 */

const currencyFull = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const currencyCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const integerFormat = new Intl.NumberFormat('en-US');

const compactInteger = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Full currency string, e.g. $1,069,470 — used in the Inspector where space allows. */
export function formatCurrencyFull(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return currencyFull.format(n);
}

/** Compact currency, e.g. $1.1M — used in dense grid cells / KPI ribbon. */
export function formatCurrencyCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return currencyCompact.format(n);
}

/** Plain integer with thousands separators, e.g. 31,856 */
export function formatInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return integerFormat.format(Math.round(n));
}

/** Compact integer, e.g. 31.9K — used for employee_hours_saved in dense cells. */
export function formatCompactInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return compactInteger.format(n);
}

/**
 * Percent, clamped and rounded to exactly 2 decimal places per spec.
 * roi_percent in the source data can swing negative (a "Failed"-adjacent
 * signal Feature 3 listens for) so we do NOT clamp the lower bound to 0 —
 * "clamp" in the brief means clamp the *decimal precision*, not the sign.
 */
export function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const clamped = Math.max(-9999, Math.min(9999, n)); // guard against absurd overflow injected by anomalies
  return `${clamped.toFixed(2)}%`;
}

/** True if roi_percent represents a loss-making automation (used by the alert engine). */
export function isNegativeRoi(value) {
  const n = Number(value);
  return Number.isFinite(n) && n < 0;
}

/** Short date, e.g. "Jul 29, 2023" — falls back gracefully for blank completion_date. */
const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFormat.format(d);
}

/** Robot/employee/customer style plain counters — never compact, always exact. */
export function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return integerFormat.format(Math.max(0, Math.round(n)));
}