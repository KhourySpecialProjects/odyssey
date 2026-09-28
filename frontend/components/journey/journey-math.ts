// Pure math for the homepage journey: easing, keyframe interpolation, the
// boat's route spline and the camera. No DOM access, so it's unit-testable.

export type Point = { x: number; y: number };
/** A world-space rectangle described by its center and size. */
export type FocusRect = { cx: number; cy: number; w: number; h: number };
/** A screen region as fractions (0–1) of the stage. */
export type Region = { x: number; y: number; w: number; h: number };
/** `s` is screen pixels per world unit; (cx, cy) is the world point at the stage center. */
export type Camera = { cx: number; cy: number; s: number };

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Progress of `t` through [a, b], clamped to 0–1. */
export function span(t: number, a: number, b: number) {
  return b === a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a));
}

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/** Eased progress of `t` through [a, b]. */
export function ease(
  t: number,
  a: number,
  b: number,
  fn: (v: number) => number = easeInOutCubic,
) {
  return fn(span(t, a, b));
}

/** Rises over [a, b], holds, then falls over [c, d]. */
export function window01(
  t: number,
  a: number,
  b: number,
  c: number,
  d: number,
) {
  return ease(t, a, b, easeOutCubic) * (1 - ease(t, c, d, easeInCubic));
}

/**
 * Monotone cubic (Fritsch–Carlson) interpolation. It never overshoots, and
 * repeated values produce a flat hold with eased entry and exit, which is
 * what gives the camera and boat their "arrive, pause, depart" motion.
 */
export function createMonotone(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => ys[0];

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    slope[i] = dx[i] === 0 ? 0 : (ys[i + 1] - ys[i]) / dx[i];
  }

  const m: number[] = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      m[i] = k * a * slope[i];
      m[i + 1] = k * b * slope[i];
    }
  }

  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const h = dx[lo];
    if (h === 0) return ys[hi];
    const t = (x - xs[lo]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo] +
      (t3 - 2 * t2 + t) * h * m[lo] +
      (-2 * t3 + 3 * t2) * ys[hi] +
      (t3 - t2) * h * m[hi]
    );
  };
}

type Bezier = [Point, Point, Point, Point];

function bezierAt([p0, p1, p2, p3]: Bezier, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

const fmt = (v: number) => Math.round(v * 10) / 10;

/**
 * A smooth route through `waypoints` (Catmull-Rom converted to cubic
 * Béziers) with an arc-length table, so the boat can be placed by distance
 * travelled and each waypoint's distance is known exactly.
 */
export function createRoute(waypoints: Point[], samplesPerSegment = 40) {
  const pts = waypoints;
  const segments: Bezier[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    segments.push([
      p1,
      { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p2,
    ]);
  }

  const xs: number[] = [pts[0].x];
  const ys: number[] = [pts[0].y];
  const dist: number[] = [0];
  const waypointDistances: number[] = [0];
  let total = 0;
  for (const seg of segments) {
    let prev = seg[0];
    for (let s = 1; s <= samplesPerSegment; s++) {
      const p = bezierAt(seg, s / samplesPerSegment);
      total += Math.hypot(p.x - prev.x, p.y - prev.y);
      xs.push(p.x);
      ys.push(p.y);
      dist.push(total);
      prev = p;
    }
    waypointDistances.push(total);
  }

  function indexAt(d: number) {
    let lo = 0;
    let hi = dist.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (dist[mid] <= d) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /** Position and heading (radians) at distance `d` along the route. */
  function at(d: number): Point & { angle: number } {
    const c = Math.min(Math.max(d, 0), total);
    const i = Math.min(indexAt(c), dist.length - 2);
    const segLen = dist[i + 1] - dist[i] || 1;
    const t = (c - dist[i]) / segLen;
    return {
      x: lerp(xs[i], xs[i + 1], t),
      y: lerp(ys[i], ys[i + 1], t),
      angle: Math.atan2(ys[i + 1] - ys[i], xs[i + 1] - xs[i]),
    };
  }

  /** SVG path data for the whole route. */
  function toPath() {
    const [first] = segments[0];
    let d = `M${fmt(first.x)} ${fmt(first.y)}`;
    for (const [, c1, c2, p] of segments) {
      d += ` C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p.x)} ${fmt(p.y)}`;
    }
    return d;
  }

  /** SVG path data (polyline) for the stretch between two distances. */
  function slicePath(from: number, to: number) {
    const a = at(from);
    let d = `M${fmt(a.x)} ${fmt(a.y)}`;
    const start = indexAt(from) + 1;
    for (let i = start; i < dist.length && dist[i] < to; i++) {
      d += ` L${fmt(xs[i])} ${fmt(ys[i])}`;
    }
    const b = at(to);
    return `${d} L${fmt(b.x)} ${fmt(b.y)}`;
  }

  return { total, waypointDistances, at, toPath, slicePath };
}

export type Route = ReturnType<typeof createRoute>;

/** The camera that fits `rect` inside `region` of a `vw`×`vh` stage. */
export function fitCamera(
  rect: FocusRect,
  region: Region,
  vw: number,
  vh: number,
): Camera {
  const rw = Math.max(region.w * vw, 1);
  const rh = Math.max(region.h * vh, 1);
  const s = Math.min(rw / rect.w, rh / rect.h);
  const regionCx = (region.x + region.w / 2) * vw;
  const regionCy = (region.y + region.h / 2) * vh;
  return {
    cx: rect.cx - (regionCx - vw / 2) / s,
    cy: rect.cy - (regionCy - vh / 2) / s,
    s,
  };
}

/** Where world point (x, y) lands on screen for a given camera. */
export function worldToScreen(
  cam: Camera,
  x: number,
  y: number,
  vw: number,
  vh: number,
): Point {
  return { x: (x - cam.cx) * cam.s + vw / 2, y: (y - cam.cy) * cam.s + vh / 2 };
}

/** Deterministic pseudo-random numbers, so SSR and client markup match. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * A closed, organic island outline around (cx, cy). The same seed always
 * gives the same shape, so concentric contour rings can share it.
 */
export function blobPath(
  cx: number,
  cy: number,
  r: number,
  seed: number,
  roughness = 0.16,
  points = 11,
) {
  const rand = seeded(seed);
  const waves = [1, 2, 3].map((k) => ({
    k,
    amp: (rand() * roughness) / k,
    phase: rand() * Math.PI * 2,
  }));
  const squash = 0.78 + rand() * 0.18;
  const ring: Point[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    let f = 1;
    for (const w of waves) f += w.amp * Math.sin(w.k * a + w.phase);
    ring.push({
      x: cx + Math.cos(a) * r * f,
      y: cy + Math.sin(a) * r * f * squash,
    });
  }
  let d = "";
  for (let i = 0; i < points; i++) {
    const p0 = ring[(i - 1 + points) % points];
    const p1 = ring[i];
    const p2 = ring[(i + 1) % points];
    const p3 = ring[(i + 2) % points];
    if (i === 0) d += `M${fmt(p1.x)} ${fmt(p1.y)}`;
    d += ` C${fmt(p1.x + (p2.x - p0.x) / 6)} ${fmt(p1.y + (p2.y - p0.y) / 6)} ${fmt(p2.x - (p3.x - p1.x) / 6)} ${fmt(p2.y - (p3.y - p1.y) / 6)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return `${d} Z`;
}
