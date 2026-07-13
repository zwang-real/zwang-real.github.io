/**
 * Hero terrain: woven-line mountain range.
 * Extracted from the standalone demo, kept as a self-contained IIFE-style
 * init so the whole block can be surgically swapped later without touching
 * anything else. Called from Hero.astro against the <canvas id="terrain">.
 */
import * as THREE from 'three';

export function initTerrain(canvas: HTMLCanvasElement): void {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
  camera.position.set(0, 9.5, 18);
  camera.lookAt(0, -1.5, 0);

  function resize() {
    const p = canvas.parentElement;
    if (!p) return;
    const w = p.clientWidth, h = p.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Noise ────────────────────────────────────────
  function hash(n: number) {
    const s = Math.sin(n) * 43758.5453123;
    return s - Math.floor(s);
  }
  function noise2D(x: number, y: number) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix + iy * 157.0), b = hash(ix + 1 + iy * 157.0);
    const c = hash(ix + (iy + 1) * 157.0), d = hash(ix + 1 + (iy + 1) * 157.0);
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
  }
  function fbm(x: number, y: number) {
    let v = 0, a = 0.5;
    for (let i = 0; i < 5; i++) { v += a * noise2D(x, y); x *= 2; y *= 2; a *= 0.5; }
    return v;
  }

  // ── Grid ─────────────────────────────────────────
  const mobile = window.innerWidth < 768;
  const GRID_X = mobile ? 110 : 200;
  const GRID_Z = mobile ? 40 : 70;
  const SPREAD_X = mobile ? 22 : 32;
  const SPREAD_Z = mobile ? 8 : 12;
  const COUNT = GRID_X * GRID_Z;

  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const alphas = new Float32Array(COUNT);
  const basePositions = new Float32Array(COUNT * 2);
  const jitter = new Float32Array(COUNT * 2);

  const halfX = SPREAD_X / 2, halfZ = SPREAD_Z / 2;
  const stepX = SPREAD_X / GRID_X, stepZ = SPREAD_Z / GRID_Z;

  const vIdx = (i: number, j: number) => i * GRID_Z + j;

  for (let i = 0; i < GRID_X; i++) {
    for (let j = 0; j < GRID_Z; j++) {
      const idx = vIdx(i, j);
      const idx3 = idx * 3;
      const x = i * stepX - halfX;
      const z = j * stepZ - halfZ;

      // Per-vertex jitter so lines feel hand-drawn, not gridded
      const edgeI = Math.min(i, GRID_X - 1 - i) / GRID_X;
      const edgeJ = Math.min(j, GRID_Z - 1 - j) / GRID_Z;
      const edgeMask = Math.min(1, edgeI * 6) * Math.min(1, edgeJ * 6);
      const jx = (hash(idx * 12.9898) - 0.5) * stepX * 0.85 * edgeMask;
      const jz = (hash(idx * 78.233) - 0.5) * stepZ * 0.85 * edgeMask;
      jitter[idx * 2] = jx; jitter[idx * 2 + 1] = jz;

      basePositions[idx * 2] = x + jx;
      basePositions[idx * 2 + 1] = z + jz;
      positions[idx3] = x + jx;
      positions[idx3 + 1] = 0;
      positions[idx3 + 2] = z + jz;

      colors[idx3] = 0.5; colors[idx3 + 1] = 0.5; colors[idx3 + 2] = 0.48;
      alphas[idx] = 0.0;
    }
  }

  // ── Irregular weave (per-edge probability) ───────
  const segIndices: number[] = [];
  const edgeRand = (i: number, j: number, k: number) => hash(i * 1013 + j * 271 + k * 7.19);

  for (let i = 0; i < GRID_X; i++) {
    for (let j = 0; j < GRID_Z; j++) {
      const a = vIdx(i, j);
      if (i < GRID_X - 1 && edgeRand(i, j, 1) < 0.90) segIndices.push(a, vIdx(i + 1, j));
      if (j < GRID_Z - 1 && edgeRand(i, j, 2) < 0.82) segIndices.push(a, vIdx(i, j + 1));
      if (i < GRID_X - 1 && j < GRID_Z - 1 && edgeRand(i, j, 3) < 0.55) segIndices.push(a, vIdx(i + 1, j + 1));
      if (i > 0 && j < GRID_Z - 1 && edgeRand(i, j, 4) < 0.45) segIndices.push(a, vIdx(i - 1, j + 1));
      if (i < GRID_X - 2 && edgeRand(i, j, 5) < 0.12) segIndices.push(a, vIdx(i + 2, j));
      if (j < GRID_Z - 2 && edgeRand(i, j, 6) < 0.10) segIndices.push(a, vIdx(i, j + 2));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  geo.setIndex(segIndices);

  const vertShader = `
    attribute float alpha;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vColor = color;
      vAlpha = alpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragShader = `
    varying vec3 vColor;
    varying float vAlpha;
    void main() { gl_FragColor = vec4(vColor, vAlpha); }
  `;

  const mat = new THREE.ShaderMaterial({
    vertexShader: vertShader,
    fragmentShader: fragShader,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.LineSegments(geo, mat);
  mesh.position.y = -1.6;   // sink the range so peaks sit lower in frame
  scene.add(mesh);

  // ── Mouse: camera parallax + hover glow ──────────
  let mouseX = 0, mouseY = 0;    // window-relative, for camera parallax
  let ndcX = 0, ndcY = 0;        // canvas-relative NDC, for the hover raycast
  let mouseInside = false;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    // NDC must be relative to the canvas rect, not the window — the canvas sits
    // right of the sidebar, so window coords are offset horizontally.
    const r = canvas.getBoundingClientRect();
    ndcX = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndcY = -(((e.clientY - r.top) / r.height) * 2 - 1);
    mouseInside = true;
  }, { passive: true });
  document.addEventListener('mouseleave', () => { mouseInside = false; });

  // Raycast the cursor onto the y=0 plane to get a terrain-space point, then
  // lift the alpha of vertices within GLOW_R of it. Local x/z == world x/z here
  // because the mesh is only translated in y.
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  let hasHit = false, hitX = 0, hitZ = 0;
  let glow = 0;                 // eased 0→1 so the lift fades in/out, never pops
  const GLOW_R = 3.6;           // world-space radius of the hover lift
  const GLOW_BOOST = 0.35;      // max added alpha at the cursor

  // ── Peak-based height field ──────────────────────
  const PEAKS: [number, number, number, number, number][] = [
    // [x, z, height, sigmaX, sigmaZ] — dominant central peak, cascading flanks
    [-11.0,  1.2, 0.65, 3.5, 2.5],
    [ -8.0, -0.5, 1.30, 3.0, 2.2],
    [ -5.2,  0.8, 1.85, 2.8, 2.4],
    [ -2.4, -0.4, 2.35, 2.6, 2.3],
    [  0.2,  0.6, 3.60, 2.2, 2.0],   // main peak
    [  2.8, -0.2, 2.25, 2.7, 2.3],
    [  5.6,  0.9, 1.75, 2.9, 2.4],
    [  8.4, -0.7, 1.20, 3.1, 2.5],
    [ 11.2,  0.3, 0.70, 3.4, 2.6],
  ];

  function peakFalloff(dx: number, dz: number, sx: number, sz: number) {
    const d2 = (dx * dx) / (sx * sx) + (dz * dz) / (sz * sz);
    const d = Math.sqrt(d2);
    return 0.60 * Math.exp(-d2 * 0.7) + 0.40 * Math.exp(-d * 1.6);
  }

  function getHeight(x: number, z: number, t: number) {
    let h = 0;
    for (const P of PEAKS) h += P[2] * peakFalloff(x - P[0], z - P[1], P[3], P[4]);
    const mod = 0.65 + fbm(x * 0.18 + t * 0.5, z * 0.18 + t * 0.3) * 0.9;
    const fine = fbm(x * 0.55 + t * 0.4, z * 0.55 - t * 0.25) * 1.10;
    const micro = fbm(x * 1.4 + t * 0.7, z * 1.4 - t * 0.5) * 0.28;
    const height = h * mod + fine * Math.min(1, h * 0.4) + micro * Math.min(1, h * 0.25);
    const edgeX = Math.max(0, Math.min(1, (halfX - Math.abs(x)) / 3.0));
    const edgeZ = Math.max(0, Math.min(1, (halfZ - Math.abs(z)) / 2.0));
    return height * edgeX * edgeZ;
  }

  // ── Color + alpha per vertex ─────────────────────
  const accentR = 232 / 255, accentG = 148 / 255, accentB = 106 / 255;
  function setVertex(idx: number, height: number, maxH: number) {
    const idx3 = idx * 3;
    const t = Math.max(0, Math.min(1, height / maxH));
    let r: number, g: number, b: number;
    if (t < 0.30) {
      const s = t / 0.30;
      r = 0.18 + s * 0.22; g = 0.18 + s * 0.22; b = 0.17 + s * 0.21;
    } else if (t < 0.72) {
      const s = (t - 0.30) / 0.42;
      r = 0.40 + s * 0.45; g = 0.40 + s * 0.43; b = 0.38 + s * 0.41;
    } else {
      const s = (t - 0.72) / 0.28;
      r = 0.85 + s * 0.08 + s * accentR * 0.05;
      g = 0.83 + s * 0.04;
      b = 0.79 - s * 0.02;
    }
    if (t > 0.80 && ((idx * 2654435761) % 1000) < 5) {
      r = accentR; g = accentG; b = accentB;
    }
    colors[idx3] = r; colors[idx3 + 1] = g; colors[idx3 + 2] = b;
    alphas[idx] = 0.015 + t * 0.22;
  }

  // ── Animate ──────────────────────────────────────
  const posArr = geo.attributes.position.array as Float32Array;
  const maxH = 4.0;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let time = 0;
  let raf = 0;

  function animate() {
    raf = requestAnimationFrame(animate);
    if (!prefersReduced) time += 0.0018;

    // Resolve cursor → terrain point (ease glow so it fades rather than snaps)
    const target = mouseInside && !prefersReduced ? 1 : 0;
    glow += (target - glow) * 0.08;
    hasHit = false;
    if (glow > 0.001) {
      camera.updateMatrixWorld();
      ndc.set(ndcX, ndcY);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        hasHit = true; hitX = hit.x; hitZ = hit.z;
      }
    }
    const glowActive = hasHit && glow > 0.001;
    const glowR2 = GLOW_R * GLOW_R;

    for (let idx = 0; idx < COUNT; idx++) {
      const x = basePositions[idx * 2];
      const z = basePositions[idx * 2 + 1];
      const h = getHeight(x, z, time);
      posArr[idx * 3 + 1] = h;
      setVertex(idx, h, maxH);

      if (glowActive) {
        const dx = x - hitX, dz = z - hitZ;
        const d2 = dx * dx + dz * dz;
        if (d2 < glowR2) {
          const f = 1 - Math.sqrt(d2) / GLOW_R;
          alphas[idx] = Math.min(0.6, alphas[idx] + GLOW_BOOST * f * f * glow);
        }
      }
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.alpha.needsUpdate = true;

    camera.position.x = mouseX * 1.6;
    camera.position.y = 9.5 - mouseY * 0.8;
    camera.lookAt(0, -1.5, 0);

    renderer.render(scene, camera);
  }

  // Pause when tab is hidden to save cycles
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else animate();
  });

  setTimeout(animate, 100);
}
