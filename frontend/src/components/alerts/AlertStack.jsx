import { memo, useState, useEffect } from 'react';
import { isFlashing, alertLabel } from '../../engines/alertEngine.js';

function AlertCard({ alert, onPin, onDismiss }) {
  const [flashing, setFlashing] = useState(() => isFlashing(alert));

  useEffect(() => {
    if (!flashing) return;
    const id = setTimeout(() => setFlashing(false), Math.max(0, 1600 - (performance.now() - alert.triggeredAt)));
    return () => clearTimeout(id);
  }, [alert, flashing]);

  return (
    <div
      className={`alert-card alert-card--${alert.severity} ${flashing ? 'alert-card--flashing' : ''}`}
      role="alert"
    >
      <span className="alert-card__badge">{alert.severity === 'critical' ? 'CRIT' : 'WARN'}</span>
      <div className="alert-card__body">
        <span className="alert-card__title">{alertLabel(alert.reason)}</span>
        <span className="alert-card__meta mono">{alert.projectId} · {alert.projectName}</span>
      </div>
      <div className="alert-card__actions">
        <button onClick={() => onPin(alert.id)} aria-label="Pin alert" title="Pin">
          {alert.pinned ? '📌' : '📍'}
        </button>
        <button onClick={() => onDismiss(alert.id)} aria-label="Dismiss alert" title="Dismiss">✕</button>
      </div>
    </div>
  );
}

export const AlertStack = memo(function AlertStack({ alerts, onPin, onDismiss }) {
  if (alerts.length === 0) return null;
  return (
    <div className="alert-stack" aria-label="System alerts">
      {alerts.slice(0, 6).map((alert) => (
        <AlertCard key={alert.id} alert={alert} onPin={onPin} onDismiss={onDismiss} />
      ))}
    </div>
  );
});