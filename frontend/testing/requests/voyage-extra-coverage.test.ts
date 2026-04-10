/**
 * Coverage gap tests for lib/requests/voyage.ts
 *
 * Targets uncovered lines:
 *   19-51   getVoyages — happy path
 *   57-86   getVoyagesAdmin — happy path
 *   93-133  getVoyageBySlug — happy path + includeDrafts branch + not-found
 *   275     cleanupVoyage catch (cleanup itself throws)
 *   307-308 branch node with unresolved parent → cleanup + error
 *   331-333 branch node POST failure → cleanup + error
 *   343-344 outer catch in createVoyageWithNodes
 *   399-400 publishVoyage fetch !response.ok branch
 *   410-411 publishVoyage outer catch
 *   463     deleteVoyage fetch !response.ok branch
 *   472-473 deleteVoyage outer catch
 */

import {
  getVoyages,
  getVoyagesAdmin,
  getVoyageBySlug,
  createVoyageWithNodes,
  publishVoyage,
  deleteVoyage,
} from "@/lib/requests/voyage";
import { flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  getMockedFetchAPI,
  mockGlobalFetch,
  makeFetchResponse,
  assertOk,
} from "@/lib/testing/mock-helpers";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

function getMockedRequireRole() {
  return jest.mocked(requireRole);
}

function mockAsAdmin(userId = 1) {
  getMockedRequireRole().mockResolvedValue({
    ok: true,
    user: {
      id: userId,
      email: "admin@example.com",
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    },
  });
}

function mockAsFaculty(userId = 42) {
  getMockedRequireRole().mockResolvedValue({
    ok: true,
    user: {
      id: userId,
      email: "faculty@example.com",
      roles: [AuthorizedUserRoleTitle.Faculty],
    },
  });
}

/** A minimal valid main-path node for createVoyageWithNodes. */
function makeMainNode(
  overrides: Partial<{
    playlistId: number;
    label: string;
    orderIndex: number;
  }> = {},
) {
  return {
    playlistId: 1,
    label: "Intro",
    isMainPath: true,
    branchType: "required" as const,
    parentPlaylistId: null,
    orderIndex: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getVoyages (lines 19-51)
// ---------------------------------------------------------------------------

describe("getVoyages", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches published voyages with voyage_nodes and authors populated", async () => {
    const mockVoyages = [
      { id: 1, name: "Voyage A", status: "published" },
      { id: 2, name: "Voyage B", status: "published" },
    ];
    getMockedFetchAPI().mockResolvedValueOnce(mockVoyages);

    const result = await getVoyages();

    expect(result).toEqual(mockVoyages);
    expect(getMockedFetchAPI()).toHaveBeenCalledWith("/voyages", {
      urlParams: expect.objectContaining({
        filters: { status: { $eq: "published" } },
        sort: ["name:asc"],
        populate: expect.objectContaining({
          voyage_nodes: expect.any(Object),
          authors: expect.any(Object),
        }),
      }),
      next: {
        tags: [CACHE_TAGS.voyages],
        revalidate: 900,
      },
    });
  });

  it("returns empty array when no published voyages exist", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([]);

    const result = await getVoyages();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getVoyagesAdmin (lines 57-86)
// ---------------------------------------------------------------------------

describe("getVoyagesAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches all voyages including drafts with publicationState preview", async () => {
    const mockVoyages = [
      { id: 1, name: "Draft Voyage", status: "draft" },
      { id: 2, name: "Published Voyage", status: "published" },
    ];
    getMockedFetchAPI().mockResolvedValueOnce(mockVoyages);

    const result = await getVoyagesAdmin();

    expect(result).toEqual(mockVoyages);
    expect(getMockedFetchAPI()).toHaveBeenCalledWith("/voyages", {
      urlParams: expect.objectContaining({
        publicationState: "preview",
        sort: ["name:asc"],
      }),
      next: {
        tags: [CACHE_TAGS.voyages],
        revalidate: 0,
      },
    });
  });

  it("returns empty array when no voyages exist", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([]);

    const result = await getVoyagesAdmin();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getVoyageBySlug (lines 93-133)
// ---------------------------------------------------------------------------

describe("getVoyageBySlug", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the voyage when found by slug (published only)", async () => {
    const mockVoyage = { id: 5, name: "Test Voyage", slug: "test-voyage" };
    getMockedFetchAPI().mockResolvedValueOnce([mockVoyage]);

    const result = await getVoyageBySlug("test-voyage");

    expect(result).toEqual(mockVoyage);
    expect(getMockedFetchAPI()).toHaveBeenCalledWith("/voyages", {
      urlParams: expect.objectContaining({
        filters: expect.objectContaining({
          slug: { $eq: "test-voyage" },
          status: { $eq: "published" },
        }),
        pagination: { pageSize: 1, page: 1 },
      }),
      next: {
        tags: [CACHE_TAGS.voyages],
        revalidate: 900,
      },
    });
  });

  it("returns null when no voyage matches the slug", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([]);

    const result = await getVoyageBySlug("nonexistent-slug");

    expect(result).toBeNull();
  });

  it("includes publicationState preview and omits status filter when includeDrafts=true", async () => {
    const mockDraftVoyage = {
      id: 8,
      name: "Draft Voyage",
      slug: "draft-voyage",
    };
    getMockedFetchAPI().mockResolvedValueOnce([mockDraftVoyage]);

    const result = await getVoyageBySlug("draft-voyage", {
      includeDrafts: true,
    });

    expect(result).toEqual(mockDraftVoyage);
    expect(getMockedFetchAPI()).toHaveBeenCalledWith("/voyages", {
      urlParams: expect.objectContaining({
        publicationState: "preview",
        filters: {
          slug: { $eq: "draft-voyage" },
          // status filter NOT present when includeDrafts=true
        },
      }),
      next: {
        tags: [CACHE_TAGS.voyages],
        revalidate: 900,
      },
    });
  });

  it("does not include publicationState when includeDrafts=false (default)", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([]);

    await getVoyageBySlug("some-voyage");

    const call = getMockedFetchAPI().mock.calls[0];
    const urlParams = call[1].urlParams as Record<string, unknown>;
    expect(urlParams).not.toHaveProperty("publicationState");
  });
});

