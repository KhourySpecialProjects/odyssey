/**
 * Coverage-focused tests for lib/requests/droplet-analytics.ts
 *
 * Targets uncovered lines: 95, 131-134, 144, 182, 196, 208-230
 *
 * Strategy:
 *   - mock "../../lib/requests/enrollment" for fetchEnrollmentMetadata
 *   - mock "../../lib/requests/posthog" for fetchLessonScrollDepth
 *
 * Note: fetchEnrollmentMetadata is typed as returning Enrollment[] but at
 * runtime (flattenResponse:false) it returns raw Strapi objects. The
 * production code immediately casts via `as unknown as RawType[]`. We use
 * jest.requireMock() for enrollment to avoid fighting that type mismatch,
 * exactly as the existing droplet-analytics.test.ts does. fetchLessonScrollDepth
 * returns a well-typed Map so we can use jest.mocked() there.
 */

import { getDropletAnalytics } from "../../lib/requests/droplet-analytics";
import { fetchLessonScrollDepth } from "../../lib/requests/posthog";

jest.mock("../../lib/requests/enrollment", () => ({
  fetchEnrollmentMetadata: jest.fn(),
}));

jest.mock("../../lib/requests/posthog", () => ({
  fetchLessonScrollDepth: jest.fn(),
  fetchDailyActiveUsers: jest.fn(),
  fetchWeeklyActiveUsers: jest.fn(),
  fetchUniquePageview: jest.fn(),
  fetchWeeklyNewUsers: jest.fn(),
  fetchAvgSessionDuration: jest.fn(),
}));

// jest.requireMock matches the existing droplet-analytics.test.ts pattern —
// enrollment's data field is raw Strapi (not Enrollment[]) so typed mocks fail.
const { fetchEnrollmentMetadata: mockedFetchEnrollmentMetadata } =
  jest.requireMock("../../lib/requests/enrollment");

const mockedFetchLessonScrollDepth = jest.mocked(fetchLessonScrollDepth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeta(total: number) {
  return { pagination: { page: 1, pageCount: 1, pageSize: 1, total } };
}

function makeRawEnrollment(
  id: number,
  rating: number | null = null,
  viewedLessonIds: number[] = [],
) {
  return {
    id,
    attributes: {
      rating,
      viewedLessons: { data: viewedLessonIds.map((lid) => ({ id: lid })) },
    },
  };
}

/** Set up the four mandatory count calls (total, completed, lastMonth total, lastMonth completed) */
function setupCountCalls(
  total: number,
  completed: number,
  lastMonthTotal: number,
  lastMonthCompleted: number,
) {
  mockedFetchEnrollmentMetadata
    .mockResolvedValueOnce({ data: [], meta: makeMeta(total) })
    .mockResolvedValueOnce({ data: [], meta: makeMeta(completed) })
    .mockResolvedValueOnce({ data: [], meta: makeMeta(lastMonthTotal) })
    .mockResolvedValueOnce({ data: [], meta: makeMeta(lastMonthCompleted) });
}

beforeEach(() => {
  jest.resetAllMocks();
  // Default: posthog returns empty map (no scroll data)
  mockedFetchLessonScrollDepth.mockResolvedValue(new Map());
});

// ---------------------------------------------------------------------------
// Line 95 — lessonViewCounts Map initialisation with lessons
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — lessonViewCounts initialisation (line 95)", () => {
  it("initialises view count to 0 for each lesson when lessons are provided", async () => {
    setupCountCalls(0, 0, 0, 0);

    const lessons = [
      { id: 10, name: "Lesson A" },
      { id: 11, name: "Lesson B" },
    ];

    const result = await getDropletAnalytics(42, lessons);

    // Each lesson should start at 0 views
    expect(result.lessonCompletion).toEqual([
      { name: "Lesson A", count: 0 },
      { name: "Lesson B", count: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Lines 131-134 — lesson view counting inside paginated loop
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — lesson view counting (lines 131-134)", () => {
  it("counts viewed lessons from enrollment data", async () => {
    setupCountCalls(3, 1, 0, 0);

    // Three enrollments — each views different lessons
    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({
        data: [
          makeRawEnrollment(1, null, [10, 11]),
          makeRawEnrollment(2, null, [10]),
          makeRawEnrollment(3, null, []),
        ],
        meta: makeMeta(3),
      })
      // lastMonth rating loop (lastMonthEnrolled = 0, so no loop)
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) });

    const lessons = [
      { id: 10, name: "Lesson A" },
      { id: 11, name: "Lesson B" },
    ];

    const result = await getDropletAnalytics(42, lessons);

    expect(result.lessonCompletion).toEqual([
      { name: "Lesson A", count: 2 },
      { name: "Lesson B", count: 1 },
    ]);
  });

  it("ignores viewed lesson IDs that are not in the lessons list", async () => {
    setupCountCalls(1, 0, 0, 0);

    // Enrollment views lesson 99 which is NOT in the lessons list
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1, null, [99])],
      meta: makeMeta(1),
    });
    // lastMonth loop skipped (lastMonthEnrolled = 0)
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    const lessons = [{ id: 10, name: "Lesson A" }];

    const result = await getDropletAnalytics(42, lessons);

    // Lesson 10 should still be 0 — lesson 99 is ignored
    expect(result.lessonCompletion).toEqual([{ name: "Lesson A", count: 0 }]);
  });

  it("handles enrollment with missing viewedLessons gracefully", async () => {
    setupCountCalls(1, 0, 0, 0);

    // Enrollment without viewedLessons attribute
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [{ id: 1, attributes: { rating: null, viewedLessons: undefined } }],
      meta: makeMeta(1),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    const lessons = [{ id: 10, name: "Lesson A" }];

    const result = await getDropletAnalytics(42, lessons);

    expect(result.lessonCompletion).toEqual([{ name: "Lesson A", count: 0 }]);
  });
});

