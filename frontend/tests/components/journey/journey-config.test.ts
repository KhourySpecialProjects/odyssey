import {
  at,
  BOAT_KEYS,
  CAMERA_KEYS,
  CHAPTER_BOUNDS,
  CHAPTERS,
  DROPLET_ISLETS,
  MAP_LABELS,
  PLANNED_LEGS,
  ROUTE,
  ROUTE_WAYPOINTS,
  SAMPLE_AUTHORED,
  SAMPLE_DROPLETS,
  STOPS,
} from "@/components/journey/journey-config";

const isSorted = (xs: number[]) =>
  xs.every((x, i) => i === 0 || x >= xs[i - 1]);

describe("journey config", () => {
  it("splits progress 0–1 across the chapters in order", () => {
    expect(CHAPTER_BOUNDS[0].start).toBe(0);
    expect(CHAPTER_BOUNDS[CHAPTER_BOUNDS.length - 1].end).toBeCloseTo(1);
    CHAPTER_BOUNDS.forEach((b, i) => {
      expect(b.end).toBeGreaterThan(b.start);
      if (i > 0) expect(b.start).toBeCloseTo(CHAPTER_BOUNDS[i - 1].end);
    });
  });

  it("orders camera and boat keyframes in time", () => {
    expect(isSorted(CAMERA_KEYS.map(([c, t]) => at(c, t)))).toBe(true);
    expect(isSorted(BOAT_KEYS.map(([c, t]) => at(c, t)))).toBe(true);
  });

  it("only moves the boat forward along its route", () => {
    const distances = BOAT_KEYS.map(
      ([, , stop]) => ROUTE.waypointDistances[STOPS[stop]],
    );
    expect(isSorted(distances)).toBe(true);
  });

  it("points every stop at a real waypoint", () => {
    Object.values(STOPS).forEach((i) => {
      expect(ROUTE_WAYPOINTS[i]).toBeDefined();
    });
    PLANNED_LEGS.forEach((leg) => {
      expect(STOPS[leg.to]).toBeGreaterThan(STOPS[leg.from]);
    });
  });

  it("raises every sample droplet from an islet on the map", () => {
    const islets = new Set(DROPLET_ISLETS.map((i) => i.id));
    SAMPLE_DROPLETS.forEach((d) =>
      expect(d.islet !== undefined && islets.has(d.islet)).toBe(true),
    );
  });

  it("shows each map label for a positive span of the journey", () => {
    MAP_LABELS.forEach((l) => expect(l.to).toBeGreaterThan(l.from));
  });

  // Product accuracy: the journey makes no numeric claims about Odyssey.
  it("keeps statistics out of the story copy", () => {
    CHAPTERS.forEach((c) => {
      expect(`${c.eyebrow} ${c.title} ${c.body}`).not.toMatch(/\d/);
    });
  });

  // Authors don't get lesson locks or highlighting, so the droplets the
  // learner authored must never be the ones shown as learner content.
  it("keeps authored droplets separate from the ones being learned", () => {
    const learning = new Set(SAMPLE_DROPLETS.map((d) => d.title));
    SAMPLE_AUTHORED.forEach((d) => expect(learning.has(d.title)).toBe(false));
  });

  // Only values that exist in the droplet schema are used.
  it("uses real focus areas, types and difficulties", () => {
    [...SAMPLE_DROPLETS, ...SAMPLE_AUTHORED].forEach((d) => {
      expect(["personal", "professional", "technical"]).toContain(d.focusArea);
      expect(["knowledge", "skill"]).toContain(d.type);
      expect(["beginner", "intermediate", "advanced"]).toContain(d.difficulty);
    });
  });
});