// ---------------------------------------------------------------------------
// createVoyageWithNodes — cleanupVoyage catch (line 275)
// ---------------------------------------------------------------------------

describe("createVoyageWithNodes — cleanupVoyage catch branch", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("still returns node error even when cleanup DELETE throws", async () => {
    mockAsAdmin();

    const createdVoyage = { id: 99, name: "Voyage", slug: "voyage" };
    jest.mocked(flattenAttributes).mockReturnValueOnce(createdVoyage);

    fetchMock
      // voyage POST — succeeds
      .mockResolvedValueOnce(makeFetchResponse({ data: createdVoyage }))
      // main node POST — fails
      .mockResolvedValueOnce(
        makeFetchResponse({ error: { message: "Node creation failed" } }, 400),
      )
      // cleanup DELETE — throws network error
      .mockRejectedValueOnce(new Error("Network error during cleanup"));

    const result = await createVoyageWithNodes({
      name: "Voyage",
      nodes: [makeMainNode({ playlistId: 5 })],
    });

    // Despite cleanup failure, should still return the node creation error
    expect(result).toEqual({
      ok: false,
      error: "Node creation failed",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createVoyageWithNodes — branch node unresolved parent (lines 307-308)
// NOTE: These lines are a defence-in-depth guard that Zod's superRefine
// already prevents (it rejects any branch node whose parentPlaylistId is
// not in the nodes list). The runtime check is dead code under normal
// operation; no test is written for it to avoid a brittle mock arrangement.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// createVoyageWithNodes — branch node POST failure (lines 331-333)
// ---------------------------------------------------------------------------

describe("createVoyageWithNodes — branch node POST failure", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("cleans up and returns error when branch node POST fails", async () => {
    mockAsAdmin();

    const createdVoyage = { id: 99, name: "Voyage", slug: "voyage" };
    const mainNodeResult = { id: 10 };

    jest
      .mocked(flattenAttributes)
      .mockReturnValueOnce(createdVoyage)
      .mockReturnValueOnce(mainNodeResult);

    fetchMock
      // voyage POST — succeeds
      .mockResolvedValueOnce(makeFetchResponse({ data: createdVoyage }))
      // main node POST — succeeds
      .mockResolvedValueOnce(makeFetchResponse({ data: mainNodeResult }))
      // branch node POST — fails
      .mockResolvedValueOnce(
        makeFetchResponse({ error: { message: "Branch node failed" } }, 400),
      )
      // cleanup DELETE
      .mockResolvedValueOnce(makeFetchResponse({}));

    const result = await createVoyageWithNodes({
      name: "Voyage",
      nodes: [
        makeMainNode({ playlistId: 5, label: "Main" }),
        {
          playlistId: 20,
          label: "Branch",
          isMainPath: false,
          branchType: "optional",
          parentPlaylistId: 5, // valid parent
          orderIndex: 1,
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "Branch node failed",
      data: null,
    });

    // Cleanup DELETE should have been called
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/voyages/99"),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createVoyageWithNodes — outer catch (lines 343-344)
// ---------------------------------------------------------------------------

describe("createVoyageWithNodes — outer catch branch", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns generic error when fetch throws unexpectedly", async () => {
    mockAsAdmin();

    fetchMock.mockRejectedValueOnce(new Error("Unexpected network failure"));

    const result = await createVoyageWithNodes({
      name: "Voyage",
      nodes: [makeMainNode()],
    });

    expect(result).toEqual({
      ok: false,
      error: "Database Error: Failed to create voyage.",
      data: null,
    });
  });
});

// ---------------------------------------------------------------------------
// publishVoyage — fetch !response.ok (lines 399-400)
// ---------------------------------------------------------------------------

describe("publishVoyage — fetch error paths", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns error from response body when PUT returns non-ok status", async () => {
    mockAsAdmin();

    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({ error: { message: "Conflict error" } }, 409),
    );

    const result = await publishVoyage(20);

    expect(result).toEqual({ ok: false, error: "Conflict error" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns fallback message when error body has no message field", async () => {
    mockAsAdmin();

    fetchMock.mockResolvedValueOnce(makeFetchResponse({}, 500));

    const result = await publishVoyage(20);

    expect(result).toEqual({ ok: false, error: "Failed to publish voyage" });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns error when fetch throws (outer catch)", async () => {
    mockAsAdmin();

    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const result = await publishVoyage(20);

    expect(result).toEqual({ ok: false, error: "Failed to publish voyage." });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteVoyage — fetch !response.ok (line 463) and outer catch (lines 472-473)
// ---------------------------------------------------------------------------

describe("deleteVoyage — fetch error paths", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns error when DELETE fetch returns non-ok status", async () => {
    mockAsAdmin();

    fetchMock.mockResolvedValueOnce(makeFetchResponse({}, 500));

    const result = await deleteVoyage(55);

    expect(result).toEqual({
      ok: false,
      error: "Failed to delete voyage.",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns generic error when DELETE fetch throws (outer catch)", async () => {
    mockAsAdmin();

    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const result = await deleteVoyage(55);

    expect(result).toEqual({
      ok: false,
      error: "Database Error: Failed to delete voyage.",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
