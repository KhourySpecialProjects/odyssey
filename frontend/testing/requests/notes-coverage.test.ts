/**
 * Coverage gap tests for lib/requests/notes.ts
 *
 * Targets uncovered lines:
 *   208-237  getAllNotesByUser — pagination loop (multi-page, empty, single-page, exact-page-size)
 *   260-261  deleteNote — catch branch (network error)
 */

import { getAllNotesByUser, deleteNote } from "@/lib/requests/notes";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getMockedFetchAPI, mockGlobalFetch } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

// ---------------------------------------------------------------------------
// getAllNotesByUser — pagination loop (lines 208-237)
// ---------------------------------------------------------------------------

describe("getAllNotesByUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array when first page is empty", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([]);

    const result = await getAllNotesByUser(42);

    expect(result).toEqual([]);
    expect(getMockedFetchAPI()).toHaveBeenCalledTimes(1);
    expect(getMockedFetchAPI()).toHaveBeenCalledWith("/notes", {
      urlParams: expect.objectContaining({
        filters: {
          enrollment: {
            authorizedUser: { id: { $eq: 42 } },
          },
        },
        pagination: { page: 1, pageSize: 250 },
      }),
      next: {
        tags: [CACHE_TAGS.notes(42)],
        revalidate: 900,
      },
    });
  });

  it("returns all notes when first page has fewer than 250 items", async () => {
    const page1 = [{ id: 1 }, { id: 2 }, { id: 3 }];
    getMockedFetchAPI().mockResolvedValueOnce(page1);

    const result = await getAllNotesByUser(42);

    expect(result).toEqual(page1);
    expect(getMockedFetchAPI()).toHaveBeenCalledTimes(1);
  });

  it("fetches multiple pages when first page is exactly 250 items", async () => {
    const page1 = Array.from({ length: 250 }, (_, i) => ({ id: i + 1 }));
    const page2 = [{ id: 251 }, { id: 252 }];

    getMockedFetchAPI()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const result = await getAllNotesByUser(10);

    expect(result).toHaveLength(252);
    expect(getMockedFetchAPI()).toHaveBeenCalledTimes(2);

    // Second call should use page 2
    expect(getMockedFetchAPI()).toHaveBeenNthCalledWith(2, "/notes", {
      urlParams: expect.objectContaining({
        pagination: { page: 2, pageSize: 250 },
      }),
      next: {
        tags: [CACHE_TAGS.notes(10)],
        revalidate: 900,
      },
    });
  });

  it("stops pagination when a subsequent page returns empty array", async () => {
    const page1 = Array.from({ length: 250 }, (_, i) => ({ id: i + 1 }));

    getMockedFetchAPI().mockResolvedValueOnce(page1).mockResolvedValueOnce([]);

    const result = await getAllNotesByUser(5);

    expect(result).toHaveLength(250);
    expect(getMockedFetchAPI()).toHaveBeenCalledTimes(2);
  });

  it("handles three full pages followed by a partial page", async () => {
    const pageSize = 250;
    const page1 = Array.from({ length: pageSize }, (_, i) => ({ id: i + 1 }));
    const page2 = Array.from({ length: pageSize }, (_, i) => ({
      id: pageSize + i + 1,
    }));
    const page3 = Array.from({ length: pageSize }, (_, i) => ({
      id: pageSize * 2 + i + 1,
    }));
    const page4 = [{ id: pageSize * 3 + 1 }, { id: pageSize * 3 + 2 }];

    getMockedFetchAPI()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(page3)
      .mockResolvedValueOnce(page4);

    const result = await getAllNotesByUser(99);

    expect(result).toHaveLength(pageSize * 3 + 2);
    expect(getMockedFetchAPI()).toHaveBeenCalledTimes(4);
  });

  it("populates with highlight and lesson fields on each request", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([{ id: 1 }]);

    await getAllNotesByUser(7);

    expect(getMockedFetchAPI()).toHaveBeenCalledWith(
      "/notes",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          populate: {
            highlight: { fields: ["text", "color", "yLevel"] },
            lesson: { fields: ["id", "name", "slug"] },
          },
          fields: ["id", "content", "positionY"],
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// deleteNote — catch branch (lines 260-261)
// ---------------------------------------------------------------------------

describe("deleteNote — catch branch", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns error object when fetch throws a network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network failure"));

    const result = await deleteNote(1, 42);

    expect(result).toEqual({
      error: "Database Error: Failed to Delete Note.",
    });
    // revalidateTag should NOT have been called
    const { revalidateTag } = jest.requireMock("next/cache");
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
