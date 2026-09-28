// Drives the journey: maps overall scroll progress (0–1) to the camera, the
// boat, the map and every UI replica. All writes are direct DOM updates, so
// scrolling never re-renders React.

import {
  at,
  BOAT_KEYS,
  CAMERA_KEYS,
  CHAPTER_BOUNDS,
  DRAFT_ISLAND,
  DROPLET_ISLETS,
  local,
  MAP_LABELS,
  PLANNED_LEGS,
  REGIONS,
  ROUTE,
  SAMPLE_DROPLETS,
  SAMPLE_LESSONS,
  STOPS,
  VOYAGE_ISLANDS,
  VOYAGE_ROUTE,
  WORLD,
  type ChapterId,
  type Layout,
} from "./journey-config";
import {
  clamp01,
  createMonotone,
  ease,
  easeOutCubic,
  fitCamera,
  lerp,
  span,
  window01,
  worldToScreen,
  type Camera,
  type Point,
} from "./journey-math";
import { PANEL_SIZE } from "./panels/app-frame";

type El = HTMLElement | SVGElement;

const stopDist = (id: keyof typeof STOPS) => ROUTE.waypointDistances[STOPS[id]];

const ISLET = Object.fromEntries(DROPLET_ISLETS.map((i) => [i.id, i]));
const GIT = ISLET.git;
const FIELD_CENTER: Point = { x: 1300, y: 1250 };
const HARBOR: Point = { x: 3470, y: 1150 };
const TECH_CARDS = SAMPLE_DROPLETS.map((d, i) =>
  d.focusArea === "technical" ? i : -1,
).filter((i) => i >= 0);
const TECH_ISLETS = new Set(
  SAMPLE_DROPLETS.filter((d) => d.focusArea === "technical").map(
    (d) => d.islet,
  ),
);

/** Other members' boats sailing into the harbor. */
export const FLEET = [
  {
    from: { x: 3860, y: 1640 },
    via: { x: 3700, y: 1320 },
    to: { x: 3545, y: 1175 },
  },
  {
    from: { x: 3980, y: 980 },
    via: { x: 3780, y: 1060 },
    to: { x: 3620, y: 1105 },
  },
  {
    from: { x: 3080, y: 1010 },
    via: { x: 3230, y: 1130 },
    to: { x: 3330, y: 1105 },
  },
  {
    from: { x: 3560, y: 1620 },
    via: { x: 3520, y: 1380 },
    to: { x: 3480, y: 1235 },
  },
];

/** Soft mist in front of the map, moving faster than it for depth. */
export const MIST: Point[] = [
  { x: 760, y: 1250 },
  { x: 1560, y: 880 },
  { x: 2150, y: 1520 },
  { x: 2700, y: 700 },
  { x: 3250, y: 1760 },
  { x: 3760, y: 900 },
];

const quad = (a: Point, b: Point, c: Point, t: number): Point => {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
  };
};

// ─── Small, change-aware DOM writers ─────────────────────────────────────────

