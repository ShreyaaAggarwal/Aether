import { useEffect, useRef, useState, useCallback } from 'react';
import { streamEngine } from '../engines/StreamEngine.js';

export function useStreamEngine() {
  const [version, setVersion] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [queueDepth, setQueueDepth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // FIX: Do NOT guard with startedRef here — always subscribe and always
    // call start(). StreamEngine.start() internally guards against double
    // calling initializeRpaStream when rows already exist. But the subscriber
    // MUST be registered on every mount (including HMR re-mounts).
    // The old startedRef guard was preventing re-subscription after HMR,
    // meaning the React layer had no listener and version never incremented.

    const unsubscribe = streamEngine.subscribe((payload) => {
      setLastEvent(payload);

      if (payload.type === 'buffering') {
        setQueueDepth(payload.queueDepth);
        return;
      }

      if (payload.type === 'pause-state') {
        // FIX: sync isPaused from the engine's own event, not from togglePause
        // caller — avoids the race where togglePause sets state before the
        // engine's internal flag flips.
        setIsPaused(payload.paused);
        setQueueDepth(payload.queueDepth ?? 0);
        return;
      }

      if (payload.type === 'resume-flush') {
        // FIX: explicitly set isPaused to false on resume so the UI unlocks
        // immediately, then bump version so the grid re-renders with flushed rows.
        setIsPaused(false);
        setQueueDepth(0);
        setVersion((v) => v + 1);
        return;
      }

      // 'seed' | 'tick' → real commit
      setVersion((v) => v + 1);
      setQueueDepth(0);

      // If engine already has rows when we mount (e.g. after HMR),
      // immediately mark as ready.
      if (!isReady && streamEngine.rows.size > 0) {
        setIsReady(true);
      }
    });

    // Always call start — it's idempotent when rows already exist.
    streamEngine.start();

    // Handle the case where the engine already has rows before we subscribed
    // (HMR scenario: engine singleton kept its data, React remounted fresh).
    if (streamEngine.rows.size > 0) {
      setIsReady(true);
      setVersion((v) => v + 1);
    } else {
      streamEngine.onReady().then(() => {
        setIsReady(true);
      });
    }

    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FIX: togglePause should ONLY call the engine method.
  // The engine fires a 'pause-state' or 'resume-flush' event which the
  // subscriber above picks up and sets React state from.
  // The old code was setting state here AND in the subscriber — causing
  // a race condition where isPaused would flicker or be wrong.
  const togglePause = useCallback(() => {
    streamEngine.togglePause();
  }, []);

  return { version, isPaused, queueDepth, isReady, lastEvent, togglePause, engine: streamEngine };
}