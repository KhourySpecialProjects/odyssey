/**
 * Branch-coverage tests for lib/requests/droplet-analytics.ts
 *
 * Targets uncovered ?? / || fallback branches:
 *   76-80  totalEnrolled/completedCount/?? 0 when meta is undefined
 *   116    res.data ?? [] when fetchEnrollmentMetadata returns no data field
 *   136    lessonViewCounts.get(lesson.id) ?? 0 (always set, but need 0-count path)
 *   168    res.data ?? [] in fetchLastMonthRating when data is undefined
 *   202    lessonViewCounts.get(lesson.id) ?? 0 in lessonCompletion
 *   210    phData.get(25) ?? 0 when 25 key is missing
 *   218    phData.get(50) ?? 0 when 50 key is missing
 *   219    phData.get(75) ?? 0 when 75 key is missing
 *   225    lessonViewCounts.get(lesson.id) ?? 0 in fallback scroll depth
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

const { fetchEnrollmentMetadata: mockedFetchEnrollmentMetadata } =
  jest.requireMock("../../lib/requests/enrollment");

const mockedFetchLessonScrollDepth = jest.mocked(fetchLessonScrollDepth);

function makeMeta(total: number) {
  return { pagination: { page: 1, pageCount: 1, pageSize: 1, total } };
}

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
  mockedFetchLessonScrollDepth.mockResolvedValue(new Map());
});

// ---------------------------------------------------------------------------
// Lines 76-80 — ?? 0 fallbacks when meta is missing/undefined
// ---------------------------------------------------------------------------

describe("droplet-analytics-branches — ?? 0 when meta is undefined (lines 76-80)", () => {
  it("treats missing meta as 0 for totalEnrolled, completedCount, lastMonth counts", async () => {
    // Return null/undefined for all four count calls (no meta field)
    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await getDropletAnalytics(1, []);

    expect(result.totalEnrolled).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.lastMonthEnrolled).toBe(0);
    expect(result.lastMonthCompleted).toBe(0);
    expect(result.completionRate).toBe(0);
    expect(result.lastMonthCompletionRate).toBe(0);
  });

  it("treats missing meta.pagination as 0 for all counts", async () => {
    // Return objects without pagination
    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: {} })
      .mockResolvedValueOnce({ data: [], meta: {} })
      .mockResolvedValueOnce({ data: [], meta: {} })
      .mockResolvedValueOnce({ data: [], meta: {} });

    const result = await getDropletAnalytics(1, []);

    expect(result.totalEnrolled).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.lastMonthEnrolled).toBe(0);
    expect(result.lastMonthCompleted).toBe(0);
  });

  it("treats missing meta.pagination.total as 0 (only total field undefined)", async () => {
    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: { pagination: {} } })
      .mockResolvedValueOnce({ data: [], meta: { pagination: {} } })
      .mockResolvedValueOnce({ data: [], meta: { pagination: {} } })
      .mockResolvedValueOnce({ data: [], meta: { pagination: {} } });

    const result = await getDropletAnalytics(1, []);

    expect(result.totalEnrolled).toBe(0);
    expect(result.completedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Line 116 — res.data ?? [] when fetchEnrollmentMetadata returns no data field
// ---------------------------------------------------------------------------

describe("droplet-analytics-branches — res.data ?? [] fallback in main loop (line 116)", () => {
  it("handles undefined data in enrollment fetch by treating it as empty array", async () => {
    // totalEnrolled > 0 so the main loop runs
    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(5) }) // total count
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) }) // completed
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) }) // lastMonth total
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) }); // lastMonth completed

    // Main loop fetch returns no data field
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      meta: makeMeta(5),
      // data field intentionally absent
    });

    const result = await getDropletAnalytics(1, []);

    // Should not throw; no ratings → null
    expect(result.averageRating).toBeNull();
    expect(result.totalEnrolled).toBe(5);
  });

  it("handles null data in enrollment fetch by treating it as empty array", async () => {
    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(3) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) });

    // Main loop: data is null
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: null,
      meta: makeMeta(3),
    });

    const result = await getDropletAnalytics(1, []);
    expect(result.averageRating).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Line 168 — res.data ?? [] in fetchLastMonthRating when data is undefined
// ---------------------------------------------------------------------------

describe("droplet-analytics-branches — res.data ?? [] in lastMonth loop (line 168)", () => {
  it("handles undefined data in last-month enrollment fetch", async () => {
    // lastMonthEnrolled > 0 triggers the lastMonth rating loop
    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) }) // total
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) }) // completed
      .mockResolvedValueOnce({ data: [], meta: makeMeta(5) }) // lastMonth total
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) }); // lastMonth completed

    // Last-month loop fetch returns no data field
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      meta: makeMeta(5),
      // data field absent
    });

    const result = await getDropletAnalytics(1, []);

    // No ratings → null
    expect(result.lastMonthAverageRating).toBeNull();
    expect(result.lastMonthEnrolled).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Line 136 — lessonViewCounts.get(lesson.id) ?? 0 inside the loop
// (triggered when lesson has 0 views; the ?? 0 fires when get returns undefined,
// but lessonViewCounts is pre-populated with 0 for known IDs, so this branch
// fires for an ID that somehow isn't in the map — simulate via a lesson with
// an unknown ID at view time)
// ---------------------------------------------------------------------------

describe("droplet-analytics-branches — lessonViewCounts.get ?? 0 in loop (line 136)", () => {
  it("defaults to 0 when lesson id not initialised in view count map", async () => {
    setupCountCalls(1, 0, 0, 0);

    // Enrollment views lesson 999 which is NOT in lessons list
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          attributes: {
            rating: null,
            viewedLessons: { data: [{ id: 999 }] },
          },
        },
      ],
      meta: makeMeta(1),
    });

    const lessons = [{ id: 10, name: "Intro" }];
    const result = await getDropletAnalytics(1, lessons);

    // Lesson 10 still at 0 (lesson 999 not tracked)
    expect(result.lessonCompletion).toEqual([{ name: "Intro", count: 0 }]);
  });
});

// ---------------------------------------------------------------------------
// Line 202 — lessonViewCounts.get(lesson.id) ?? 0 in lessonCompletion mapping
// The map is pre-seeded with 0 for every lesson ID, so Map.get returns the
// stored 0 (not undefined). The ?? 0 fallback does not trigger here; the
// count is 0 because no enrollment viewed the lesson.
// ---------------------------------------------------------------------------

describe("droplet-analytics-branches — lessonCompletion ?? 0 (line 202)", () => {
  it("returns 0 for lessons that were never viewed by any enrollment", async () => {
    // totalEnrolled=2 but no enrollment viewed the lesson
    mockedFetchEnrollmentMetadata
      .mockResolvedValueOnce({ data: [], meta: makeMeta(2) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) })
      .mockResolvedValueOnce({ data: [], meta: makeMeta(0) });

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          attributes: {
            rating: null,
            viewedLessons: { data: [] }, // no lessons viewed
          },
        },
        {
          id: 2,
          attributes: {
            rating: null,
            viewedLessons: { data: [] },
          },
        },
      ],
      meta: makeMeta(2),
    });

    const lessons = [
      { id: 5, name: "Unviewed Lesson" },
      { id: 6, name: "Also Unviewed" },
    ];

    const result = await getDropletAnalytics(1, lessons);

    expect(result.lessonCompletion).toEqual([
      { name: "Unviewed Lesson", count: 0 },
      { name: "Also Unviewed", count: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Lines 210, 218, 219 — phData.get(25/50/75) ?? 0 when PostHog map lacks keys
// ---------------------------------------------------------------------------

describe("droplet-analytics-branches — phData.get(??) ?? 0 for missing buckets (lines 210, 218, 219)", () => {
  it("defaults ph25 to 0 when PostHog map has no 25 key", async () => {
    setupCountCalls(10, 5, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [
        { id: 1, attributes: { rating: null, viewedLessons: { data: [] } } },
      ],
      meta: makeMeta(10),
    });

    // No last-month loop
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    // PostHog: only 50%, 75%, 100% — no 25%
    const phLessonMap = new Map<number, number>([
      [50, 7],
      [75, 5],
      [100, 3],
    ]);
    mockedFetchLessonScrollDepth.mockResolvedValue(
      new Map([[20, phLessonMap]]),
    );

    const lessons = [{ id: 20, name: "Lesson" }];
    const result = await getDropletAnalytics(1, lessons);

    const depth = result.scrollDepth[0];
    expect(depth.estimated).toBe(false);
    // ph25 defaults to 0 via ?? 0
    expect(depth.points.find((p) => p.label === "25%")).toEqual({
      label: "25%",
      count: 0,
    });
    // Started = max(10, 0) = 10
    expect(depth.points.find((p) => p.label === "Started")).toEqual({
      label: "Started",
      count: 10,
    });
  });

  it("defaults ph50 and ph75 to 0 when PostHog map only has 25 and 100 keys", async () => {
    setupCountCalls(10, 5, 0, 0);

    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [
        { id: 1, attributes: { rating: null, viewedLessons: { data: [] } } },
      ],
      meta: makeMeta(10),
    });
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    // PostHog: only 25% and 100% — no 50% or 75%
    const phLessonMap = new Map<number, number>([
      [25, 8],
      [100, 2],
    ]);
    mockedFetchLessonScrollDepth.mockResolvedValue(
      new Map([[30, phLessonMap]]),
    );

    const lessons = [{ id: 30, name: "Lesson" }];
    const result = await getDropletAnalytics(1, lessons);

    const depth = result.scrollDepth[0];
    expect(depth.estimated).toBe(false);
    expect(depth.points.find((p) => p.label === "50%")).toEqual({
      label: "50%",
      count: 0,
    });
    expect(depth.points.find((p) => p.label === "75%")).toEqual({
      label: "75%",
      count: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Line 225 — lessonViewCounts.get(lesson.id) ?? 0 in fallback scroll depth
// The map is pre-seeded with 0 for every lesson ID, so Map.get returns the
// stored 0 (not undefined). The ?? 0 fallback does not trigger; the "viewed"
// variable is 0 because no enrollment viewed the lesson.
// ---------------------------------------------------------------------------

describe("droplet-analytics-branches — fallback scroll depth with 0 views for unviewed lesson (line 225)", () => {
  it("uses 0 views for fallback when lesson was never viewed", async () => {
    setupCountCalls(10, 4, 0, 0);

    // No enrollment viewed lesson 99
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          attributes: {
            rating: null,
            viewedLessons: { data: [] }, // lesson 99 not viewed
          },
        },
      ],
      meta: makeMeta(10),
    });

    // No last-month loop
    mockedFetchEnrollmentMetadata.mockResolvedValueOnce({
      data: [],
      meta: makeMeta(0),
    });

    // No PostHog data → fallback
    mockedFetchLessonScrollDepth.mockResolvedValue(new Map());

    const lessons = [{ id: 99, name: "Ghost Lesson" }];
    const result = await getDropletAnalytics(1, lessons);

    const depth = result.scrollDepth[0];
    expect(depth.estimated).toBe(true);
    // viewed = 0 (map pre-seeded with 0, not a ?? 0 fallback), so p25 = 0
    expect(depth.points.find((p) => p.label === "25%")).toEqual({
      label: "25%",
      count: 0,
    });
    // p100 = completedCount = 4
    expect(depth.points.find((p) => p.label === "100%")).toEqual({
      label: "100%",
      count: 4,
    });
  });
});
