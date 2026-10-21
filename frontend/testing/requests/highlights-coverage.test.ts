/**
 * Coverage tests for the read functions in lib/requests/highlights.ts.
 * The writes (create/update/delete) are covered in highlights-auth.test.ts.
 */

import {
  getAllHighlightsByUser,
  getHighlightsByAuthorizedUserAndLesson,
} from "@/lib/requests/highlights";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getMockedFetchAPI, mockGlobalFetch } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

describe("highlights requests — coverage", () => {
  let mockedFetchAPI: ReturnType<typeof getMockedFetchAPI>;
  let mockFetch: ReturnType<typeof mockGlobalFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchAPI = getMockedFetchAPI();
    mockFetch = mockGlobalFetch();
  });

  // ── getAllHighlightsByUser (lines 84-119) ────────────────────────────────────

  describe("getAllHighlightsByUser", () => {
    it("returns all highlights when a single page is returned", async () => {
      const mockHighlights = [
        { id: 1, text: "Hello", color: "#fff300" as const, blockId: 1 },
        { id: 2, text: "World", color: "#86efac" as const, blockId: 2 },
      ];
      mockedFetchAPI.mockResolvedValueOnce(mockHighlights);

      const result = await getAllHighlightsByUser(7);

      expect(result).toEqual(mockHighlights);
      expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
      expect(mockedFetchAPI).toHaveBeenCalledWith("/highlights", {
        urlParams: expect.objectContaining({
          sort: ["yLevel:asc"],
          filters: { authorized_user: { id: { $eq: 7 } } },
          pagination: { page: 1, pageSize: 250 },
        }),
        next: {
          tags: [CACHE_TAGS.highlights(7)],
          revalidate: 900,
        },
      });
    });

    it("returns empty array when no highlights exist (null response)", async () => {
      mockedFetchAPI.mockResolvedValueOnce(null);

      const result = await getAllHighlightsByUser(7);

      expect(result).toEqual([]);
      expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
    });

    it("returns empty array when fetchAPI returns an empty array", async () => {
      mockedFetchAPI.mockResolvedValueOnce([]);

      const result = await getAllHighlightsByUser(7);

      expect(result).toEqual([]);
      expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
    });

    it("paginates across multiple pages and concatenates results", async () => {
      // Page 1 — full page of 250 items triggers next page
      const page1 = Array.from({ length: 250 }, (_, i) => ({
        id: i + 1,
        text: `highlight-${i + 1}`,
        color: "#fff300" as const,
        blockId: i + 1,
      }));
      // Page 2 — partial page (< 250) signals end
      const page2 = [
        {
          id: 251,
          text: "highlight-251",
          color: "#86efac" as const,
          blockId: 251,
        },
      ];

      mockedFetchAPI.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

      const result = await getAllHighlightsByUser(7);

      expect(result).toHaveLength(251);
      expect(result[0]).toEqual(page1[0]);
      expect(result[250]).toEqual(page2[0]);
      expect(mockedFetchAPI).toHaveBeenCalledTimes(2);

      // Second call must request page 2
      expect(mockedFetchAPI).toHaveBeenNthCalledWith(2, "/highlights", {
        urlParams: expect.objectContaining({
          pagination: { page: 2, pageSize: 250 },
        }),
        next: expect.anything(),
      });
    });

    it("paginates correctly across three full pages", async () => {
      const fullPage = Array.from({ length: 250 }, (_, i) => ({
        id: i + 1,
        text: `h-${i}`,
        color: "#fff300" as const,
        blockId: i,
      }));
      const lastPage = [
        { id: 751, text: "last", color: "#93c5fd" as const, blockId: 751 },
      ];

      mockedFetchAPI
        .mockResolvedValueOnce(fullPage)
        .mockResolvedValueOnce(fullPage)
        .mockResolvedValueOnce(lastPage);

      const result = await getAllHighlightsByUser(3);

      expect(result).toHaveLength(501);
      expect(mockedFetchAPI).toHaveBeenCalledTimes(3);
      expect(mockedFetchAPI).toHaveBeenNthCalledWith(3, "/highlights", {
        urlParams: expect.objectContaining({
          pagination: { page: 3, pageSize: 250 },
        }),
        next: expect.anything(),
      });
    });

    it("stops after exactly one full page when the second page is empty", async () => {
      const fullPage = Array.from({ length: 250 }, (_, i) => ({
        id: i + 1,
        text: `h-${i}`,
        color: "#fff300" as const,
        blockId: i,
      }));

      mockedFetchAPI.mockResolvedValueOnce(fullPage).mockResolvedValueOnce([]);

      const result = await getAllHighlightsByUser(5);

      expect(result).toHaveLength(250);
      expect(mockedFetchAPI).toHaveBeenCalledTimes(2);
    });

    it("propagates fetchAPI errors", async () => {
      mockedFetchAPI.mockRejectedValueOnce(new Error("API down"));

      await expect(getAllHighlightsByUser(7)).rejects.toThrow("API down");
    });
  });

  // ── getHighlightsByAuthorizedUserAndLesson ──────────────────────────────────

  describe("getHighlightsByAuthorizedUserAndLesson", () => {
    it("fetches the user's highlights on a lesson by slug", async () => {
      const mockHighlights = [
        {
          id: 1,
          text: "Key idea",
          color: "#fff300" as const,
          position: { start: 0, end: 8 },
          blockId: 4,
        },
      ];
      mockedFetchAPI.mockResolvedValueOnce(mockHighlights);

      const result = await getHighlightsByAuthorizedUserAndLesson(
        11,
        "intro-lesson",
      );

      expect(result).toEqual(mockHighlights);
      expect(mockedFetchAPI).toHaveBeenCalledWith("/highlights", {
        urlParams: expect.objectContaining({
          filters: {
            authorized_user: { id: { $eq: 11 } },
            lesson: { slug: { $eq: "intro-lesson" } },
          },
          fields: ["text", "position", "color", "blockId", "yLevel"],
          pagination: { pageSize: 250, page: 1 },
        }),
        next: {
          tags: [CACHE_TAGS.highlights(11), CACHE_TAGS.notes(11)],
          revalidate: 900,
        },
      });
    });

    it("reads through fetchAPI rather than raw fetch", async () => {
      mockedFetchAPI.mockResolvedValueOnce([]);

      await getHighlightsByAuthorizedUserAndLesson(22, "some-lesson");

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
    });

    it("propagates fetchAPI errors", async () => {
      mockedFetchAPI.mockRejectedValueOnce(new Error("API down"));

      await expect(
        getHighlightsByAuthorizedUserAndLesson(5, "some-lesson"),
      ).rejects.toThrow("API down");
    });
  });
});
