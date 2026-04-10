/**
 * Security hardening tests for voyage.ts:
 *   - Zod validation in createVoyageWithNodes
 *   - Ownership checks in deleteVoyage and publishVoyage
 */

import {
  createVoyageWithNodes,
  deleteVoyage,
  publishVoyage,
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

function mockUnauthenticated() {
  getMockedRequireRole().mockResolvedValue({
    ok: false,
    error: "unauthenticated",
  });
}

/** A minimal valid node that satisfies VoyageTreeSchema node requirements. */
function makeValidNode(
  overrides: Partial<{
    playlistId: number;
    label: string;
    isMainPath: boolean;
    branchType: "required" | "optional";
    parentPlaylistId: number | null;
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
// Task 1: createVoyageWithNodes — Zod validation
// ---------------------------------------------------------------------------

describe("createVoyageWithNodes — Zod validation (Task 1)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("rejects empty name with invalid_input before any network call", async () => {
    mockAsAdmin();

    const result = await createVoyageWithNodes({
      name: "",
      nodes: [makeValidNode()],
    });

    expect(result).toEqual({ ok: false, error: "invalid_input", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty nodes array with invalid_input before any network call", async () => {
    mockAsAdmin();

    const result = await createVoyageWithNodes({
      name: "My Voyage",
      nodes: [],
    });

    expect(result).toEqual({ ok: false, error: "invalid_input", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a node that references itself as its own parent (circular ref)", async () => {
    mockAsAdmin();

    const result = await createVoyageWithNodes({
      name: "Circular Voyage",
      nodes: [
        makeValidNode({
          playlistId: 5,
          parentPlaylistId: 5, // self-reference
          isMainPath: false,
        }),
      ],
    });

    expect(result).toEqual({ ok: false, error: "invalid_input", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a branch node whose parentPlaylistId does not exist in the nodes list (orphan)", async () => {
    mockAsAdmin();

    const result = await createVoyageWithNodes({
      name: "Orphan Voyage",
      nodes: [
        makeValidNode({
          playlistId: 10,
          parentPlaylistId: 999, // 999 is not in the list
          isMainPath: false,
        }),
      ],
    });

    expect(result).toEqual({ ok: false, error: "invalid_input", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes valid tree to Strapi and returns created voyage", async () => {
    mockAsAdmin();

    const createdVoyage = {
      id: 77,
      name: "Valid Voyage",
      slug: "valid-voyage",
    };

    jest.mocked(flattenAttributes).mockReturnValueOnce(createdVoyage);

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse({ data: createdVoyage }))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 101 } }));

    jest.mocked(flattenAttributes).mockReturnValueOnce({ id: 101 });

    const result = await createVoyageWithNodes({
      name: "Valid Voyage",
      description: "A great voyage",
      nodes: [makeValidNode({ playlistId: 5, label: "Intro", orderIndex: 0 })],
    });

    assertOk(result);
    expect(result.data).toEqual(createdVoyage);

    // Verify the voyage POST was made with validated name
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/voyages"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"name":"Valid Voyage"'),
      }),
    );

    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.voyages);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userContent);
  });

  it("returns Unauthorized when user is not authenticated (before validation)", async () => {
    mockUnauthenticated();

    const result = await createVoyageWithNodes({
      name: "Test Voyage",
      nodes: [makeValidNode()],
    });

    // Auth check runs before Zod validation
    expect(result).toEqual({ ok: false, error: "Unauthorized", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Task 3: deleteVoyage — ownership check
// ---------------------------------------------------------------------------

describe("deleteVoyage — ownership check (Task 3)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns unauthenticated when requireRole fails", async () => {
    mockUnauthenticated();

    const result = await deleteVoyage(1);

    expect(result).toEqual({
      ok: false,
      error: "unauthenticated",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows admin to delete another user's voyage without ownership check", async () => {
    mockAsAdmin(1);

    const deletedVoyage = { id: 55, slug: "some-voyage" };
    jest.mocked(flattenAttributes).mockReturnValueOnce(deletedVoyage);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: deletedVoyage }));

    const result = await deleteVoyage(55);

    assertOk(result);
    expect(result.data).toEqual(deletedVoyage);

    // fetchAPI should NOT be called for ownership lookup (admin skips it)
    expect(getMockedFetchAPI()).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/voyages/55"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("allows faculty to delete their own voyage", async () => {
    mockAsFaculty(42);

    const voyageWithAuthor = { id: 10, authors: [{ id: 42 }] };
    getMockedFetchAPI().mockResolvedValueOnce(voyageWithAuthor);

    const deletedVoyage = { id: 10, slug: "my-voyage" };
    jest.mocked(flattenAttributes).mockReturnValueOnce(deletedVoyage);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: deletedVoyage }));

    const result = await deleteVoyage(10);

    assertOk(result);
    expect(result.data).toEqual(deletedVoyage);

    expect(getMockedFetchAPI()).toHaveBeenCalledWith(
      "/voyages/10",
      expect.objectContaining({
        urlParams: { populate: { authors: { fields: ["id"] } } },
        next: { tags: [CACHE_TAGS.voyages], revalidate: 0 },
      }),
    );
  });

  it("prevents faculty from deleting another faculty member's voyage", async () => {
    // Faculty user ID 42, but voyage is authored by user 99
    mockAsFaculty(42);

    const voyageWithOtherAuthor = { id: 10, authors: [{ id: 99 }] };
    getMockedFetchAPI().mockResolvedValueOnce(voyageWithOtherAuthor);

    const result = await deleteVoyage(10);

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    // No DELETE request should be made
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not_found when voyage does not exist during ownership check", async () => {
    mockAsFaculty(42);

    // fetchAPI returns null (voyage not found)
    getMockedFetchAPI().mockResolvedValueOnce(null);

    const result = await deleteVoyage(999);

    expect(result).toEqual({ ok: false, error: "not_found", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Task 3: publishVoyage — ownership check
// ---------------------------------------------------------------------------

describe("publishVoyage — ownership check (Task 3)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns unauthenticated when requireRole fails", async () => {
    mockUnauthenticated();

    const result = await publishVoyage(1);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows admin to publish any voyage without ownership check", async () => {
    mockAsAdmin(1);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({}));

    const result = await publishVoyage(20);

    expect(result).toEqual({ ok: true, error: null });

    // fetchAPI should NOT be called for ownership lookup (admin skips it)
    expect(getMockedFetchAPI()).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/voyages/20"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("allows faculty to publish their own voyage", async () => {
    mockAsFaculty(42);

    const voyageWithAuthor = { id: 20, authors: [{ id: 42 }] };
    getMockedFetchAPI().mockResolvedValueOnce(voyageWithAuthor);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({}));

    const result = await publishVoyage(20);

    expect(result).toEqual({ ok: true, error: null });
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.voyages);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userContent);

    expect(getMockedFetchAPI()).toHaveBeenCalledWith(
      "/voyages/20",
      expect.objectContaining({
        urlParams: { populate: { authors: { fields: ["id"] } } },
        next: { tags: [CACHE_TAGS.voyages], revalidate: 0 },
      }),
    );
  });

  it("prevents faculty from publishing another faculty member's voyage", async () => {
    // Faculty user ID 42, but voyage is authored by user 99
    mockAsFaculty(42);

    const voyageWithOtherAuthor = { id: 20, authors: [{ id: 99 }] };
    getMockedFetchAPI().mockResolvedValueOnce(voyageWithOtherAuthor);

    const result = await publishVoyage(20);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    // No PUT request should be made
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not_found when voyage does not exist during ownership check", async () => {
    mockAsFaculty(42);

    getMockedFetchAPI().mockResolvedValueOnce(null);

    const result = await publishVoyage(999);

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
