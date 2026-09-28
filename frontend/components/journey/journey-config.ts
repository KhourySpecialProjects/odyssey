// Everything the homepage journey shows is defined here: the world layout,
// the chapters and their copy, and the camera and boat keyframes.
//
// Product accuracy: every feature, label and flow shown in the journey exists
// in the app. Comments cite where. Droplet, voyage, group and person names are
// illustrative examples (the journey says so on screen), and the journey never
// shows counts, ratings or other statistics.

import {
  createRoute,
  type FocusRect,
  type Point,
  type Region,
} from "./journey-math";

export const WORLD = { w: 4000, h: 2400 };

// ─── Chapters ────────────────────────────────────────────────────────────────

export type ChapterId =
  | "departure"
  | "explore"
  | "discover"
  | "learn"
  | "checkin"
  | "voyage"
  | "create"
  | "groups"
  | "activity"
  | "finale";

export type Chapter = {
  id: ChapterId;
  /** Scroll length in stage heights. */
  length: number;
  eyebrow: string;
  title: string;
  body: string;
};

export const CHAPTERS: Chapter[] = [
  {
    id: "departure",
    length: 1,
    eyebrow: "Khoury Odyssey",
    title: "Your learning journey starts here.",
    // app/(general)/about/page.tsx
    body: "Odyssey is an on-demand learning platform built by Khoury College, for Khoury College.",
  },
  {
    id: "explore",
    length: 1.2,
    eyebrow: "Explore",
    // Explore page subtitle: app/(general)/explore/page.tsx
    title: "Discover Droplets, Playlists, and Voyages.",
    // Droplets: first-visit popup copy. Voyages: voyage form tour copy.
    body: "Droplets are bite-sized learning modules. Playlists collect Droplets. Voyages chart a learning path, island by island.",
  },
  {
    id: "discover",
    length: 1.5,
    eyebrow: "Explore",
    title: "Find your next Droplet.",
    // Search, Focus Area, Type and Tags filters: components/explore/*
    body: "Search by name, then narrow the map by focus area, type, and tags.",
  },
  {
    id: "learn",
    length: 1.5,
    eyebrow: "Droplets",
    title: "Learn lesson by lesson.",
    // Enroll button, lesson sidebar, highlights and notes: components/droplets/*
    body: "Enroll, then work through each lesson. Highlight passages and keep notes as you go.",
  },
  {
    id: "checkin",
    length: 1.3,
    eyebrow: "Droplets",
    title: "Check in on what you’ve learned.",
    // Multiple-choice (and true/false) check-ins gate "Next" in
    // components/droplets/footer.tsx; the Recap page collects notes.
    body: "Multiple-choice check-ins unlock the next lesson. Your Recap collects the notes and highlights you made along the way.",
  },
  {
    id: "voyage",
    length: 1.5,
    eyebrow: "Voyages",
    title: "Follow a Voyage, island by island.",
    // Voyage nodes are playlists or droplets and complete automatically:
    // lib/voyage-progress.ts, lib/requests/enrollment.ts
    body: "Each island is a Playlist or a single Droplet. Enroll, and islands are marked complete as you finish their Droplets.",
  },
  {
    id: "create",
    length: 1.4,
    eyebrow: "Create",
    title: "Chart new islands.",
    // Draft editor slash menu; role rules in config/general.ts and
    // components/requests/content-creation-request.tsx
    body: "Content creators draft Droplets lesson by lesson, adding check-ins, code, and more. Students can request the Content Creator role.",
  },
  {
    id: "groups",
    length: 1.3,
    eyebrow: "Groups",
    title: "Set a shared course.",
    // components/group/group-management-form.tsx, app/(groups)/g/due-dates
    body: "Group creators add members, assign Droplets, Playlists, and Voyages, and set due dates for Droplets and Playlists.",
  },
  {
    id: "activity",
    length: 1.2,
    eyebrow: "Activity",
    title: "Keep a log of the voyage.",
    // Welcome announcement copy (first-visit-popup.tsx) and the Activity nav
    body: "Your feed shows updates to your droplets, playlists, and groups, next to everything you’ve enrolled in.",
  },
  {
    id: "finale",
    length: 1.4,
    eyebrow: "Khoury Odyssey",
    // Homepage hero copy: app/(general)/page.tsx
    title: "Chart your course through Khoury College.",
    body: "Explore Droplets, Playlists, and Voyages on the learning platform built by Khoury College, for Khoury College.",
  },
];

