import { useEffect, useRef } from 'react';

/**
 * AmbientGrid
 * ----------------------------------------------------------------------
 * A canvas-rendered, very low-density particle network behind the UI.
 * This is the ONE purely atmospheric element in the whole app — everywhere
 * else, motion = information. Here motion = "the system is alive," which
 * is itself a legitimate signal for a mission-control aesthetic, kept
 * deliberately subtle (low opacity, slow drift) so it never competes with
 * actual telemetry for attention.
 *
 * PERFORMANCE: runs on requestAnimationFrame, draws to a single canvas
 * (not DOM nodes), pauses entirely via the Page Visibility API when the
 * tab isn't focused, and respects prefers-reduced-motion by skipping the
 * animation loop and drawing one static frame.
 */
export function AmbientGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let particles = [];
    let rafId = null;
    let running = true;

    function resize() {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const count = Math.floor((window.innerWidth * window.innerHeight) / 28000);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        r: Math.random() * 1.2 + 0.4,
      }));
    }

    function drawFrame() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(22, 201, 176, 0.06)';
      ctx.lineWidth = 1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 14400) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = 'rgba(91, 140, 255, 0.35)';
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
      }
    }

    function loop() {
      if (!running) return;
      drawFrame();
      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(loop);
      }
    }

    resize();
    loop();
    window.addEventListener('resize', resize);

    function handleVisibility() {
      if (document.hidden) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
      } else if (!running) {
        running = true;
        loop();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-grid-canvas" aria-hidden="true" />;
}