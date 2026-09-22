/**
 * Pagination tests for getUserGroups.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * getUserGroups previously requested a single page of 25. Because its filter
 * is an `$or` across creator/admins/managers/members and the dashboard splits
 * the result by role afterwards, that cap silently dropped groups — a user in
 * 29 groups saw only the alphabetically-first 25, spread across tabs.
 *
 * These tests pin the fetch-all-pages behaviour and the escape hatch that lets
 * a caller still request one explicit page.
 */
import { getUserGroups } from "@/lib/requests/groups";
import { getMockedFetchAPI, makeGroup } from "@/lib/testing/mock-helpers";
import { CACHE_TAGS } from "@/lib/cache-tags";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
}));

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

const mockedFetchAPI = getMockedFetchAPI();

/** The page size getUserGroups walks with. */
const PAGE_SIZE = 100;

/** Builds `count` distinct groups so concatenation order is observable. */
function makeGroupPage(count: number, startId: number) {
  return Array.from({ length: count }, (_, i) =>
    makeGroup({ id: startId + i, groupName: `Group ${startId + i}` }),
  );
}

/** Reads the `pagination` argument of the nth fetchAPI call. */
function paginationOfCall(n: number) {
  const config = mockedFetchAPI.mock.calls[n][1] as {
    urlParams: { pagination?: { pageSize: number; page: number } };
  };
  return config.urlParams.pagination;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getUserGroups — pagination", () => {
  it("returns every group when the user has more than one page", async () => {
    mockedFetchAPI
      .mockResolvedValueOnce(makeGroupPage(PAGE_SIZE, 1))
      .mockResolvedValueOnce(makeGroupPage(29, 101));

    const groups = await getUserGroups(42);

    expect(groups).toHaveLength(PAGE_SIZE + 29);
    expect(mockedFetchAPI).toHaveBeenCalledTimes(2);
    expect(paginationOfCall(0)).toEqual({ pageSize: PAGE_SIZE, page: 1 });
    expect(paginationOfCall(1)).toEqual({ pageSize: PAGE_SIZE, page: 2 });
  });

  it("stops after one request when the first page is short", async () => {
    mockedFetchAPI.mockResolvedValueOnce(makeGroupPage(29, 1));

    const groups = await getUserGroups(42);

    expect(groups).toHaveLength(29);
    expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
  });

  it("does not cap the result at the old 25-group limit", async () => {
    mockedFetchAPI.mockResolvedValueOnce(makeGroupPage(29, 1));

    const groups = await getUserGroups(42);

    expect(groups.length).toBeGreaterThan(25);
    expect(groups.map((g) => g.id)).toContain(29);
  });

  it("returns an empty array when the user has no groups", async () => {
    mockedFetchAPI.mockResolvedValueOnce([]);

    await expect(getUserGroups(42)).resolves.toEqual([]);
    expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
  });

  it("handles a full final page followed by an empty one", async () => {
    mockedFetchAPI
      .mockResolvedValueOnce(makeGroupPage(PAGE_SIZE, 1))
      .mockResolvedValueOnce([]);

    const groups = await getUserGroups(42);

    expect(groups).toHaveLength(PAGE_SIZE);
    expect(mockedFetchAPI).toHaveBeenCalledTimes(2);
  });

  it("honors an explicit pagination request without looping", async () => {
    mockedFetchAPI.mockResolvedValueOnce(makeGroupPage(10, 1));

    const groups = await getUserGroups(42, {
      pagination: { pageSize: 10, page: 3 },
    });

    expect(groups).toHaveLength(10);
    expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
    expect(paginationOfCall(0)).toEqual({ pageSize: 10, page: 3 });
  });

  it("tags every page request for cache invalidation", async () => {
    mockedFetchAPI
      .mockResolvedValueOnce(makeGroupPage(PAGE_SIZE, 1))
      .mockResolvedValueOnce(makeGroupPage(1, 101));

    await getUserGroups(42);

    for (const [, config] of mockedFetchAPI.mock.calls) {
      expect((config as { next: { tags: string[] } }).next.tags).toEqual([
        CACHE_TAGS.allGroups,
      ]);
    }
  });

  it("applies the role filter on every page", async () => {
    mockedFetchAPI
      .mockResolvedValueOnce(makeGroupPage(PAGE_SIZE, 1))
      .mockResolvedValueOnce(makeGroupPage(1, 101));

    await getUserGroups(42);

    for (const [, config] of mockedFetchAPI.mock.calls) {
      const { filters } = (
        config as { urlParams: { filters: { $or: unknown[] } } }
      ).urlParams;
      expect(filters.$or).toEqual([
        { creator: { id: { $eq: 42 } } },
        { admins: { id: { $eq: 42 } } },
        { managers: { id: { $eq: 42 } } },
        { members: { id: { $eq: 42 } } },
      ]);
    }
  });
});
