/**
 * Ambient data-scatter field: a very faint, monochrome point field that sits
 * fixed behind the content sections so scrolling past the hero never lands on
 * flat black. Deliberately NOT a particle network — no connecting lines, no
 * glow, no accent colour. Reads as "a system slowly sampling data" (star chart
 * / scatter plot), in keeping with the archive aesthetic. Plain 2D canvas on
 * purpose: far cheaper than WebGL and fully independent of the hero terrain.
 *
 * Self-contained init, mirroring scripts/terrain.ts so it can be tuned or
 * deleted without touching anything else.
 */

type Pt = {
  x: number; y: number;      // viewport-space position
  vx: number; vy: number;    // slow drift
  base: number; amp: number; // twinkle: alpha = base + sin(..)*amp
  phase: number; speed: number;
  cross: boolean;            // rendered as a tiny "+" scatter mark vs a 1px dot
};

// Warm grey — around --text-dim. Monochrome by design.
const DOT = '#9a9a91';

// Cursor-proximity glow: points inside this radius (px) brighten & grow,
// peaking at the cursor. Restrained local lift — not a trail.
const CURSOR_R = 140;
const CURSOR_BOOST = 0.55;

export function initAmbient(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  let w = 0, h = 0;
  let pts: Pt[] = [];
  let mx = -9999, my = -9999;   // cursor position (off-screen until moved)

  if (!prefersReduced) {
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });
  }

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Sparse: ~1 point per 15k px², capped so it never crowds the type.
    const target = Math.round((w * h) / 15000);
    const count = Math.max(24, Math.min(target, w < 768 ? 40 : 90));
    pts = [];
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: rand(-0.04, 0.04),
        vy: rand(-0.05, 0.015),         // slight upward bias — data drifting up
        base: rand(0.24, 0.44),
        amp: rand(0.05, 0.10),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.15, 0.5),
        cross: Math.random() < 0.14,     // ~1 in 7 is a "+" scatter mark
      });
    }
  }

  function paint(t: number) {
    ctx!.clearRect(0, 0, w, h);
    ctx!.fillStyle = DOT;
    const r2 = CURSOR_R * CURSOR_R;
    for (const p of pts) {
      let a = prefersReduced
        ? p.base
        : Math.max(0, p.base + Math.sin(t * 0.001 * p.speed + p.phase) * p.amp);
      let grow = 0;
      if (!prefersReduced && mx > -9999) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const f = 1 - Math.sqrt(d2) / CURSOR_R; // 1 at cursor → 0 at radius
          const e = f * f;                          // ease so the lift stays local
          a += CURSOR_BOOST * e;
          grow = e;
        }
      }
      if (a <= 0.003) continue;
      ctx!.globalAlpha = a > 0.9 ? 0.9 : a;
      if (p.cross) {
        const s = 1.5 + grow * 1.2;
        ctx!.fillRect(p.x - s, p.y, s * 2, 0.6 + grow * 0.5);
        ctx!.fillRect(p.x, p.y - s, 0.6 + grow * 0.5, s * 2);
      } else {
        const s = 1 + grow * 1.4;
        ctx!.fillRect(p.x, p.y, s, s);
      }
    }
    ctx!.globalAlpha = 1;
  }

  let raf = 0;
  let last = 0;
  const FRAME = 1000 / 40; // smooth enough for cursor tracking, still easy on battery

  function step(now: number) {
    raf = requestAnimationFrame(step);
    if (now - last < FRAME) return;
    last = now;
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h;
    }
    paint(now);
  }

  function start() {
    if (prefersReduced) { paint(0); return; } // static field, no loop
    cancelAnimationFrame(raf);
    last = 0;
    raf = requestAnimationFrame(step);
  }

  build();
  // Fade in once the first frame is on screen (class toggled by the component CSS).
  requestAnimationFrame(() => canvas.classList.add('ready'));
  start();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { build(); if (prefersReduced) paint(0); }, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (prefersReduced) return;
    if (document.hidden) cancelAnimationFrame(raf);
    else start();
  });
}
