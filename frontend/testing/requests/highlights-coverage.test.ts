/**
 * Coverage tests for lib/requests/highlights.ts.
 * Targets previously-uncovered paths: getAllHighlightsByUser (lines 84-119),
 * deleteHighlight error path (line 132), and remaining branch gaps.
 */

import {
  getAllHighlightsByUser,
  deleteHighlight,
  getHighlightsForLesson,
  createHighlight,
} from "@/lib/requests/highlights";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getMockedFetchAPI,
  mockGlobalFetch,
  makeFetchResponse,
} from "@/lib/testing/mock-helpers";
import { revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import type { User } from "@/types";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

const mockedRevalidateTag = jest.mocked(revalidateTag);

function getGetCurrentUser() {
  return jest.mocked(getCurrentUser);
}

function getGetAuthorizedUserByEmail() {
  return jest.mocked(getAuthorizedUserByEmail);
}

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

  // ── deleteHighlight (line 131-132: error branch) ───────────────────────────

  describe("deleteHighlight", () => {
    it("deletes a highlight and calls revalidateTag", async () => {
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 1 } }, 200),
      );

      await deleteHighlight(1, 5);

      expect(mockedRevalidateTag).toHaveBeenCalledWith(
        CACHE_TAGS.highlights(5),
      );
    });

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, 404));

      await expect(deleteHighlight(99, 5)).rejects.toThrow(
        "Failed to delete highlight",
      );
      expect(mockedRevalidateTag).not.toHaveBeenCalled();
    });

    it("throws on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection reset"));

      await expect(deleteHighlight(1, 5)).rejects.toThrow("Connection reset");
    });

    it("calls DELETE on the correct URL", async () => {
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 42 } }, 200),
      );

      await deleteHighlight(42, 7);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/highlights/42"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("uses the authorizedUserId to scope the cache tag", async () => {
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 1 } }, 200),
      );

      await deleteHighlight(1, 99);

      expect(mockedRevalidateTag).toHaveBeenCalledWith(
        CACHE_TAGS.highlights(99),
      );
    });
  });

  // ── getHighlightsForLesson ──────────────────────────────────────────────────

  describe("getHighlightsForLesson", () => {
    it("fetches highlights for a lesson when user is authenticated", async () => {
      const getCurrentUser = getGetCurrentUser();
      const getAuthorizedUserByEmail = getGetAuthorizedUserByEmail();
      getCurrentUser.mockResolvedValueOnce({
        email: "alice@example.com",
        roles: [],
        isActive: true,
      } as User);
      getAuthorizedUserByEmail.mockResolvedValueOnce({ id: 11 });

      const responseBody = { data: [{ id: 1, text: "note" }] };
      mockFetch.mockResolvedValueOnce(makeFetchResponse(responseBody));

      const result = await getHighlightsForLesson(3);

      expect(result).toEqual(responseBody);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("filters[lesson][id][$eq]=3"),
        expect.anything(),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("filters[authorized_user][id][$eq]=11"),
        expect.anything(),
      );
    });

    it("throws when current user has no email", async () => {
      const getCurrentUser = getGetCurrentUser();
      getCurrentUser.mockResolvedValueOnce({
        email: null,
        roles: [],
        isActive: true,
      } as User);

      await expect(getHighlightsForLesson(3)).rejects.toThrow(
        "No email identified",
      );
    });

    it("throws when current user is null", async () => {
      const getCurrentUser = getGetCurrentUser();
      getCurrentUser.mockResolvedValueOnce(undefined);

      await expect(getHighlightsForLesson(3)).rejects.toThrow(
        "No email identified",
      );
    });

    it("uses authorized user id for cache tag", async () => {
      const getCurrentUser = getGetCurrentUser();
      const getAuthorizedUserByEmail = getGetAuthorizedUserByEmail();
      getCurrentUser.mockResolvedValueOnce({
        email: "bob@example.com",
        roles: [],
        isActive: true,
      } as User);
      getAuthorizedUserByEmail.mockResolvedValueOnce({ id: 22 });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

      await getHighlightsForLesson(5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          next: expect.objectContaining({
            tags: [CACHE_TAGS.highlights(22)],
          }),
        }),
      );
    });
  });

  // ── createHighlight ─────────────────────────────────────────────────────────

  describe("createHighlight", () => {
    it("creates a highlight and calls revalidateTag", async () => {
      const highlightData = {
        data: {
          text: "Key concept",
          color: "#fff300",
          authorized_user: 5,
          lesson: 2,
        },
      };
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 10 } }, 201),
      );

      const result = await createHighlight(highlightData);

      expect(result).toEqual({ data: { id: 10 } });
      expect(mockedRevalidateTag).toHaveBeenCalledWith(
        CACHE_TAGS.highlights(5),
      );
    });

    it("throws when response is not ok", async () => {
      const highlightData = {
        data: { text: "note", authorized_user: 5, lesson: 1 },
      };
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, 400));

      await expect(createHighlight(highlightData)).rejects.toThrow(
        "Failed to create highlight",
      );
      expect(mockedRevalidateTag).not.toHaveBeenCalled();
    });

    it("throws on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(
        createHighlight({ data: { text: "note", authorized_user: 5 } }),
      ).rejects.toThrow("Network timeout");
    });

    it("POSTs to the correct highlights endpoint", async () => {
      const highlightData = {
        data: { text: "concept", authorized_user: 3, lesson: 7 },
      };
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 1 } }, 201),
      );

      await createHighlight(highlightData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/highlights"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