export type ChapterBounds = { id: ChapterId; start: number; end: number };

export const TOTAL_LENGTH = CHAPTERS.reduce((sum, c) => sum + c.length, 0);

/** Each chapter's share of overall progress (0–1). */
export const CHAPTER_BOUNDS: ChapterBounds[] = (() => {
  let acc = 0;
  return CHAPTERS.map((c) => {
    const start = acc / TOTAL_LENGTH;
    acc += c.length;
    return { id: c.id, start, end: acc / TOTAL_LENGTH };
  });
})();

const boundsById = Object.fromEntries(
  CHAPTER_BOUNDS.map((b) => [b.id, b]),
) as Record<ChapterId, ChapterBounds>;

/** Overall progress at local time `t` (0–1) of a chapter. */
export function at(id: ChapterId, t: number) {
  const b = boundsById[id];
  return b.start + (b.end - b.start) * t;
}

/** Local time (unclamped) of overall progress `p` within a chapter. */
export function local(id: ChapterId, p: number) {
  const b = boundsById[id];
  return (p - b.start) / (b.end - b.start);
}

// ─── World geometry ──────────────────────────────────────────────────────────

export type Islet = {
  id: string;
  x: number;
  y: number;
  r: number;
  seed: number;
};

/** Single Droplets: small islands in the Explore archipelago. */
export const DROPLET_ISLETS: Islet[] = [
  { id: "git", x: 1330, y: 1325, r: 46, seed: 7 },
  { id: "d1", x: 1060, y: 1240, r: 34, seed: 11 },
  { id: "d2", x: 1190, y: 1090, r: 28, seed: 23 },
  { id: "d4", x: 1180, y: 1560, r: 26, seed: 31 },
  { id: "d5", x: 1470, y: 1150, r: 32, seed: 43 },
  { id: "d6", x: 1590, y: 1450, r: 26, seed: 53 },
  { id: "d7", x: 960, y: 1570, r: 22, seed: 61 },
  { id: "d8", x: 1400, y: 960, r: 22, seed: 71 },
  { id: "d9", x: 1690, y: 1270, r: 30, seed: 83 },
];

/** Playlists: chains of Droplets. */
export const PLAYLIST_CHAINS: Point[][] = [
  [
    { x: 880, y: 930 },
    { x: 975, y: 880 },
    { x: 1070, y: 905 },
    { x: 1160, y: 860 },
  ],
  [
    { x: 1500, y: 1700 },
    { x: 1600, y: 1755 },
    { x: 1710, y: 1715 },
    { x: 1810, y: 1770 },
  ],
];

/** Voyage islands. The first island is the Git Fundamentals droplet. */
export const VOYAGE_ISLANDS = [
  { id: "v1", x: 1330, y: 1325, r: 46, seed: 7, step: 1 },
  { id: "v2", x: 1900, y: 1000, r: 62, seed: 97, step: 2 },
  { id: "v3", x: 2330, y: 760, r: 56, seed: 101, step: 3 },
  { id: "v4", x: 2780, y: 900, r: 56, seed: 113, step: 4 },
];
export const VOYAGE_BRANCH = { id: "vb", x: 2130, y: 1190, r: 32, seed: 127 };
export const VOYAGE_ROUTE = createRoute(
  VOYAGE_ISLANDS.map(({ x, y }) => ({ x, y })),
  30,
);

/** Lessons of the Git Fundamentals droplet, as buoys around its island. */
export const LESSON_BUOYS: Point[] = [
  { x: 1232, y: 1318 },
  { x: 1298, y: 1230 },
  { x: 1405, y: 1245 },
  { x: 1438, y: 1332 },
];

/** The drafting frame and the new island a creator sketches inside it. */
export const DRAFT_FRAME = { x: 2770, y: 1450, w: 520, h: 380 };
export const DRAFT_ISLAND = { x: 3060, y: 1620, r: 74, seed: 131 };
export const DRAFT_BUOYS: Point[] = [
  { x: 2960, y: 1700 },
  { x: 3150, y: 1705 },
];

export const HARBOR_LAND = { x: 3470, y: 900, r: 150, seed: 139 };

