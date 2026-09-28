import {
  blobPath,
  createMonotone,
  createRoute,
  ease,
  fitCamera,
  span,
  worldToScreen,
} from "@/components/journey/journey-math";

describe("journey math", () => {
  describe("span and ease", () => {
    it("clamps progress through a range to 0–1", () => {
      expect(span(0.5, 0, 1)).toBe(0.5);
      expect(span(-1, 0, 1)).toBe(0);
      expect(span(2, 0, 1)).toBe(1);
      expect(ease(0.25, 0.5, 1)).toBe(0);
      expect(ease(1.5, 0.5, 1)).toBe(1);
    });
  });

  describe("createMonotone", () => {
    const f = createMonotone([0, 1, 2, 3], [0, 10, 10, 20]);

    it("passes through every key", () => {
      expect(f(0)).toBeCloseTo(0);
      expect(f(1)).toBeCloseTo(10);
      expect(f(2)).toBeCloseTo(10);
      expect(f(3)).toBeCloseTo(20);
    });

    it("holds flat between repeated values", () => {
      expect(f(1.5)).toBeCloseTo(10);
    });

    it("never overshoots its keys", () => {
      for (let x = 0; x <= 3; x += 0.05) {
        expect(f(x)).toBeGreaterThanOrEqual(-1e-9);
        expect(f(x)).toBeLessThanOrEqual(20 + 1e-9);
      }
    });

    it("clamps outside the key range", () => {
      expect(f(-5)).toBe(0);
      expect(f(9)).toBe(20);
    });
  });

  describe("createRoute", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 100 },
    ];
    const route = createRoute(points);

    it("reaches each waypoint at its recorded distance", () => {
      route.waypointDistances.forEach((d, i) => {
        const p = route.at(d);
        expect(p.x).toBeCloseTo(points[i].x, 0);
        expect(p.y).toBeCloseTo(points[i].y, 0);
      });
    });

    it("measures at least the straight-line length", () => {
      const straight = 100 + Math.hypot(100, 100);
      expect(route.total).toBeGreaterThanOrEqual(straight - 1);
    });

    it("clamps distances past either end", () => {
      expect(route.at(-50)).toMatchObject({ x: 0, y: 0 });
      expect(route.at(route.total + 50).x).toBeCloseTo(200, 0);
    });

    it("produces SVG path data", () => {
      expect(route.toPath()).toMatch(/^M0 0 C/);
      expect(route.slicePath(10, 50)).toMatch(/^M[\d.]+ [\d.-]+ L/);
    });
  });

  describe("fitCamera", () => {
    it("fits a rect into a region and centers it there", () => {
      const rect = { cx: 500, cy: 300, w: 200, h: 100 };
      const region = { x: 0.5, y: 0, w: 0.5, h: 1 };
      const cam = fitCamera(rect, region, 1000, 500);

      // Region is 500×500 px, so the 200-wide rect scales by 2.5.
      expect(cam.s).toBeCloseTo(2.5);
      const center = worldToScreen(cam, rect.cx, rect.cy, 1000, 500);
      expect(center.x).toBeCloseTo(750);
      expect(center.y).toBeCloseTo(250);
    });
  });

  describe("blobPath", () => {
    it("is deterministic, so server and client markup match", () => {
      expect(blobPath(10, 10, 20, 3)).toBe(blobPath(10, 10, 20, 3));
      expect(blobPath(10, 10, 20, 3)).not.toBe(blobPath(10, 10, 20, 4));
    });
  });
});