// ---------------------------------------------------------------------------
// Line 144 — page++ in fetchAllEnrollments (multi-page pagination)
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — multi-page pagination for enrollments (line 144)", () => {
  it("fetches multiple pages when the first page is full (pageSize=250)", async () => {
    // totalEnrolled=251 triggers the page++ branch
    setupCountCalls(251, 0, 0, 0);

    // Build 250 enrollments for page 1 (pageSize=250 means raw.length === pageSize → continue)
    const page1Enrollments = Array.from({ length: 250 }, (_, i) =>
      makeRawEnrollment(i + 1),
    );
    // Page 2 has 1 enrollment (raw.length < pageSize → break)
    const page2Enrollments = [makeRawEnrollment(251)];

    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({
        data: page1Enrollments,
        meta: makeMeta(251),
      })
      .mockResolvedValueOnce({
        data: page2Enrollments,
        meta: makeMeta(251),
      });

    const result = await getDropletAnalytics(42, []);

    // 6 calls total: 4 count + 2 main-loop pages (lastMonthEnrolled=0 → no lastMonth loop)
    expect(mockedFetchEnrollmentMetadata).toHaveBeenCalledTimes(6);
    // No ratings in any enrollment → null
    expect(result.averageRating).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Line 182 — page++ in fetchLastMonthRating (multi-page pagination)
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — multi-page pagination for lastMonth rating (line 182)", () => {
  it("fetches multiple pages for last-month rating loop when first page is full", async () => {
    setupCountCalls(0, 0, 251, 0);

    // totalEnrolled=0 so no main loop
    // lastMonth loop: page 1 has 250 items, page 2 has 1
    const page1 = Array.from({ length: 250 }, (_, i) =>
      makeRawEnrollment(i + 1, 4),
    );
    const page2 = [makeRawEnrollment(251, 5)];

    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: page1, meta: makeMeta(251) })
      .mockResolvedValueOnce({ data: page2, meta: makeMeta(251) });

    const result = await getDropletAnalytics(42, []);

    // Calls: 4 count + 2 lastMonth pagination
    expect(mockedFetchEnrollmentMetadata).toHaveBeenCalledTimes(6);
    // 250 * 4 + 1 * 5 = 1005 / 251 = ~4.0
    expect(result.lastMonthAverageRating).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Line 196 — fetchLessonScrollDepth called with lesson IDs (posthog integration)
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — fetchLessonScrollDepth called (line 196)", () => {
  it("calls fetchLessonScrollDepth with the droplet ID and lesson IDs", async () => {
    setupCountCalls(0, 0, 0, 0);

    const lessons = [
      { id: 20, name: "Intro" },
      { id: 21, name: "Core" },
    ];

    await getDropletAnalytics(99, lessons);

    expect(mockedFetchLessonScrollDepth).toHaveBeenCalledWith(99, [20, 21]);
  });

  it("calls fetchLessonScrollDepth with empty array when no lessons", async () => {
    setupCountCalls(0, 0, 0, 0);

    await getDropletAnalytics(99, []);

    expect(mockedFetchLessonScrollDepth).toHaveBeenCalledWith(99, []);
  });
});

