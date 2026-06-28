/**
 * searchEngine.js
 * ----------------------------------------------------------------------
 * Feature 10: multi-field, token-based, out-of-order fuzzy search.
 *
 * APPROACH:
 * Per spec, the four indexed fields are project_name, company_id,
 * implementation_partner, and country. A query like "Tata India" should
 * match a row where implementation_partner contains "Tata Consultancy..."
 * and country is "India" — even though those tokens live in two different
 * fields and "India" appears nowhere near "Tata" in the row's natural
 * field order.
 *
 * ALGORITHM (kept intentionally simple + fast over fuzzy/edit-distance,
 * because the brief's example is token-substring matching, not typo
 * tolerance, and edit-distance over 50k rows x 5 fields x every keystroke
 * would blow the 200ms tick budget):
 *   1. Split the query into lowercase tokens on whitespace.
 *   2. Concatenate the searchable fields of a row into one haystack string,
 *      tracking each field's [start, end) offset within that haystack.
 *   3. A row matches iff EVERY query token is a substring of the haystack
 *      (order-independent — that's the "out-of-order" requirement).
 *   4. For highlighting, re-scan the haystack for each token's match
 *      position(s) and clip them back to per-field ranges.
 *
 * PERFORMANCE: haystacks are cached per-row per-version via a WeakMap-like
 * keyed cache built by the caller (see useFilteredRows) — this module is
 * pure and stateless so it stays trivially testable.
 */

export const SEARCHABLE_FIELDS = ['project_name', 'company_id', 'implementation_partner', 'country'];

/** Builds the lowercase haystack + per-field offsets for one row. */
export function buildHaystack(row) {
  let cursor = 0;
  const offsets = {};
  const parts = [];
  for (const field of SEARCHABLE_FIELDS) {
    const text = String(row[field] ?? '');
    const lower = text.toLowerCase();
    offsets[field] = { start: cursor, end: cursor + lower.length, raw: text };
    parts.push(lower);
    cursor += lower.length + 1; // +1 for the joining separator below
  }
  return { haystack: parts.join('\u0000'), offsets };
}

export function tokenize(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Returns true if every token appears somewhere in the haystack. */
export function matchesAllTokens(haystack, tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (haystack.indexOf(tokens[i]) === -1) return false;
  }
  return true;
}

/**
 * Computes highlight ranges PER FIELD for a matched row, so the UI can
 * wrap matched substrings in <mark> without re-running the full scan logic
 * inside the render path.
 * Returns: { [field]: Array<[startInField, endInField]> }
 */
export function computeHighlightRanges(haystackEntry, tokens) {
  const { haystack, offsets } = haystackEntry;
  const result = {};

  for (const field of SEARCHABLE_FIELDS) {
    result[field] = [];
  }

  for (const token of tokens) {
    if (!token) continue;
    let searchFrom = 0;
    let idx;
    while ((idx = haystack.indexOf(token, searchFrom)) !== -1) {
      // find which field this match falls inside
      for (const field of SEARCHABLE_FIELDS) {
        const { start, end } = offsets[field];
        if (idx >= start && idx < end) {
          const fieldStart = idx - start;
          const fieldEnd = Math.min(fieldStart + token.length, end - start);
          result[field].push([fieldStart, fieldEnd]);
          break;
        }
      }
      searchFrom = idx + token.length;
    }
  }

  return result;
}