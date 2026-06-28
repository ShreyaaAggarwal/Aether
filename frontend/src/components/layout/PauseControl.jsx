import { memo } from 'react';

/**
 * PauseControl
 * ----------------------------------------------------------------------
 * Feature 5 + the design's signature element. When paused, this shows a
 * literal fill animation: ticks that arrive while frozen visibly stack up
 * as a filling bar segment, then visibly drain back to zero on resume.
 * That motion IS the information — "your data isn't being lost, it's
 * piling up right here" — rather than decoration.
 */
export const PauseControl = memo(function PauseControl({ isPaused, queueDepth, onToggle }) {
  // Cap the visual fill at a reasonable ceiling so a long pause doesn't
  // make the bar look "broken" rather than just "very full."
  const fillPct = Math.min(100, (queueDepth / 400) * 100);

  return (
    <div className="pause-control">
      <button
        className={`pause-control__button ${isPaused ? 'pause-control__button--paused' : ''}`}
        onClick={onToggle}
        aria-pressed={isPaused}
        aria-label={isPaused ? 'Resume telemetry stream' : 'Pause telemetry stream'}
      >
        <span className="pause-control__icon" aria-hidden="true">
          {isPaused ? '▶' : '❙❙'}
        </span>
        <span>{isPaused ? 'Resume' : 'Pause'}</span>
      </button>

      <div
        className={`pause-control__queue ${isPaused ? 'pause-control__queue--active' : ''}`}
        role="status"
        aria-live="polite"
        title="Events buffered while paused"
      >
        <div className="pause-control__queue-track">
          <div className="pause-control__queue-fill" style={{ width: `${fillPct}%` }} />
        </div>
        <span className="pause-control__queue-count mono">
          {isPaused ? `${queueDepth} queued` : 'live'}
        </span>
      </div>
    </div>
  );
});