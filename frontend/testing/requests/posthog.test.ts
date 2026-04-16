/**
 * Unit tests for posthog.ts Server Action helpers.
 *
 * Covers HogQL query construction, timeout handling, error paths,
 * and the in-memory insights cache.
 *
 * NOTE: getProjectId, runHogQLQuery, getInsightsList, and fetchInsightByName
 * are private (non-exported). They are tested indirectly via the exported
 * public functions. The cache (insightsListCache) is module-level, so tests
 * that care about cache state use jest.resetModules() + dynamic re-imports.
 */

import {
  mockGlobalFetch,
  makeFetchResponse,
  makeFetchErrorResponse,
} from "@/lib/testing/mock-helpers";

// ---------------------------------------------------------------------------
// Helper to build a mock HogQL success response
// ---------------------------------------------------------------------------

function makeHogQLResponse(results: unknown[][]) {
  return makeFetchResponse({ results });
}

// ---------------------------------------------------------------------------
// Helper to build a mock insights list response
// ---------------------------------------------------------------------------

function makeInsightsListResponse(items: { id: number; name: string }[] = []) {
  return makeFetchResponse({ results: items });
}

// ---------------------------------------------------------------------------
// Module re-import helper (for cache isolation)
// ---------------------------------------------------------------------------

async function importFresh() {
  return import("@/lib/requests/posthog");
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("posthog.ts", () => {
  const originalEnv = process.env;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      POSTHOG_PROJECT_ID: "12345",
      POSTHOG_API_KEY: "test-key",
      NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
    };
    mockFetch = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // =========================================================================
  // getProjectId (tested via exported functions)
  // =========================================================================

  describe("getProjectId (tested via fetchDailyActiveUsers)", () => {
    it("uses the POSTHOG_PROJECT_ID env var in the request URL", async () => {
      process.env.POSTHOG_PROJECT_ID = "99999";
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchDailyActiveUsers } = await importFresh();
      await fetchDailyActiveUsers();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/projects/99999/query/"),
        expect.any(Object),
      );
    });

    it("returns [] when POSTHOG_PROJECT_ID is missing", async () => {
      delete process.env.POSTHOG_PROJECT_ID;

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      // runHogQLQuery catches the thrown error from getProjectId and returns null
      // fetchDailyActiveUsers maps null → []
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // runHogQLQuery (tested via exported functions)
  // =========================================================================

  describe("runHogQLQuery — via fetchDailyActiveUsers", () => {
    it("returns results array on successful query", async () => {
      mockFetch.mockResolvedValue(
        makeHogQLResponse([
          ["2024-01-01 00:00:00", 10],
          ["2024-01-02 00:00:00", 20],
        ]),
      );

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([
        { date: "2024-01-01", count: 10 },
        { date: "2024-01-02", count: 20 },
      ]);
    });

    it("sends POST with correct headers and body structure", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchDailyActiveUsers } = await importFresh();
      await fetchDailyActiveUsers();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://app.posthog.com"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
            "Content-Type": "application/json",
          }),
        }),
      );

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(callBody.query.kind).toBe("HogQLQuery");
      expect(typeof callBody.query.query).toBe("string");
    });

    it("uses NEXT_PUBLIC_POSTHOG_HOST when set", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.posthog.com";
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchDailyActiveUsers } = await importFresh();
      await fetchDailyActiveUsers();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://eu.posthog.com"),
        expect.any(Object),
      );
    });

    it("falls back to https://app.posthog.com when NEXT_PUBLIC_POSTHOG_HOST is unset", async () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchDailyActiveUsers } = await importFresh();
      await fetchDailyActiveUsers();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://app.posthog.com"),
        expect.any(Object),
      );
    });

    it("returns [] when POSTHOG_API_KEY is missing", async () => {
      delete process.env.POSTHOG_API_KEY;

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "PostHog API key is not configured",
      );
    });

    it("returns [] on 401 response", async () => {
      mockFetch.mockResolvedValue(
        makeFetchErrorResponse({ detail: "Unauthorized" }, 401),
      );

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "PostHog HogQL query failed:",
        expect.objectContaining({ status: 401 }),
      );
    });

    it("returns [] on 403 response", async () => {
      mockFetch.mockResolvedValue(
        makeFetchErrorResponse({ detail: "Forbidden" }, 403),
      );

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "PostHog HogQL query failed:",
        expect.objectContaining({ status: 403 }),
      );
    });

    it("returns [] on 500 response", async () => {
      mockFetch.mockResolvedValue(
        makeFetchErrorResponse({ detail: "Server Error" }, 500),
      );

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "PostHog HogQL query failed:",
        expect.objectContaining({ status: 500 }),
      );
    });

    it("returns [] on network failure (fetch throws)", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "PostHog HogQL query error:",
        "Network error",
      );
    });

    it("returns [] and logs warn on AbortError (timeout)", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        "PostHog HogQL query timed out",
      );
    });

    it("returns [] when results is null in the response body", async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ results: null }));

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([]);
    });

    it("attaches an AbortSignal to the fetch call", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchDailyActiveUsers } = await importFresh();
      await fetchDailyActiveUsers();

      const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(fetchOptions.signal).toBeDefined();
    });
  });

  // =========================================================================
  // fetchDailyActiveUsers
  // =========================================================================

  describe("fetchDailyActiveUsers", () => {
    it("maps rows to { date, count } stripping the time component", async () => {
      mockFetch.mockResolvedValue(
        makeHogQLResponse([
          ["2024-03-15 00:00:00", 42],
          ["2024-03-16 00:00:00", 7],
        ]),
      );

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([
        { date: "2024-03-15", count: 42 },
        { date: "2024-03-16", count: 7 },
      ]);
    });

    it("returns empty array when query returns empty rows", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchDailyActiveUsers } = await importFresh();
      const result = await fetchDailyActiveUsers();

      expect(result).toEqual([]);
    });

    it("includes $pageview filter in the HogQL query string", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchDailyActiveUsers } = await importFresh();
      await fetchDailyActiveUsers();

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.query.query).toContain("$pageview");
    });
  });

  // =========================================================================
  // fetchAvgSessionDuration
  // =========================================================================

  describe("fetchAvgSessionDuration", () => {
    it("maps rows to { date, duration }", async () => {
      mockFetch.mockResolvedValue(
        makeHogQLResponse([
          ["2024-03-15 00:00:00", 5.3],
          ["2024-03-16 00:00:00", 8.1],
        ]),
      );

      const { fetchAvgSessionDuration } = await importFresh();
      const result = await fetchAvgSessionDuration();

      expect(result).toEqual([
        { date: "2024-03-15", duration: 5.3 },
        { date: "2024-03-16", duration: 8.1 },
      ]);
    });

    it("returns [] on query failure", async () => {
      mockFetch.mockResolvedValue(makeFetchErrorResponse({}, 500));

      const { fetchAvgSessionDuration } = await importFresh();
      const result = await fetchAvgSessionDuration();

      expect(result).toEqual([]);
    });

    it("returns [] when query returns no rows", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchAvgSessionDuration } = await importFresh();
      const result = await fetchAvgSessionDuration();

      expect(result).toEqual([]);
    });

    it("contains session_id in the query body", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchAvgSessionDuration } = await importFresh();
      await fetchAvgSessionDuration();

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.query.query).toContain("session_id");
    });
  });

  // =========================================================================
  // fetchUniquePageview
  // =========================================================================

  describe("fetchUniquePageview", () => {
    it("maps rows to { date, count }", async () => {
      mockFetch.mockResolvedValue(
        makeHogQLResponse([["2024-03-15 00:00:00", 100]]),
      );

      const { fetchUniquePageview } = await importFresh();
      const result = await fetchUniquePageview();

      expect(result).toEqual([{ date: "2024-03-15", count: 100 }]);
    });

    it("returns [] on API failure", async () => {
      mockFetch.mockResolvedValue(makeFetchErrorResponse({}, 401));

      const { fetchUniquePageview } = await importFresh();
      const result = await fetchUniquePageview();

      expect(result).toEqual([]);
    });

    it("includes DISTINCT distinct_id in the query", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchUniquePageview } = await importFresh();
      await fetchUniquePageview();

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.query.query).toContain("DISTINCT");
    });
  });

  // =========================================================================
  // fetchLessonScrollDepth
  // =========================================================================

  describe("fetchLessonScrollDepth", () => {
    it("returns empty Map when lessonIds is empty without calling fetch", async () => {
      const { fetchLessonScrollDepth } = await importFresh();
      const result = await fetchLessonScrollDepth(1, []);

      expect(result).toEqual(new Map());
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("interpolates dropletId into the query", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchLessonScrollDepth } = await importFresh();
      await fetchLessonScrollDepth(42, [1, 2]);

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.query.query).toContain("= 42");
    });

    it("interpolates lessonIds into the query", async () => {
      mockFetch.mockResolvedValue(makeHogQLResponse([]));

      const { fetchLessonScrollDepth } = await importFresh();
      await fetchLessonScrollDepth(1, [10, 20, 30]);

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.query.query).toContain("10, 20, 30");
    });

    it("builds a nested Map<lessonId, Map<pct, users>> from query rows", async () => {
      mockFetch.mockResolvedValue(
        makeHogQLResponse([
          [101, 25, 50],
          [101, 50, 30],
          [102, 25, 20],
        ]),
      );

      const { fetchLessonScrollDepth } = await importFresh();
      const result = await fetchLessonScrollDepth(1, [101, 102]);

      expect(result.get(101)?.get(25)).toBe(50);
      expect(result.get(101)?.get(50)).toBe(30);
      expect(result.get(102)?.get(25)).toBe(20);
    });

    it("returns empty Map on query failure", async () => {
      mockFetch.mockResolvedValue(makeFetchErrorResponse({}, 500));

      const { fetchLessonScrollDepth } = await importFresh();
      const result = await fetchLessonScrollDepth(1, [1]);

      expect(result).toEqual(new Map());
    });

    it("returns empty Map on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const { fetchLessonScrollDepth } = await importFresh();
      const result = await fetchLessonScrollDepth(1, [1]);

      expect(result).toEqual(new Map());
    });

    it("returns empty Map when query returns null results", async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ results: null }));

      const { fetchLessonScrollDepth } = await importFresh();
      const result = await fetchLessonScrollDepth(1, [1]);

      expect(result).toEqual(new Map());
    });
  });

  // =========================================================================
  // getInsightsList (tested via fetchWeeklyActiveUsers / fetchWeeklyNewUsers)
  // =========================================================================

  describe("getInsightsList — caching behaviour", () => {
    it("fetches from API on first call", async () => {
      // Both the insights list and the insight detail calls are made
      const insightsList = makeInsightsListResponse([
        { id: 1, name: "Weekly Active Users" },
      ]);
      const insightDetail = makeFetchResponse({
        result: [{ days: ["2024-01-01"], data: [5] }],
      });

      mockFetch
        .mockResolvedValueOnce(insightsList)
        .mockResolvedValueOnce(insightDetail);

      const { fetchWeeklyActiveUsers } = await importFresh();
      await fetchWeeklyActiveUsers();

      // At least the list endpoint was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/insights/"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("uses cached insights list on second call within 5 seconds", async () => {
      jest.useFakeTimers();

      const insightsList = makeInsightsListResponse([
        { id: 1, name: "Weekly Active Users" },
      ]);
      const insightDetail = makeFetchResponse({
        result: [{ days: ["2024-01-01"], data: [5] }],
      });

      // First call: list + detail
      mockFetch
        .mockResolvedValueOnce(insightsList)
        .mockResolvedValueOnce(insightDetail)
        // Second call: only detail (list is cached)
        .mockResolvedValueOnce(insightDetail);

      const { fetchWeeklyActiveUsers } = await importFresh();

      await fetchWeeklyActiveUsers();
      jest.advanceTimersByTime(1000); // 1 second — still within TTL
      await fetchWeeklyActiveUsers();

      // The insights LIST endpoint should only have been called once
      const listCalls = mockFetch.mock.calls.filter(
        ([url]) =>
          (url as string).includes("/insights/") &&
          !(url as string).match(/\/insights\/\d+\/$/),
      );
      expect(listCalls).toHaveLength(1);
    });

    it("re-fetches insights list after 5 seconds (cache expired)", async () => {
      jest.useFakeTimers();

      const insightsList = makeInsightsListResponse([
        { id: 1, name: "Weekly Active Users" },
      ]);
      const insightDetail = makeFetchResponse({
        result: [{ days: ["2024-01-01"], data: [5] }],
      });

      // First call: list + detail; second call: fresh list + detail
      mockFetch
        .mockResolvedValueOnce(insightsList)
        .mockResolvedValueOnce(insightDetail)
        .mockResolvedValueOnce(insightsList)
        .mockResolvedValueOnce(insightDetail);

      const { fetchWeeklyActiveUsers } = await importFresh();

      await fetchWeeklyActiveUsers();
      jest.advanceTimersByTime(6000); // past 5s TTL
      await fetchWeeklyActiveUsers();

      // The insights LIST endpoint should have been called twice
      const listCalls = mockFetch.mock.calls.filter(
        ([url]) =>
          (url as string).includes("/insights/") &&
          !(url as string).match(/\/insights\/\d+\/$/),
      );
      expect(listCalls).toHaveLength(2);
    });

    it("returns [] when insights list API call fails", async () => {
      mockFetch.mockResolvedValue(makeFetchErrorResponse({}, 500));

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([]);
    });

    it("returns [] when insights list call throws network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([]);
    });

    it("returns [] when POSTHOG_API_KEY is missing", async () => {
      delete process.env.POSTHOG_API_KEY;

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // fetchInsightByName (tested via fetchWeeklyActiveUsers + fetchWeeklyNewUsers)
  // =========================================================================

  describe("fetchInsightByName", () => {
    it("returns insight data when name matches", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 7, name: "Weekly Active Users" }]),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            result: [{ days: ["2024-01-01", "2024-01-08"], data: [10, 15] }],
          }),
        );

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([
        { date: "2024-01-01", count: 10 },
        { date: "2024-01-08", count: 15 },
      ]);
    });

    it("uses the matched insight id in the detail URL", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 42, name: "Weekly Active Users" }]),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            result: [{ days: ["2024-01-01"], data: [5] }],
          }),
        );

      const { fetchWeeklyActiveUsers } = await importFresh();
      await fetchWeeklyActiveUsers();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/insights/42/"),
        expect.any(Object),
      );
    });

    it("returns [] when insight name is not found in list", async () => {
      mockFetch.mockResolvedValueOnce(
        makeInsightsListResponse([{ id: 1, name: "Some Other Insight" }]),
      );

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("WAU"));
    });

    it("returns [] when insight detail request fails", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 1, name: "Weekly Active Users" }]),
        )
        .mockResolvedValueOnce(makeFetchErrorResponse({}, 500));

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([]);
    });

    it("matches WAU insight name case-insensitively", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 3, name: "wau trends" }]),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            result: [{ days: ["2024-01-01"], data: [8] }],
          }),
        );

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(8);
    });

    it("matches growth accounting insight for fetchWeeklyNewUsers", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 5, name: "Growth Accounting" }]),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            result: [{ days: ["2024-01-01"], data: [3] }],
          }),
        );

      const { fetchWeeklyNewUsers } = await importFresh();
      const result = await fetchWeeklyNewUsers();

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(3);
    });

    it("returns [] for fetchWeeklyNewUsers when insight not found", async () => {
      mockFetch.mockResolvedValueOnce(
        makeInsightsListResponse([{ id: 1, name: "Unrelated Insight" }]),
      );

      const { fetchWeeklyNewUsers } = await importFresh();
      const result = await fetchWeeklyNewUsers();

      expect(result).toEqual([]);
    });

    it("returns [] when insight detail AbortError occurs", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";

      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 1, name: "Weekly Active Users" }]),
        )
        .mockRejectedValueOnce(abortError);

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // extractTimeSeries (tested indirectly via fetchWeeklyActiveUsers)
  // =========================================================================

  describe("extractTimeSeries — edge cases", () => {
    it("returns [] when time series result has no data", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 1, name: "Weekly Active Users" }]),
        )
        .mockResolvedValueOnce(
          // result[0] has empty days and data arrays
          makeFetchResponse({ result: [{ days: [], data: [] }] }),
        );

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([]);
    });

    it("returns [] when result array is missing from insight", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 1, name: "Weekly Active Users" }]),
        )
        .mockResolvedValueOnce(makeFetchResponse({ result: null }));

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toEqual([]);
    });

    it("uses labels field when days field is absent", async () => {
      mockFetch
        .mockResolvedValueOnce(
          makeInsightsListResponse([{ id: 1, name: "Weekly Active Users" }]),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            result: [{ labels: ["2024-01-01"], data: [99] }],
          }),
        );

      const { fetchWeeklyActiveUsers } = await importFresh();
      const result = await fetchWeeklyActiveUsers();

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2024-01-01");
      expect(result[0].count).toBe(99);
    });
  });
});