// ─── The boat's route ────────────────────────────────────────────────────────

export const ROUTE_WAYPOINTS: Point[] = [
  { x: 430, y: 1660 }, // 0 dock
  { x: 640, y: 1560 },
  { x: 880, y: 1400 }, // 2 Explore
  { x: 1090, y: 1450 },
  { x: 1392, y: 1386 }, // 4 Git Fundamentals
  { x: 1588, y: 1178 }, // on the voyage line
  { x: 1822, y: 1062 }, // 6 Voyage island 2
  { x: 2250, y: 1330 },
  { x: 2640, y: 1640 },
  { x: 2860, y: 1760 }, // 9 drafting frame
  { x: 3180, y: 1560 },
  { x: 3330, y: 1300 },
  { x: 3420, y: 1150 }, // 12 harbor
  { x: 3640, y: 1240 },
  { x: 3900, y: 1330 }, // 14 open sea
];

/** The boat's route, and the route drawn between the voyage's islands. */
export const ROUTE = createRoute(ROUTE_WAYPOINTS);

/** Waypoint indexes where the boat stops. */
export const STOPS = {
  dock: 0,
  explore: 2,
  learn: 4,
  voyage: 6,
  create: 9,
  harbor: 12,
  open: 14,
} as const;

export type StopId = keyof typeof STOPS;

/** When the boat is at each stop; repeated stops are holds. */
export const BOAT_KEYS: [ChapterId, number, StopId][] = [
  ["departure", 0, "dock"],
  ["departure", 0.45, "dock"],
  ["explore", 0.45, "explore"],
  ["learn", 0.06, "explore"],
  ["learn", 0.34, "learn"],
  ["voyage", 0.08, "learn"],
  ["voyage", 0.42, "voyage"],
  ["create", 0.04, "voyage"],
  ["create", 0.32, "create"],
  ["groups", 0.04, "create"],
  ["groups", 0.34, "harbor"],
  ["finale", 0.2, "harbor"],
  ["finale", 0.9, "open"],
];

/** The dashed "course ahead" shown before the boat sets off on a leg. */
export const PLANNED_LEGS: {
  from: StopId;
  to: StopId;
  show: [ChapterId, number];
  sail: [ChapterId, number];
}[] = [
  {
    from: "dock",
    to: "explore",
    show: ["departure", 0.2],
    sail: ["departure", 0.45],
  },
  {
    from: "explore",
    to: "learn",
    show: ["discover", 0.84],
    sail: ["learn", 0.06],
  },
  {
    from: "learn",
    to: "voyage",
    show: ["checkin", 0.96],
    sail: ["voyage", 0.08],
  },
];

// ─── Camera ──────────────────────────────────────────────────────────────────

/**
 * Where the camera can frame its subject: the whole stage, the area beside
 * the chapter caption ("map"), or the strip left free by an open UI panel
 * ("aside"). Values are fractions of the stage.
 */
export type RegionId = "full" | "map" | "aside" | "lower";
export type Layout = "wide" | "compact";

export const REGIONS: Record<Layout, Record<RegionId, Region>> = {
  wide: {
    full: { x: 0, y: 0, w: 1, h: 1 },
    map: { x: 0.34, y: 0.06, w: 0.64, h: 0.88 },
    aside: { x: 0.02, y: 0.44, w: 0.33, h: 0.5 },
    lower: { x: 0.02, y: 0.4, w: 0.96, h: 0.58 },
  },
  compact: {
    full: { x: 0, y: 0.06, w: 1, h: 0.88 },
    map: { x: 0, y: 0.3, w: 1, h: 0.66 },
    aside: { x: 0, y: 0.2, w: 1, h: 0.17 },
    lower: { x: 0, y: 0.46, w: 1, h: 0.52 },
  },
};

export type CameraKey = [ChapterId, number, FocusRect, RegionId];

const EXPLORE: FocusRect = { cx: 1720, cy: 1200, w: 2350, h: 1150 };
const FIELD: FocusRect = { cx: 1290, cy: 1300, w: 1250, h: 950 };
const GIT: FocusRect = { cx: 1335, cy: 1335, w: 380, h: 300 };
const VOYAGE: FocusRect = { cx: 2080, cy: 1050, w: 1720, h: 980 };
const DRAFT: FocusRect = { cx: 3030, cy: 1640, w: 700, h: 520 };
const HARBOR: FocusRect = { cx: 3470, cy: 1120, w: 820, h: 640 };
const WHOLE: FocusRect = { cx: 2080, cy: 1260, w: 3900, h: 2100 };

