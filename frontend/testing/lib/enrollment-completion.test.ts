import type { Enrollment } from "@/types";
import {
  enrollmentNeedsCompletionBackfill,
  enrollmentProgressPercent,
  hasDroplet,
  needsCompletionBackfill,
} from "@/lib/enrollment-completion";

describe("needsCompletionBackfill", () => {
  it.each([
    // [isComplete, completionDate, allViewed, expected]
    [false, null, true, true], // finished every lesson, never marked complete
    [true, null, true, true], // complete without a date
    [true, null, false, true], // marked complete by rating, no date
    [false, "2025-01-01", true, true], // has a date but not flagged complete
    [true, "2025-01-01", true, false], // fully recorded
    [true, "2025-01-01", false, false], // rated and dated
    [false, null, false, false], // still in progress
  ])(
    "isComplete=%s completionDate=%s allViewed=%s -> %s",
    (isComplete, completionDate, allViewed, expected) => {
      expect(
        needsCompletionBackfill(isComplete, completionDate, allViewed),
      ).toBe(expected);
    },
  );
});

describe("enrollmentNeedsCompletionBackfill", () => {
  const lessons = [{ id: 1 }, { id: 2 }];

  it("detects an all-viewed enrollment with no completion", () => {
    expect(
      enrollmentNeedsCompletionBackfill({
        isComplete: false,
        completionDate: null,
        viewedLessons: [{ id: 2 }, { id: 1 }],
        droplet: { lessons },
      }),
    ).toBe(true);
  });

  it("ignores an enrollment with lessons left", () => {
    expect(
      enrollmentNeedsCompletionBackfill({
        isComplete: false,
        viewedLessons: [{ id: 1 }],
        droplet: { lessons },
      }),
    ).toBe(false);
  });

  it("never treats a droplet with no lessons as all viewed", () => {
    expect(
      enrollmentNeedsCompletionBackfill({
        isComplete: false,
        viewedLessons: [],
        droplet: { lessons: [] },
      }),
    ).toBe(false);
  });
});

describe("hasDroplet", () => {
  it("returns true when the droplet is populated", () => {
    expect(hasDroplet({ droplet: { id: 1 } } as unknown as Enrollment)).toBe(
      true,
    );
  });

  it("returns false when the droplet is null", () => {
    expect(hasDroplet({ droplet: null } as unknown as Enrollment)).toBe(false);
  });

  it("returns false when the droplet is undefined", () => {
    expect(hasDroplet({} as unknown as Enrollment)).toBe(false);
  });
});

describe("enrollmentProgressPercent (ODY-678)", () => {
  const lessons = (...ids: number[]) => ids.map((id) => ({ id }));

  it("is the share of the droplet's lessons that were viewed", () => {
    expect(
      enrollmentProgressPercent({
        viewedLessons: lessons(1, 2),
        droplet: { lessons: lessons(1, 2, 3, 4) },
      }),
    ).toBe(50);
  });

  it("ignores viewed lessons that aren't in the droplet, so it never passes 100", () => {
    expect(
      enrollmentProgressPercent({
        viewedLessons: lessons(1, 2, 99),
        droplet: { lessons: lessons(1, 2) },
      }),
    ).toBe(100);
  });

  it("counts a lesson viewed twice once", () => {
    expect(
      enrollmentProgressPercent({
        viewedLessons: lessons(1, 1),
        droplet: { lessons: lessons(1, 2) },
      }),
    ).toBe(50);
  });

  it("is 0 when the droplet has no lessons or nothing was viewed", () => {
    expect(
      enrollmentProgressPercent({
        viewedLessons: lessons(1),
        droplet: { lessons: [] },
      }),
    ).toBe(0);
    expect(
      enrollmentProgressPercent({
        viewedLessons: null,
        droplet: { lessons: lessons(1) },
      }),
    ).toBe(0);
  });
});
