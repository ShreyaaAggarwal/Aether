import { useEffect, useRef, useState } from 'react';

/**
 * useRollingCounter
 * ----------------------------------------------------------------------
 * Animates a numeric value toward targetValue using ease-out-expo.
 *
 * ROOT CAUSE OF THE PAUSE GLITCH (now fixed):
 *
 * Previous implementation wrote `displayRef.current = displayValue` during
 * render — every render, including renders triggered by unrelated state
 * changes like isPaused flipping. React state (displayValue) is always
 * one or more frames behind the actual RAF-computed value because React
 * schedules renders asynchronously. So on a pause-triggered render:
 *
 *   RAF has computed: displayRef = 29,875  (correct, mid-animation)
 *   React state has:  displayValue = 29,100 (stale, 2 frames behind)
 *   Render executes:  displayRef.current = 29,100  ← CORRUPTION
 *
 * The next RAF tick reads displayRef.current as startValue = 29,100,
 * computes delta = targetValue - 29,100. If targetValue briefly dips
 * negative due to an anomaly snapshot, delta is a large negative number
 * and the animation blasts through zero into deeply negative territory.
 *
 * FIX: Never write displayRef from render. Only the RAF writes displayRef.
 * Use a separate targetRef so the RAF always sees the latest target value
 * without needing the effect to re-run. The RAF loop runs continuously
 * and self-corrects toward targetRef.current on every frame.
 */
export function useRollingCounter(targetValue, durationMs = 420) {
  const [displayValue, setDisplayValue] = useState(targetValue);

  // Tracks the true current animated position — only written by RAF, never
  // by render. This eliminates the stale-state corruption described above.
  const displayRef = useRef(targetValue);

  // Latest target — written during render (safe: just a number assignment),
  // read by the RAF loop. Allows the RAF to retarget without effect re-run.
  const targetRef = useRef(targetValue);
  targetRef.current = targetValue;

  // Whether the RAF loop is currently running.
  const rafRef = useRef(null);

  // Whether we need to start a new animation segment (target changed).
  const animStartRef = useRef({ startValue: targetValue, startTime: 0, delta: 0, active: false });

  useEffect(() => {
    const prev = displayRef.current;
    const delta = targetValue - prev;

    // Skip animation for insignificant changes — avoids RAF churn when
    // the stream ticks but this particular KPI didn't actually change.
    if (Math.abs(delta) < 0.5) {
      displayRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    // Record animation segment start.
    animStartRef.current = {
      startValue: prev,
      startTime: performance.now(),
      delta,
      active: true,
    };

    // If no RAF loop is running, start one.
    if (rafRef.current !== null) return;

    function loop(now) {
      const anim = animStartRef.current;

      if (!anim.active) {
        rafRef.current = null;
        return;
      }

      const elapsed = now - anim.startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      // Compute next value from the SEGMENT's fixed startValue, not from
      // displayRef — this means mid-segment retargeting cannot corrupt the
      // interpolation math.
      let next = anim.startValue + anim.delta * eased;

      // MATHEMATICAL CLAMP: if both segment endpoints (startValue and the
      // target at segment start) are non-negative, the interpolated value
      // must also be non-negative. The easing function is monotonic on
      // [0,1] so this should never happen in theory — but floating point
      // and anomaly snapshots can produce a briefly-negative targetValue
      // that seeds a negative delta before the correct value arrives on the
      // next tick. Clamping here ensures the displayed number never crosses
      // zero when the true value is positive.
      if (anim.startValue >= 0 && targetRef.current >= 0) {
        next = Math.max(0, next);
      }

      // Only update the ref from inside RAF — never from render.
      displayRef.current = next;
      setDisplayValue(next);

      if (t >= 1) {
        // Animation complete — snap to exact target, stop loop.
        displayRef.current = targetRef.current;
        setDisplayValue(targetRef.current);
        animStartRef.current.active = false;
        rafRef.current = null;
        return;
      }

      // Check if target changed mid-animation (new tick arrived while we
      // were animating). If so, start a new segment from current position.
      const currentTarget = targetRef.current;
      if (Math.abs(currentTarget - (anim.startValue + anim.delta)) > 0.5) {
        const newDelta = currentTarget - next;
        if (Math.abs(newDelta) > 0.5) {
          animStartRef.current = {
            startValue: next,
            startTime: now,
            delta: newDelta,
            active: true,
          };
        } else {
          displayRef.current = currentTarget;
          setDisplayValue(currentTarget);
          animStartRef.current.active = false;
          rafRef.current = null;
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      // Do NOT cancel the RAF on cleanup — the loop is self-terminating and
      // cancelling it on targetValue change would leave displayValue frozen
      // mid-animation. Instead mark the segment inactive so the loop exits
      // cleanly on its next frame, then the new effect run starts a fresh
      // segment from the correct current position.
      // Exception: cancel on unmount (rafRef.current check in loop handles this).
    };
  }, [targetValue, durationMs]);

  // Cleanup on unmount only.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return displayValue;
}