export const CAMERA_KEYS: CameraKey[] = [
  ["departure", 0, { cx: 660, cy: 1560, w: 1150, h: 780 }, "map"],
  ["departure", 0.45, { cx: 660, cy: 1560, w: 1150, h: 780 }, "map"],
  ["explore", 0.4, EXPLORE, "map"],
  ["discover", 0.02, EXPLORE, "map"],
  ["discover", 0.1, FIELD, "map"],
  ["discover", 0.2, { cx: 1300, cy: 1300, w: 840, h: 720 }, "aside"],
  ["learn", 0.04, { cx: 1300, cy: 1300, w: 840, h: 720 }, "aside"],
  ["learn", 0.32, { ...GIT, w: 460, h: 360 }, "map"],
  ["learn", 0.46, GIT, "aside"],
  ["voyage", 0.04, GIT, "aside"],
  ["voyage", 0.26, VOYAGE, "map"],
  ["voyage", 0.42, VOYAGE, "map"],
  ["voyage", 0.56, { cx: 2060, cy: 1030, w: 1320, h: 860 }, "aside"],
  ["create", 0.04, { cx: 2060, cy: 1030, w: 1320, h: 860 }, "aside"],
  ["create", 0.3, DRAFT, "map"],
  ["create", 0.44, DRAFT, "map"],
  ["create", 0.58, { cx: 3040, cy: 1640, w: 560, h: 440 }, "aside"],
  ["groups", 0.04, { cx: 3040, cy: 1640, w: 560, h: 440 }, "aside"],
  ["groups", 0.3, HARBOR, "map"],
  ["groups", 0.44, HARBOR, "map"],
  ["groups", 0.58, { cx: 3470, cy: 1100, w: 640, h: 480 }, "aside"],
  ["activity", 0.02, { cx: 3470, cy: 1100, w: 640, h: 480 }, "aside"],
  ["activity", 0.2, { cx: 3430, cy: 1140, w: 380, h: 300 }, "aside"],
  ["finale", 0.08, { cx: 3430, cy: 1140, w: 380, h: 300 }, "aside"],
  ["finale", 0.6, WHOLE, "lower"],
  ["finale", 1, WHOLE, "lower"],
];

// ─── Map labels (HTML, so text stays crisp at any zoom) ──────────────────────

export type MapLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  /** Visible between these overall progress values. */
  from: number;
  to: number;
  tone?: "region" | "island";
};

export const MAP_LABELS: MapLabel[] = [
  {
    id: "droplets",
    text: "Droplets",
    x: 1250,
    y: 1170,
    from: at("explore", 0.35),
    to: at("discover", 0.1),
  },
  {
    id: "playlists",
    text: "Playlists",
    x: 1020,
    y: 800,
    from: at("explore", 0.45),
    to: at("discover", 0.1),
  },
  {
    id: "voyages",
    text: "Voyages",
    x: 2330,
    y: 650,
    from: at("explore", 0.55),
    to: at("discover", 0.1),
  },
  {
    id: "v1",
    text: "Git Fundamentals",
    x: 1330,
    y: 1420,
    from: at("voyage", 0.2),
    to: at("voyage", 0.46),
    tone: "island",
  },
  {
    id: "v2",
    text: "Testing Essentials",
    x: 1900,
    y: 1110,
    from: at("voyage", 0.24),
    to: at("voyage", 0.46),
    tone: "island",
  },
  {
    id: "v3",
    text: "Web Development",
    x: 2330,
    y: 860,
    from: at("voyage", 0.28),
    to: at("voyage", 0.46),
    tone: "island",
  },
  {
    id: "v4",
    text: "Software Design",
    x: 2780,
    y: 1000,
    from: at("voyage", 0.32),
    to: at("voyage", 0.46),
    tone: "island",
  },
  {
    id: "vb",
    text: "Debugging Basics",
    x: 2130,
    y: 1265,
    from: at("voyage", 0.36),
    to: at("voyage", 0.46),
    tone: "island",
  },
  {
    id: "draft",
    text: "Draft",
    x: 3060,
    y: 1520,
    from: at("create", 0.42),
    to: at("create", 0.5),
    tone: "island",
  },
  {
    id: "group",
    text: "Group",
    x: 3470,
    y: 1290,
    from: at("groups", 0.36),
    to: at("groups", 0.5),
  },
  {
    id: "f-explore",
    text: "Explore",
    x: 1290,
    y: 820,
    from: at("finale", 0.5),
    to: 2,
  },
  {
    id: "f-learn",
    text: "Learn",
    x: 1330,
    y: 1440,
    from: at("finale", 0.54),
    to: 2,
  },
  {
    id: "f-voyages",
    text: "Voyages",
    x: 2330,
    y: 640,
    from: at("finale", 0.58),
    to: 2,
  },
  {
    id: "f-create",
    text: "Create",
    x: 3030,
    y: 1900,
    from: at("finale", 0.62),
    to: 2,
  },
  {
    id: "f-groups",
    text: "Groups",
    x: 3470,
    y: 700,
    from: at("finale", 0.66),
    to: 2,
  },
];