function opacity(el: El | undefined, v: number) {
  if (!el) return;
  const s = v <= 0.001 ? "0" : v >= 0.999 ? "1" : v.toFixed(3);
  if (el.style.opacity !== s) el.style.opacity = s;
}
function style(el: El | undefined, prop: string, v: string) {
  if (!el) return;
  if (el.style.getPropertyValue(prop) !== v) el.style.setProperty(prop, v);
}
function on(el: El | undefined, value: boolean, key = "on") {
  if (!el) return;
  const v = value ? "1" : "0";
  if (el.dataset[key] !== v) el.dataset[key] = v;
}
function state(el: El | undefined, value: string) {
  if (!el) return;
  if (el.dataset.state !== value) el.dataset.state = value;
}
function text(el: El | undefined, value: string) {
  if (el && el.textContent !== value) el.textContent = value;
}
function attr(el: El | undefined, name: string, value: string) {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function collectHooks(root: ParentNode) {
  const map = new Map<string, El>();
  root.querySelectorAll<El>("[data-j]").forEach((el) => {
    map.set(el.dataset.j as string, el);
  });
  return map;
}

// ─── Per-panel UI state (shared with the reduced-motion storyboard) ──────────

type Hooks = Map<string, El>;

/** Explore: tD is local time in "discover". Card layout offsets are measured. */
export function applyExplore(
  h: Hooks,
  tD: number,
  slots: Point[],
  fly?: (i: number) => { dx: number; dy: number; k: number; o: number },
) {
  on(h.get("ex-focus-btn"), tD >= 0.42 && tD < 0.46, "press");
  on(h.get("ex-pop"), tD >= 0.44 && tD < 0.64);
  on(h.get("ex-check"), tD >= 0.53);
  on(h.get("ex-badge"), tD >= 0.64);

  const filter = ease(tD, 0.64, 0.78);
  const hide = ease(tD, 0.6, 0.68);
  for (let i = 0; i < slots.length; i++) {
    const card = h.get(`ex-card-${i}`);
    if (!card) continue;
    const slot = TECH_CARDS.indexOf(i);
    const f = fly ? fly(i) : { dx: 0, dy: 0, k: 1, o: 1 };
    let dx = f.dx;
    let dy = f.dy;
    let k = f.k;
    let o = f.o;
    if (slot >= 0 && slots[slot]) {
      dx += (slots[slot].x - slots[i].x) * filter;
      dy += (slots[slot].y - slots[i].y) * filter;
    } else {
      o *= 1 - hide;
      k *= 1 - 0.06 * hide;
    }
    style(
      card,
      "transform",
      `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${k.toFixed(3)})`,
    );
    opacity(card, o);
    if (i === 0) on(card, tD >= 0.82);
  }
}

/** Learn + check-in: tL is local time in "learn", tC in "checkin". */
export function applyLesson(
  h: Hooks,
  tL: number,
  tC: number,
  quizOffset: number,
) {
  // Learn: select a sentence, highlight it, then add a note to it from the
  // selection toolbar, which opens the notes bar with the linked note.
  on(h.get("ls-hint"), tL < 0.72 && tC <= 0);
  state(
    h.get("ls-hl"),
    tL >= 0.67 ? "highlighted" : tL >= 0.58 ? "selected" : "none",
  );
  on(h.get("ls-toolbar"), tL >= 0.6 && tL < 0.76);
  on(h.get("ls-dot"), tL >= 0.64 && tL < 0.68);
  on(h.get("ls-tb-trash"), tL >= 0.67);
  on(h.get("ls-note-btn"), tL >= 0.71 && tL < 0.75, "press");
  on(h.get("ls-notes"), tL >= 0.75 && tC < 0.08);
  on(h.get("ls-note"), tL >= 0.79);

  // Check-in: scroll to the quiz, answer it, and unlock the next lesson.
  style(
    h.get("ls-scroll"),
    "transform",
    `translateY(${(-quizOffset * ease(tC, 0.06, 0.24)).toFixed(1)}px)`,
  );
  const passed = tC >= 0.42;
  on(h.get("ls-opt"), tC >= 0.3);
  on(h.get("ls-check"), tC >= 0.37 && tC < 0.41, "press");
  on(h.get("ls-check"), !passed);
  on(h.get("ls-result"), passed && tC < 0.6);
  on(h.get("ls-gate"), !passed);
  on(h.get("ls-next"), passed);

  const completed =
    tC >= 0.76 ? 4 : tC >= 0.7 ? 3 : tC >= 0.64 ? 2 : tC >= 0.54 ? 1 : 0;
  const active =
    tC >= 0.8 ? -1 : tC >= 0.73 ? 3 : tC >= 0.67 ? 2 : tC >= 0.6 ? 1 : 0;
  for (let i = 0; i < SAMPLE_LESSONS.length; i++) {
    state(
      h.get(`ls-row-${i}`),
      i === active ? "active" : i > completed ? "locked" : "open",
    );
  }
  state(h.get("ls-row-recap"), active === -1 ? "active" : "open");

  // "Mark as complete" belongs to the open lesson; later lessons in the
  // montage have no check-ins, so they can be completed right away.
  const complete = h.get("ls-complete");
  const current = Math.max(active, 0);
  const saving = active <= 0 && tC >= 0.53 && tC < 0.55;
  const currentDone = active === -1 || completed > current;
  on(complete, tC >= 0.5 && tC < 0.53, "press");
  state(complete, !passed ? "disabled" : currentDone ? "done" : "ready");
  text(
    h.get("ls-complete-label"),
    saving ? "Saving..." : currentDone ? "Completed" : "Mark as complete",
  );
  text(h.get("ls-pct"), `${completed * 25}% complete`);
  style(h.get("ls-bar"), "transform", `scaleX(${completed / 4})`);

  const lessonSlug = [
    "what-is-version-control",
    "your-first-commit",
    "branching",
    "merging",
  ];
  text(
    h.get("panel-lesson-url"),
    `khouryodyssey.org/d/git-fundamentals/${active === -1 ? "recap" : lessonSlug[Math.max(active, 0)]}`,
  );

  // Moving through the remaining lessons, then on to the Recap page.
  opacity(h.get("ls-skel"), ease(tC, 0.58, 0.61));
  text(h.get("ls-skel-title"), SAMPLE_LESSONS[Math.max(active, 1)]);
  opacity(h.get("ls-view-lesson"), 1 - ease(tC, 0.77, 0.8));
  opacity(h.get("ls-view-recap"), ease(tC, 0.8, 0.84));
  const modal = ease(tC, 0.84, 0.88);
  opacity(h.get("ls-modal"), modal);
  style(
    h.get("ls-modal-card"),
    "transform",
    `scale(${(0.94 + 0.06 * modal).toFixed(3)})`,
  );
  style(
    h.get("ls-confetti"),
    "--b",
    ease(tC, 0.85, 0.99, easeOutCubic).toFixed(3),
  );

  // The map mirrors progress: each completed lesson lights its buoy.
  for (let i = 0; i < 4; i++)
    opacity(h.get(`buoy-lit-${i}`), completed > i ? 1 : 0);
}

/** Voyage: tV is local time in "voyage". */
/**
 * Voyage: tV is local time in "voyage". Git Fundamentals was completed in the
 * previous chapter, so its island is already complete when the page opens;
 * "Continue Voyage" then points at the first incomplete island.
 */
export function applyVoyage(h: Hooks, tV: number) {
  on(h.get("vy-continue"), tV >= 0.74 && tV < 0.78, "press");
  on(h.get("vy-next"), tV >= 0.76);
}

/** Create: tCr is local time in "create". */
export function applyCreate(h: Hooks, tCr: number) {
  on(h.get("cr-new"), tCr >= 0.6 && tCr < 0.64, "press");
  // The nav highlights "Create" on /my-content but not on /draft routes.
  on(h.get("panel-create-nav-Create"), tCr < 0.67);
  const draft = ease(tCr, 0.66, 0.7);
  opacity(h.get("cr-view-mine"), 1 - draft);
  opacity(h.get("cr-view-draft"), draft);
  text(
    h.get("panel-create-url"),
    tCr >= 0.67
      ? "khouryodyssey.org/draft/d/testing-with-pytest/why-test"
      : "khouryodyssey.org/my-content",
  );
  on(h.get("cr-slash-line"), tCr >= 0.72 && tCr < 0.83);
  on(h.get("cr-slash"), tCr >= 0.73 && tCr < 0.83);
  on(h.get("cr-mc"), tCr >= 0.78 && tCr < 0.83);
  on(h.get("cr-quiz"), tCr >= 0.83);
  on(h.get("cr-lesson-2"), tCr >= 0.88);
}

/** Groups: tG is local time in "groups". */
export function applyGroup(h: Hooks, tG: number) {
  for (let i = 0; i < 3; i++) on(h.get(`gr-due-${i}`), tG >= 0.64 + i * 0.04);
  const progress = tG >= 0.84;
  on(h.get("gr-tab-0"), !progress);
  on(h.get("gr-tab-3"), progress);
  on(h.get("gr-view-droplets"), !progress);
  on(h.get("gr-view-progress"), progress);
}

/** Activity: tA is local time in "activity". */
export function applyActivity(h: Hooks, tA: number) {
  for (let i = 0; i < 3; i++) on(h.get(`ac-card-${i}`), tA >= 0.34 + i * 0.07);
  on(h.get("ac-kudos"), tA >= 0.6);
  const droplets = tA >= 0.72;
  on(h.get("ac-nav-0"), !droplets);
  on(h.get("ac-nav-1"), droplets);
  on(h.get("ac-view-feed"), !droplets);
  on(h.get("ac-view-droplets"), droplets);
  text(
    h.get("panel-activity-url"),
    droplets
      ? "khouryodyssey.org/activity/droplets"
      : "khouryodyssey.org/activity",
  );
}

/** Map state that only depends on progress (not on the camera). */
export function applyWorld(h: Hooks, p: number) {
  const E = (id: ChapterId, a: number, b: number) =>
    ease(p, at(id, a), at(id, b));

  // Explore: the voyage route, its numbered stops and the optional branch.
  const voyDraw = E("explore", 0.45, 0.75);
  attr(
    h.get("voy-line"),
    "stroke-dashoffset",
    (VOYAGE_ROUTE.total * (1 - voyDraw)).toFixed(1),
  );
  opacity(h.get("voy-branch"), E("explore", 0.7, 0.8));
  for (let n = 1; n <= 4; n++) {
    opacity(
      h.get(`voy-step-${n}`),
      E("explore", 0.5 + n * 0.06, 0.56 + n * 0.06),
    );
  }
  opacity(h.get("voy-available"), E("voyage", 0.3, 0.4));
  for (const n of [3, 4])
    opacity(h.get(`voy-lock-${n}`), E("voyage", 0.34, 0.42));

  // Filtering by focus area dims everything that isn't technical.
  const dim =
    ease(local("discover", p), 0.62, 0.72) *
    (1 - ease(local("learn", p), 0.2, 0.4));
  for (const islet of DROPLET_ISLETS) {
    opacity(
      h.get(`islet-${islet.id}`),
      TECH_ISLETS.has(islet.id) ? 1 : 1 - 0.65 * dim,
    );
  }
  opacity(h.get("chain-0"), 1 - 0.65 * dim);
  opacity(h.get("chain-1"), 1 - 0.65 * dim);

  // Git Fundamentals: lesson buoys appear on arrival; a ring when complete.
  for (let i = 0; i < 4; i++) {
    opacity(h.get(`buoy-${i}`), E("learn", 0.22 + i * 0.03, 0.28 + i * 0.03));
  }
  opacity(h.get("git-done"), E("checkin", 0.8, 0.88));

  // Create: a frame, then a new island sketched lesson by lesson.
  opacity(h.get("draft-frame"), E("create", 0.14, 0.26));
  attr(
    h.get("draft-outline"),
    "stroke-dashoffset",
    (1000 * (1 - E("create", 0.2, 0.44))).toFixed(1),
  );
  opacity(h.get("draft-fill"), 0.8 * E("create", 0.4, 0.5));
  opacity(h.get("draft-buoy-0"), E("create", 0.68, 0.72));
  opacity(h.get("draft-buoy-1"), E("create", 0.88, 0.92));

  opacity(h.get("harbor-ring"), E("groups", 0.36, 0.46));
  opacity(h.get("open-course"), E("finale", 0.62, 0.78));
}

// ─── Geometry measured from the DOM on mount and resize ──────────────────────

export type Geometry = {
  vw: number;
  vh: number;
  layout: Layout;
  compactPanels: boolean;
  panel: { left: number; top: number; scale: number; w: number; h: number };
  slots: Point[];
  cardSize: { w: number; h: number };
  quizOffset: number;
};

export function panelBox(
  vw: number,
  vh: number,
  layout: Layout,
  compactPanels: boolean,
) {
  const size = PANEL_SIZE[compactPanels ? "compact" : "wide"];
  const [x0, x1, y0, y1] =
    layout === "wide" ? [0.37, 0.975, 0.06, 0.95] : [0.03, 0.97, 0.34, 0.985];
  const availW = (x1 - x0) * vw;
  const availH = (y1 - y0) * vh;
  const scale = Math.min(availW / size.w, availH / size.h, 1.2);
  return {
    left: x0 * vw + (availW - size.w * scale) / 2,
    top: y0 * vh + (availH - size.h * scale) / (layout === "wide" ? 2 : 1),
    scale,
    w: size.w,
    h: size.h,
  };
}

export function measure(
  h: Hooks,
  vw: number,
  vh: number,
  layout: Layout,
  compactPanels: boolean,
): Geometry {
  const slots: Point[] = [];
  let cardSize = { w: 0, h: 0 };
  for (let i = 0; ; i++) {
    const card = h.get(`ex-card-${i}`) as HTMLElement | undefined;
    if (!card) break;
    slots.push({ x: card.offsetLeft, y: card.offsetTop });
    cardSize = { w: card.offsetWidth, h: card.offsetHeight };
  }
  const quiz = h.get("ls-quiz") as HTMLElement | undefined;
  return {
    vw,
    vh,
    layout,
    compactPanels,
    panel: panelBox(vw, vh, layout, compactPanels),
    slots,
    cardSize,
    quizOffset: quiz ? Math.max(quiz.offsetTop - 12, 0) : 0,
  };
}

// ─── The frame renderer ──────────────────────────────────────────────────────

type PanelSpec = {
  id: string;
  open: (p: number) => number;
  origin: (p: number, boat: Point) => Point;
  fold?: boolean;
};

const PANELS: PanelSpec[] = [
  {
    id: "panel-explore",
    open: (p) =>
      ease(local("discover", p), 0.04, 0.2) *
      (1 - ease(local("learn", p), 0.02, 0.14)),
    origin: (p) => (p < at("learn", 0) ? FIELD_CENTER : GIT),
  },
  {
    id: "panel-lesson",
    open: (p) =>
      ease(local("learn", p), 0.36, 0.5) *
      (1 - ease(local("voyage", p), 0, 0.1)),
    origin: () => GIT,
  },
  {
    id: "panel-voyage",
    open: (p) =>
      ease(local("voyage", p), 0.44, 0.58) *
      (1 - ease(local("create", p), 0, 0.1)),
    origin: () => VOYAGE_ISLANDS[1],
  },
  {
    id: "panel-create",
    open: (p) =>
      ease(local("create", p), 0.48, 0.62) *
      (1 - ease(local("groups", p), 0, 0.1)),
    origin: () => DRAFT_ISLAND,
  },
  {
    id: "panel-group",
    open: (p) =>
      ease(local("groups", p), 0.48, 0.62) *
      (1 - ease(local("activity", p), 0, 0.1)),
    origin: () => HARBOR,
  },
  {
    id: "panel-activity",
    open: (p) =>
      ease(local("activity", p), 0.12, 0.3) *
      (1 - ease(local("finale", p), 0, 0.14)),
    origin: (_p, boat) => boat,
    fold: true,
  },
];

const CAPTION_IDS = CHAPTER_BOUNDS.map((b) => b.id);

export function createRenderer(h: Hooks, geo: Geometry) {
  const { vw, vh, layout, panel } = geo;
  const regions = REGIONS[layout];

  // Camera keyframes → smooth per-channel interpolators.
  const keyP: number[] = [];
  const keyX: number[] = [];
  const keyY: number[] = [];
  const keyS: number[] = [];
  // On short screens the finale's text needs more room above the map.
  const lower =
    layout === "wide" && vh < 760
      ? { x: 0.02, y: 0.56, w: 0.96, h: 0.42 }
      : regions.lower;
  for (const [chapter, t, rect, region] of CAMERA_KEYS) {
    const cam = fitCamera(
      rect,
      region === "lower" ? lower : regions[region],
      vw,
      vh,
    );
    keyP.push(at(chapter, t));
    keyX.push(cam.cx);
    keyY.push(cam.cy);
    keyS.push(Math.log(cam.s));
  }
  const camX = createMonotone(keyP, keyX);
  const camY = createMonotone(keyP, keyY);
  const camS = createMonotone(keyP, keyS);
  const s0 = Math.exp(keyS[0]);

  const boatDist = createMonotone(
    BOAT_KEYS.map(([c, t]) => at(c, t)),
    BOAT_KEYS.map(([, , stop]) => stopDist(stop)),
  );

  // The dashed "course ahead" for each planned leg.
  const legs = PLANNED_LEGS.map((leg, i) => {
    const el = h.get(`plan-${i}`);
    attr(el, "d", ROUTE.slicePath(stopDist(leg.from), stopDist(leg.to)));
    const arrive = BOAT_KEYS.find(
      ([c, t, stop]) => stop === leg.to && at(c, t) > at(...leg.sail),
    );
    return {
      el,
      show: at(...leg.show),
      arrive: arrive ? at(arrive[0], arrive[1]) : 1,
    };
  });

  const svg = h.get("world-svg");
  const boat = h.get("boat");
  const trail = h.get("trail");
  const wake = h.get("wake");
  const labels = MAP_LABELS.map((l) => ({ ...l, el: h.get(`label-${l.id}`) }));
  const fleet = FLEET.map((_, i) => h.get(`fleet-${i}`));
  const mist = MIST.map((_, i) => h.get(`mist-${i}`));
  const far = h.get("far");
  const scrim = h.get("scrim");
  const note = h.get("example-note");
  const hairline = h.get("progress-line");
  const captions = CAPTION_IDS.map((id) => h.get(`caption-${id}`));
  const finale = h.get("finale");
  const drawn = ["voy-line", "draft-outline"].map((id) => h.get(id));

  let facing = 1;
  const boatBase = layout === "wide" ? 46 : 34;

  const screen = (cam: Camera, x: number, y: number) =>
    worldToScreen(cam, x, y, vw, vh);
  const cardCenterOnScreen = (i: number) => {
    const slot = geo.slots[i];
    return {
      x: panel.left + (slot.x + geo.cardSize.w / 2) * panel.scale,
      y: panel.top + (slot.y + geo.cardSize.h / 2) * panel.scale,
    };
  };

  return function render(p: number) {
    const cam: Camera = { cx: camX(p), cy: camY(p), s: Math.exp(camS(p)) };
    const vbW = vw / cam.s;
    const vbH = vh / cam.s;
    attr(
      svg,
      "viewBox",
      `${(cam.cx - vbW / 2).toFixed(2)} ${(cam.cy - vbH / 2).toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}`,
    );
    const px = 1 / cam.s;

    // The boat, its trail and its wake.
    const dist = boatDist(p);
    const pos = ROUTE.at(dist);
    const speed =
      Math.abs(boatDist(p + 0.0008) - boatDist(p - 0.0008)) / 0.0016;
    const moving = clamp01(speed / 9000);
    if (moving > 0.05) facing = Math.cos(pos.angle) >= 0 ? 1 : -1;
    const sp = screen(cam, pos.x, pos.y);
    const k = Math.min(Math.max(Math.pow(cam.s / s0, 0.3), 0.62), 1.45);
    const tilt =
      Math.max(-7, Math.min(7, ((pos.angle * 180) / Math.PI) * facing * 0.18)) *
      moving;
    style(
      boat,
      "transform",
      `translate(${(sp.x - boatBase / 2).toFixed(1)}px, ${(sp.y - boatBase * 0.86).toFixed(1)}px) scale(${(k * facing).toFixed(3)}, ${k.toFixed(3)}) rotate(${(tilt * facing).toFixed(2)}deg)`,
    );
    attr(trail, "stroke-dashoffset", (ROUTE.total - dist).toFixed(1));
    style(trail, "stroke-width", (2.2 * px).toFixed(3));
    if (moving > 0.02) {
      attr(wake, "d", ROUTE.slicePath(Math.max(dist - 150, 0), dist));
    }
    opacity(wake, 0.9 * moving);
    style(wake, "stroke-width", (5 * px).toFixed(3));
    for (const el of drawn) style(el, "stroke-width", (2.2 * px).toFixed(3));

    for (const leg of legs) {
      opacity(
        leg.el,
        ease(p, leg.show, leg.show + 0.012) *
          (1 - ease(p, leg.arrive - 0.004, leg.arrive + 0.008)),
      );
    }

    // Other boats gather in the harbor for Groups.
    const gIn = ease(local("groups", p), 0.08, 0.14);
    FLEET.forEach((f, i) => {
      const el = fleet[i];
      if (!el) return;
      const t = ease(local("groups", p), 0.12 + i * 0.04, 0.4 + i * 0.03);
      const fp = quad(f.from, f.via, f.to, t);
      const fs = screen(cam, fp.x, fp.y);
      const dir = f.to.x >= f.from.x ? 1 : -1;
      const fk = k * 0.82;
      style(
        el,
        "transform",
        `translate(${(fs.x - boatBase / 2).toFixed(1)}px, ${(fs.y - boatBase * 0.86).toFixed(1)}px) scale(${(fk * dir).toFixed(3)}, ${fk.toFixed(3)})`,
      );
      opacity(el, gIn);
    });

    // Map labels stay crisp as HTML.
    for (const l of labels) {
      if (!l.el) continue;
      const o =
        ease(p, l.from, l.from + 0.01) * (1 - ease(p, l.to - 0.008, l.to));
      opacity(l.el, o);
      if (o > 0) {
        const ls = screen(cam, l.x, l.y);
        style(
          l.el,
          "transform",
          `translate(${ls.x.toFixed(1)}px, ${ls.y.toFixed(1)}px) translate(-50%, -50%)`,
        );
      }
    }

    // Parallax: far glow drifts slowly, mist passes in front of the map.
    const ox = (cam.cx - WORLD.w / 2) * cam.s;
    const oy = (cam.cy - WORLD.h / 2) * cam.s;
    style(
      far,
      "transform",
      `translate(${(-ox * 0.08).toFixed(1)}px, ${(-oy * 0.08).toFixed(1)}px)`,
    );

    // UI panels grow out of their islands (and fold out of the ship's log).
    let reveal = 0;
    for (const spec of PANELS) {
      const root = h.get(spec.id);
      if (!root) continue;
      const e = spec.open(p);
      reveal = Math.max(reveal, e);
      if (e <= 0.001) {
        style(root, "visibility", "hidden");
        continue;
      }
      style(root, "visibility", "visible");
      const o = spec.origin(p, pos);
      const os = screen(cam, o.x, o.y);
      const lx = (os.x - panel.left) / panel.scale;
      const ly = (os.y - panel.top) / panel.scale;
      const far = Math.max(
        Math.hypot(lx, ly),
        Math.hypot(panel.w - lx, ly),
        Math.hypot(lx, panel.h - ly),
        Math.hypot(panel.w - lx, panel.h - ly),
      );
      const surface = h.get(`${spec.id}-surface`);
      style(
        surface,
        "clip-path",
        `circle(${(far * easeOutCubic(e)).toFixed(1)}px at ${lx.toFixed(1)}px ${ly.toFixed(1)}px)`,
      );
      opacity(surface, easeOutCubic(span(e, 0, 0.4)));
      opacity(h.get(`${spec.id}-content`), span(e, 0.45, 1));
      const grow = 0.94 + 0.06 * e;
      const cx = (panel.w * panel.scale) / 2;
      const cy = (panel.h * panel.scale) / 2;
      const fold = spec.fold
        ? ` perspective(1400px) rotateX(${((1 - e) * 38).toFixed(2)}deg)`
        : "";
      style(
        root,
        "transform",
        `translate(${(panel.left + cx).toFixed(1)}px, ${(panel.top + cy).toFixed(1)}px)${fold} scale(${(panel.scale * grow).toFixed(4)}) translate(${(-panel.w / 2).toFixed(1)}px, ${(-panel.h / 2).toFixed(1)}px)`,
      );
      opacity(root, 1);
    }
    opacity(scrim, reveal * 0.55);
    opacity(note, reveal);
    for (let i = 0; i < mist.length; i++) {
      const el = mist[i];
      if (!el) continue;
      const m = MIST[i];
      const ms = worldToScreen({ ...cam, s: cam.s * 1.35 }, m.x, m.y, vw, vh);
      style(
        el,
        "transform",
        `translate(${ms.x.toFixed(1)}px, ${ms.y.toFixed(1)}px) translate(-50%, -50%)`,
      );
      opacity(
        el,
        (1 - 0.7 * reveal) * (1 - 0.65 * ease(local("finale", p), 0.2, 0.6)),
      );
    }

    // Explore cards rise from their islets into the grid.
    const tD = local("discover", p);
    applyExplore(h, tD, geo.slots, (i) => {
      const f = ease(tD, 0.1 + i * 0.03, 0.32 + i * 0.03, easeOutCubic);
      const islet = ISLET[SAMPLE_DROPLETS[i].islet ?? "git"];
      const from = screen(cam, islet.x, islet.y);
      const to = cardCenterOnScreen(i);
      return {
        dx: ((from.x - to.x) / panel.scale) * (1 - f),
        dy: ((from.y - to.y) / panel.scale) * (1 - f),
        k: lerp(0.1, 1, f),
        o: clamp01(f * 2.5),
      };
    });
    applyLesson(h, local("learn", p), local("checkin", p), geo.quizOffset);
    applyVoyage(h, local("voyage", p));
    applyCreate(h, local("create", p));
    applyGroup(h, local("groups", p));
    applyActivity(h, local("activity", p));
    applyWorld(h, p);

    // Captions: one per chapter, cross-fading as chapters change.
    CHAPTER_BOUNDS.forEach((b, i) => {
      const el = captions[i];
      if (!el) return;
      const t = local(b.id, p);
      let o: number;
      if (b.id === "departure") o = 1 - ease(t, 0.84, 0.96);
      else if (b.id === "finale") o = 0;
      else o = window01(t, 0.02, 0.12, 0.88, 0.98);
      opacity(el, o);
      style(
        el,
        "transform",
        `translateY(${((1 - Math.min(o * 1.4, 1)) * 14).toFixed(1)}px)`,
      );
    });
    const fin = ease(local("finale", p), 0.52, 0.66);
    opacity(finale, fin);
    style(finale, "transform", `translateY(${((1 - fin) * 18).toFixed(1)}px)`);
    // Stays in the accessibility tree; only clickable once it's on screen.
    style(finale, "pointer-events", fin > 0.5 ? "auto" : "none");
    style(hairline, "transform", `scaleX(${p.toFixed(4)})`);
  };
}