// ---------------------------------------------------------------------------
// Lines 208-223 — PostHog scroll depth data path (estimated: false)
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — scroll depth with PostHog data (lines 208-223)", () => {
  it("uses PostHog data when available, marking estimated=false", async () => {
    setupCountCalls(50, 10, 0, 0);

    // totalEnrolled=50, completedCount=10 — main loop runs
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1)],
      meta: makeMeta(50),
    });
    // lastMonth loop skipped
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    // PostHog returns data for lesson 20
    const phLessonMap = new Map<number, number>([
      [25, 40],
      [50, 30],
      [75, 20],
      [100, 10],
    ]);
    mockedFetchLessonScrollDepth.mockResolvedValue(
      new Map([[20, phLessonMap]]),
    );

    const lessons = [{ id: 20, name: "Intro" }];

    const result = await getDropletAnalytics(42, lessons);

    expect(result.scrollDepth).toHaveLength(1);
    const depth = result.scrollDepth[0];
    expect(depth.estimated).toBe(false);
    expect(depth.lessonId).toBe(20);
    expect(depth.lessonName).toBe("Intro");
    // Started = max(totalEnrolled=50, ph25=40) = 50
    expect(depth.points).toEqual([
      { label: "Started", count: 50 },
      { label: "25%", count: 40 },
      { label: "50%", count: 30 },
      { label: "75%", count: 20 },
      { label: "100%", count: 10 },
    ]);
  });

  it("uses max(totalEnrolled, ph25) for the Started count", async () => {
    setupCountCalls(10, 5, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1)],
      meta: makeMeta(10),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    // ph25=80 > totalEnrolled=10 → Started = 80
    const phLessonMap = new Map<number, number>([
      [25, 80],
      [50, 60],
      [75, 40],
      [100, 20],
    ]);
    mockedFetchLessonScrollDepth.mockResolvedValue(
      new Map([[30, phLessonMap]]),
    );

    const lessons = [{ id: 30, name: "Core" }];

    const result = await getDropletAnalytics(42, lessons);

    expect(result.scrollDepth[0].points[0]).toEqual({
      label: "Started",
      count: 80,
    });
  });

  it("falls back to 0 for missing PostHog percentile buckets", async () => {
    setupCountCalls(10, 5, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1)],
      meta: makeMeta(10),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    // Only 25% and 50% buckets present — 75% and 100% default to 0
    const phLessonMap = new Map<number, number>([
      [25, 7],
      [50, 5],
    ]);
    mockedFetchLessonScrollDepth.mockResolvedValue(
      new Map([[30, phLessonMap]]),
    );

    const lessons = [{ id: 30, name: "Core" }];

    const result = await getDropletAnalytics(42, lessons);

    const depth = result.scrollDepth[0];
    expect(depth.points.find((p) => p.label === "75%")).toEqual({
      label: "75%",
      count: 0,
    });
    expect(depth.points.find((p) => p.label === "100%")).toEqual({
      label: "100%",
      count: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Lines 224-241 — Fallback scroll depth (estimated: true, lines 224-241)
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — scroll depth fallback estimation (lines 224-241)", () => {
  it("uses interpolated fallback when PostHog returns no data, marking estimated=true", async () => {
    // totalEnrolled=100, completedCount=20
    setupCountCalls(100, 20, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1, null, [10])],
      meta: makeMeta(100),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    // No PostHog data → empty map
    mockedFetchLessonScrollDepth.mockResolvedValue(new Map());

    const lessons = [{ id: 10, name: "Intro" }];

    const result = await getDropletAnalytics(42, lessons);

    expect(result.scrollDepth).toHaveLength(1);
    const depth = result.scrollDepth[0];
    expect(depth.estimated).toBe(true);
    expect(depth.lessonId).toBe(10);

    // viewed=1 (one enrollment viewed lesson 10), completedCount=20
    // p25=1, p100=20
    // p50 = round(1 - (1-20)*0.33) = round(1+6.27) = 7
    // p75 = round(1 - (1-20)*0.67) = round(1+12.73) = 14
    expect(depth.points).toEqual([
      { label: "Started", count: 100 },
      { label: "25%", count: 1 },
      { label: "50%", count: 7 },
      { label: "75%", count: 14 },
      { label: "100%", count: 20 },
    ]);
  });

  it("falls back gracefully when PostHog returns an empty inner map", async () => {
    setupCountCalls(50, 10, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1)],
      meta: makeMeta(50),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    // PostHog has an entry for lesson 20 but the inner map is empty (size=0)
    mockedFetchLessonScrollDepth.mockResolvedValue(new Map([[20, new Map()]]));

    const lessons = [{ id: 20, name: "Core" }];

    const result = await getDropletAnalytics(42, lessons);

    const depth = result.scrollDepth[0];
    // Empty inner map → falls through to the fallback
    expect(depth.estimated).toBe(true);
  });

  it("returns empty scrollDepth array when there are no lessons", async () => {
    setupCountCalls(10, 5, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1, 3)],
      meta: makeMeta(10),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    const result = await getDropletAnalytics(42, []);

    expect(result.scrollDepth).toEqual([]);
    expect(result.lessonCompletion).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Happy path — full analytics response
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — full happy path", () => {
  it("returns correctly shaped data with all fields populated", async () => {
    setupCountCalls(120, 80, 60, 30);

    mockedFetchEnrollmentMetadata
      // main loop
      .mockResolvedValueOnce({
        data: [
          makeRawEnrollment(1, 5, [1, 2]),
          makeRawEnrollment(2, 4, [1]),
          makeRawEnrollment(3, 3),
        ],
        meta: makeMeta(120),
      })
      // lastMonth loop
      .mockResolvedValueOnce({
        data: [makeRawEnrollment(1, 4), makeRawEnrollment(2, 5)],
        meta: makeMeta(60),
      });

    const phData = new Map<number, number>([
      [25, 100],
      [50, 80],
      [75, 60],
      [100, 40],
    ]);
    mockedFetchLessonScrollDepth.mockResolvedValue(new Map([[1, phData]]));

    const lessons = [
      { id: 1, name: "Lesson One" },
      { id: 2, name: "Lesson Two" },
    ];

    const result = await getDropletAnalytics(5, lessons);

    expect(result.totalEnrolled).toBe(120);
    expect(result.completedCount).toBe(80);
    expect(result.completionRate).toBe(66.67);
    expect(result.lastMonthEnrolled).toBe(60);
    expect(result.lastMonthCompleted).toBe(30);
    expect(result.lastMonthCompletionRate).toBe(50);
    expect(result.averageRating).toBe(4); // (5+4+3)/3 = 4.0
    expect(result.lastMonthAverageRating).toBe(4.5); // (4+5)/2 = 4.5
    // Lesson One: viewed by enrollments 1 & 2 = 2 views
    expect(result.lessonCompletion[0]).toEqual({
      name: "Lesson One",
      count: 2,
    });
    // Lesson Two: viewed by enrollment 1 only = 1 view
    expect(result.lessonCompletion[1]).toEqual({
      name: "Lesson Two",
      count: 1,
    });
    // Lesson One has PostHog data
    expect(result.scrollDepth[0].estimated).toBe(false);
    // Lesson Two has no PostHog data → fallback
    expect(result.scrollDepth[1].estimated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Completion rate calculations (totalEnrolled=0 divide-by-zero guard)
// ---------------------------------------------------------------------------

describe("getDropletAnalytics — completion rate edge cases", () => {
  it("returns completionRate=0 when totalEnrolled is 0 (no divide-by-zero)", async () => {
    setupCountCalls(0, 0, 0, 0);

    const result = await getDropletAnalytics(42, []);

    expect(result.completionRate).toBe(0);
    expect(result.lastMonthCompletionRate).toBe(0);
  });

  it("returns lastMonthCompletionRate=0 when lastMonthEnrolled is 0", async () => {
    setupCountCalls(10, 5, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1, 3)],
      meta: makeMeta(10),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    const result = await getDropletAnalytics(42, []);

    expect(result.lastMonthCompletionRate).toBe(0);
  });

  it("rounds completionRate to 2 decimal places", async () => {
    setupCountCalls(3, 2, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [makeRawEnrollment(1), makeRawEnrollment(2)],
      meta: makeMeta(3),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    const result = await getDropletAnalytics(42, []);

    // 2/3 * 100 = 66.666... → rounded to 66.67
    expect(result.completionRate).toBe(66.67);
  });
});
