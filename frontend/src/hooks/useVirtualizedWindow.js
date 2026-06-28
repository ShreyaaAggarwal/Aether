import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

export function useVirtualizedWindow({ totalRows, rowHeight, overscan = 6 }) {
  const containerRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef(null);
  // FIX: capture scrollTop in a ref so RAF always reads the LATEST value,
  // not the stale closure value from when the scroll event fired.
  const scrollTopRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // FIX: Use ResizeObserver on the container to get TRUE viewport height.
    // Previously if clientHeight was 0 on mount (flex child not yet laid out),
    // viewportHeight stayed 0 and visibleCount = 0 — windowSize collapsed to
    // just 2*overscan rows, but then ResizeObserver fired with the SCROLLABLE
    // height (full content height) instead of the VIEWPORT height because the
    // container had no explicit height constraint and grew to fit content.
    // We now read offsetHeight (includes border) as fallback and explicitly
    // clamp to the element's bounding client rect.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // contentRect.height is the inner height excluding padding/border.
        // For a scroll container this is the VIEWPORT height — exactly what we want.
        const h = entry.contentRect.height;
        if (h > 0) setViewportHeight(h);
      }
    });
    observer.observe(el);

    // Seed immediately in case ResizeObserver fires asynchronously.
    const initialHeight = el.getBoundingClientRect().height;
    if (initialHeight > 0) setViewportHeight(initialHeight);

    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e) => {
    // FIX: Read scrollTop immediately from the event (synchronous, no reflow).
    // Store in ref so the RAF callback always gets the latest value even if
    // multiple scroll events fire before the next animation frame.
    scrollTopRef.current = e.currentTarget.scrollTop;

    if (rafRef.current !== null) return; // frame already pending — coalesce
    rafRef.current = requestAnimationFrame(() => {
      // Read from ref, not from the stale closure — this is the latest scrollTop
      // across ALL scroll events that fired since the last frame.
      setScrollTop(scrollTopRef.current);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const layout = useMemo(() => {
    const visibleCount = viewportHeight > 0 ? Math.ceil(viewportHeight / rowHeight) : 20;
    const rawFirstIndex = Math.floor(scrollTop / rowHeight);
    const firstIndex = Math.max(0, rawFirstIndex - overscan);
    const lastIndex = Math.min(totalRows - 1, rawFirstIndex + visibleCount + overscan);
    const windowSize = Math.max(0, lastIndex - firstIndex + 1);
    const totalHeight = totalRows * rowHeight;
    const offsetY = firstIndex * rowHeight;

    return { firstIndex, lastIndex, windowSize, totalHeight, offsetY, visibleCount };
  }, [viewportHeight, scrollTop, rowHeight, overscan, totalRows]);

  return { containerRef, handleScroll, ...layout };
}