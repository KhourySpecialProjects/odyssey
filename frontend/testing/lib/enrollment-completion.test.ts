import {
  enrollmentNeedsCompletionBackfill,
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
