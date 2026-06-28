import { memo } from 'react';

/**
 * GlobalHeader
 * ----------------------------------------------------------------------
 * Top identity strip + live system health ribbon. The pulsing dot is the
 * one indicator that directly reflects stream health (ticks arriving on
 * schedule) rather than being purely decorative chrome.
 */
export const GlobalHeader = memo(function GlobalHeader({ isPaused, lastTickAgoMs }) {
  const isHealthy = isPaused || lastTickAgoMs < 600; // 200ms tick + tolerance

  return (
    <header className="global-header">
      <div className="global-header__identity">
        <span className="global-header__mark">RPA-OS</span>
        <span className="global-header__divider" aria-hidden="true">/</span>
        <span className="global-header__subtitle">Enterprise Telemetry Terminal</span>
      </div>

      <div className="global-header__status" role="status" aria-live="polite">
        <span
          className={`status-dot ${isHealthy ? 'status-dot--healthy' : 'status-dot--stale'}`}
          aria-hidden="true"
        />
        <span className="global-header__status-label">
          {isPaused ? 'STREAM BUFFERING' : isHealthy ? 'STREAM NOMINAL' : 'STREAM DELAYED'}
        </span>
      </div>
    </header>
  );
});