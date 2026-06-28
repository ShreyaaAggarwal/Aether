import { memo, useEffect, useRef } from 'react';
import { useRollingCounter } from '../../hooks/useRollingCounter.js';
import { formatInteger, formatCurrencyCompact } from '../../utils/formatters.js';

/**
 * KpiRibbon
 * ----------------------------------------------------------------------
 * Feature 1. Three required counters:
 *   - Total Streamed Rows Processed   (engine.stats.totalRowsStreamed)
 *   - Active Robots Deployed Count    (running sum of robots_deployed)
 *   - Global Cumulative Savings       (running sum of annual_savings_usd)
 *
 * FIX applied here: totalRowsStreamed must never decrease — it is a
 * monotonically increasing counter. We clamp it with a ref that tracks
 * the highest value seen so far. Even if a stale engine.getStats() call
 * somehow returns a lower number during a React batch, the displayed value
 * will never go backward.
 *
 * totalRobotsDeployed and totalSavings are already clamped to >= 0 in
 * App.jsx's kpis useMemo via Math.max(0, ...). The rolling counter fix
 * in useRollingCounter.js handles the animation glitch that made them
 * appear to go negative mid-animation.
 */
function Sparkline({ historyRef, color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let rafId;

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const history = historyRef.current;
      if (history.length < 2) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      const min = Math.min(...history);
      const max = Math.max(...history);
      const range = max - min || 1;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      history.forEach((v, i) => {
        const x = (i / (history.length - 1)) * w;
        const y = h - ((v - min) / range) * h * 0.85 - h * 0.075;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color.replace('1)', '0.18)'));
      grad.addColorStop(1, color.replace('1)', '0)'));
      ctx.fillStyle = grad;
      ctx.fill();

      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [historyRef, color]);

  return <canvas ref={canvasRef} width={120} height={36} className="kpi-sparkline" aria-hidden="true" />;
}

const KpiCard = memo(function KpiCard({ label, value, displayFormatter, color, trend, monotonic }) {
  // FIX: for monotonically increasing counters (totalRowsStreamed), clamp
  // the value to never go below the highest value we have ever seen.
  // This guards against any React batching or stale-read scenario where
  // the prop temporarily delivers a lower number.
  const peakRef = useRef(value);
  if (monotonic) {
    if (value > peakRef.current) peakRef.current = value;
  }
  const safeValue = monotonic ? peakRef.current : value;

  const animated = useRollingCounter(safeValue);
  const historyRef = useRef([]);

  useEffect(() => {
    const h = historyRef.current;
    h.push(safeValue);
    if (h.length > 40) h.shift();
  }, [safeValue]);

  return (
    <div className="kpi-card" style={{ '--kpi-accent': color }}>
      <div className="kpi-card__top">
        <span className="kpi-card__label">{label}</span>
        {trend !== 0 && (
          <span className={`kpi-card__trend ${trend > 0 ? 'kpi-card__trend--up' : 'kpi-card__trend--down'}`}>
            {trend > 0 ? '▲' : '▼'}
          </span>
        )}
      </div>
      <div className="kpi-card__value mono">{displayFormatter(animated)}</div>
      <Sparkline historyRef={historyRef} color={`rgba(${color}, 1)`} />
    </div>
  );
});

export const KpiRibbon = memo(function KpiRibbon({ totalRowsStreamed, totalRobotsDeployed, totalSavings }) {
  const prevRef = useRef({ totalRowsStreamed, totalRobotsDeployed, totalSavings });
  const trends = {
    rows: Math.sign(totalRowsStreamed - prevRef.current.totalRowsStreamed),
    robots: Math.sign(totalRobotsDeployed - prevRef.current.totalRobotsDeployed),
    savings: Math.sign(totalSavings - prevRef.current.totalSavings),
  };
  useEffect(() => {
    prevRef.current = { totalRowsStreamed, totalRobotsDeployed, totalSavings };
  }, [totalRowsStreamed, totalRobotsDeployed, totalSavings]);

  return (
    <div className="kpi-ribbon" role="region" aria-label="Key performance indicators">
      <KpiCard
        label="Total Streamed Rows Processed"
        value={totalRowsStreamed}
        displayFormatter={formatInteger}
        color="22, 201, 176"
        trend={trends.rows}
        monotonic={true}
      />
      <KpiCard
        label="Active Robots Deployed"
        value={totalRobotsDeployed}
        displayFormatter={formatInteger}
        color="91, 140, 255"
        trend={trends.robots}
        monotonic={false}
      />
      <KpiCard
        label="Global Cumulative Savings"
        value={totalSavings}
        displayFormatter={formatCurrencyCompact}
        color="255, 176, 32"
        trend={trends.savings}
        monotonic={false}
      />
    </div>
  );
});