import { memo } from 'react';

const PANEL_LABELS = {
  kpiRibbon: 'KPI Ribbon',
  alertStack: 'Alert Stack',
  filterBar: 'Filter Bar',
  grid: 'Grid',
  footerDiagnostics: 'Diagnostics',
};

export const WorkspaceToggleBar = memo(function WorkspaceToggleBar({ panels, onToggle, onReset, onExport }) {
  return (
    <div className="workspace-toggle-bar" role="group" aria-label="Toggle workspace panels">
      {Object.entries(PANEL_LABELS).map(([key, label]) => (
        <button
          key={key}
          className={`workspace-toggle ${panels[key] ? 'workspace-toggle--on' : ''}`}
          onClick={() => onToggle(key)}
          aria-pressed={panels[key]}
        >
          {label}
        </button>
      ))}
      <button
        className="workspace-toggle workspace-toggle--export"
        onClick={onExport}
        title="Export the current filtered and sorted snapshot as CSV"
      >
        Snapshot Export ↓
      </button>
      <button className="workspace-toggle workspace-toggle--reset" onClick={onReset}>
        Reset
      </button>
    </div>
  );
});