// ─── Illustrative content shown inside the UI replicas ───────────────────────

export type FocusArea = "personal" | "professional" | "technical";
export type DropletType = "knowledge" | "skill";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export type SampleDroplet = {
  title: string;
  description: string;
  focusArea: FocusArea;
  type: DropletType;
  tags: string[];
  difficulty: Difficulty;
  /** The islet the card rises from on the Explore map, if it has one. */
  islet?: string;
};

export const SAMPLE_DROPLETS: SampleDroplet[] = [
  {
    title: "Git Fundamentals",
    description: "Track changes, commit with confidence, and work in branches.",
    focusArea: "technical",
    type: "skill",
    tags: ["devops"],
    difficulty: "beginner",
    islet: "git",
  },
  {
    title: "Technical Interviews",
    description: "A repeatable approach to coding interview questions.",
    focusArea: "professional",
    type: "skill",
    tags: ["interviews"],
    difficulty: "intermediate",
    islet: "d5",
  },
  {
    title: "Intro to Databases",
    description: "Tables, keys, and queries: the foundations of storing data.",
    focusArea: "technical",
    type: "knowledge",
    tags: ["databases"],
    difficulty: "beginner",
    islet: "d1",
  },
  {
    title: "Your First Co-op",
    description: "What to expect from your first co-op, from search to offer.",
    focusArea: "personal",
    type: "knowledge",
    tags: [],
    difficulty: "beginner",
    islet: "d6",
  },
  {
    title: "Web Security Basics",
    description: "Common vulnerabilities and how to defend against them.",
    focusArea: "technical",
    type: "knowledge",
    tags: ["security"],
    difficulty: "intermediate",
    islet: "d9",
  },
  {
    title: "Career Fair Networking",
    description: "Make a strong first impression with recruiters.",
    focusArea: "professional",
    type: "skill",
    tags: [],
    difficulty: "beginner",
    islet: "d2",
  },
];

export const SAMPLE_LESSONS = [
  "What Is Version Control?",
  "Your First Commit",
  "Branching",
  "Merging",
];

export const SAMPLE_VOYAGE = {
  name: "Software Foundations",
  description: "From your first commit to shipping a web app.",
};

export const SAMPLE_GROUP = { name: "Co-op Prep", semester: "Fall 2026" };
export const SAMPLE_NEW_DROPLET = "Testing with Pytest";
export const SAMPLE_PEOPLE = {
  learner: "Alex",
  learnerInitials: "AR",
  friend: "Jordan Lee",
};

/** Droplets the learner authored as a Content Creator. Kept separate from
 * the ones they learn from: authors don't get lesson locks or highlights. */
export const SAMPLE_AUTHORED: SampleDroplet[] = [
  {
    title: "Command Line Basics",
    description: "Navigate, search, and script from the terminal.",
    focusArea: "technical",
    type: "skill",
    tags: [],
    difficulty: "beginner",
  },
  {
    title: "Resume Writing",
    description: "Turn your experience into a focused one-page resume.",
    focusArea: "professional",
    type: "skill",
    tags: [],
    difficulty: "beginner",
  },
];
