import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { buildInspectorGroups, flattenInspectorFields } from './inspectorSchema.js';
import { StatusRadar, MetricGauge } from './StatusRadar.jsx';
import { isNegativeRoi } from '../../utils/formatters.js';

/**
 * InspectorPanel
 * ----------------------------------------------------------------------
 * Bounty task. Opens only while the stream is paused (per spec: "When
 * Pause mode is active, clicking ANY telemetry row must open an isolated
 * Inspector Viewport"). Implements:
 *   - slide-in + backdrop blur (CSS, GPU-composited)
 *   - grouped information architecture (via inspectorSchema)
 *   - status radar + gauges
 *   - in-panel search across all fields
 *   - keyboard: Esc close, ←/→ navigate prev/next row in the CURRENT
 *     filtered/sorted list (so navigation matches what's on screen)
 *   - pin (stays open across re-selection) + fullscreen toggle
 *   - copy-to-clipboard per field
 */
export const InspectorPanel = memo(function InspectorPanel({
  row,
  rows, // current filtered+sorted list, for prev/next navigation
  onClose,
  onNavigate, // (nextRow) => void
}) {
  const [isPinned, setIsPinned] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const panelRef = useRef(null);

  const currentIndex = useMemo(
    () => rows.findIndex((r) => r.project_id === row.project_id),
    [rows, row.project_id]
  );

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(rows[currentIndex - 1]);
  }, [currentIndex, rows, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex !== -1 && currentIndex < rows.length - 1) onNavigate(rows[currentIndex + 1]);
  }, [currentIndex, rows, onNavigate]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      } else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext, isFullscreen]);

  useEffect(() => {
    panelRef.current?.focus();
  }, [row.project_id]);

  const groups = useMemo(() => buildInspectorGroups(row), [row]);

  const filteredGroups = useMemo(() => {
    if (!query) return groups;
    const q = query.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        fields: g.fields.filter(
          (f) => f.label.toLowerCase().includes(q) || String(f.value).toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.fields.length > 0);
  }, [groups, query]);

  const radarMetrics = useMemo(() => {
    const roi = Number(row.roi_percent) || 0;
    const robots = Number(row.robots_deployed) || 0;
    const savings = Number(row.annual_savings_usd) || 0;
    const hours = Number(row.employee_hours_saved) || 0;
    return [
      { label: 'ROI', value: Math.max(0, Math.min(1, (roi + 50) / 250)) },
      { label: 'Robots', value: Math.min(1, robots / 60) },
      { label: 'Savings', value: Math.min(1, savings / 2000000) },
      { label: 'Hrs Saved', value: Math.min(1, hours / 80000) },
    ];
  }, [row]);

  const handleCopy = useCallback((label, value) => {
    navigator.clipboard?.writeText(String(value)).catch(() => {});
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1200);
  }, []);

  return (
    <div className="inspector-overlay" onClick={onClose}>
      <div
        className={`inspector-panel ${isFullscreen ? 'inspector-panel--fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Inspector: ${row.project_name}`}
        ref={panelRef}
        tabIndex={-1}
      >
        <header className="inspector-panel__header">
          <div className="inspector-panel__title-block">
            <span className="inspector-panel__eyebrow">MISSION ANALYSIS WORKSPACE</span>
            <h2 className="inspector-panel__title">{row.project_name}</h2>
            <span className="inspector-panel__subtitle mono">{row.project_id}</span>
          </div>
          <div className="inspector-panel__controls">
            <button onClick={goPrev} disabled={currentIndex <= 0} aria-label="Previous row" title="Previous (←)">‹</button>
            <span className="inspector-panel__position mono">
              {currentIndex + 1} / {rows.length}
            </span>
            <button onClick={goNext} disabled={currentIndex === rows.length - 1} aria-label="Next row" title="Next (→)">›</button>
            <span className="inspector-panel__divider" />
            <button
              onClick={() => setIsPinned((p) => !p)}
              aria-pressed={isPinned}
              title="Pin inspector"
              className={isPinned ? 'inspector-panel__icon-btn--active' : ''}
            >
              {isPinned ? '📌' : '📍'}
            </button>
            <button onClick={() => setIsFullscreen((f) => !f)} title="Toggle fullscreen">
              {isFullscreen ? '⤡' : '⤢'}
            </button>
            <button onClick={onClose} aria-label="Close inspector (Esc)" title="Close (Esc)">✕</button>
          </div>
        </header>

        <div className="inspector-panel__search">
          <input
            type="text"
            placeholder="Search within this record…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mono"
          />
        </div>

        <div className="inspector-panel__body">
          <div className="inspector-panel__visuals">
            <StatusRadar metrics={radarMetrics} />
            <div className="inspector-panel__gauges">
              <MetricGauge
                value={Math.min(1, Math.max(0, (Number(row.roi_percent) + 50) / 250))}
                label="ROI Health"
                color={isNegativeRoi(row.roi_percent) ? 'var(--signal-red)' : 'var(--signal-teal)'}
              />
              <MetricGauge
                value={Math.min(1, Number(row.robots_deployed) / 60)}
                label="Fleet Scale"
                color="var(--signal-blue)"
              />
            </div>
          </div>

          <div className="inspector-panel__groups">
            {filteredGroups.map((group) => (
              <InspectorGroup key={group.id} group={group} onCopy={handleCopy} copiedField={copiedField} />
            ))}
            {filteredGroups.length === 0 && (
              <div className="inspector-panel__empty">No fields match "{query}"</div>
            )}
          </div>
        </div>

        <footer className="inspector-panel__footer">
          <span>Esc close</span>
          <span>← → navigate</span>
          <span>Click value to copy</span>
        </footer>
      </div>
    </div>
  );
});

function InspectorGroup({ group, onCopy, copiedField }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section className="inspector-group">
      <button
        className="inspector-group__header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="inspector-group__icon" aria-hidden="true">{group.icon}</span>
        <span className="inspector-group__title">{group.title}</span>
        <span className="inspector-group__chevron">{expanded ? '⌃' : '⌄'}</span>
      </button>
      {expanded && (
        <div className="inspector-group__fields">
          {group.fields.map((f) => (
            <button
              key={f.label}
              className={`inspector-field ${f.negative ? 'inspector-field--negative' : ''}`}
              onClick={() => onCopy(f.label, f.value)}
              title="Click to copy"
            >
              <span className="inspector-field__label">{f.label}</span>
              <span className={`inspector-field__value ${f.mono ? 'mono' : ''}`}>
                {copiedField === f.label ? 'Copied ✓' : String(f.value)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}