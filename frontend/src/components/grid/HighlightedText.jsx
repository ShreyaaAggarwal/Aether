import { memo } from 'react';

/**
 * HighlightedText
 * ----------------------------------------------------------------------
 * Renders a string with <mark> spans over the ranges supplied by
 * searchEngine.computeHighlightRanges. Memoized on (text, ranges) so this
 * never re-splits a string that didn't actually change between ticks.
 */
export const HighlightedText = memo(function HighlightedText({ text, ranges }) {
  if (!ranges || ranges.length === 0) return <>{text}</>;

  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const segments = [];
  let cursor = 0;

  for (const [start, end] of sorted) {
    if (start > cursor) segments.push(text.slice(cursor, start));
    segments.push(
      <mark key={start} className="grid-cell__highlight">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) segments.push(text.slice(cursor));

  return <>{segments}</>;
});