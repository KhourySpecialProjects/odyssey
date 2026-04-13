/**
 * Branch-coverage tests for lib/requests/voyage.ts
 *
 * Targets uncovered branches:
 *   215   description ?? "" in createVoyageWithNodes voyage body
 *   255   nodeData.error?.message ?? "Failed to create voyage node"
 *   302   parentPlaylistId != null ? map.get(...) ?? null : null (map miss)
 *   303   same ?? null when get returns undefined
 *   306   parentNodeId === null && node.parentPlaylistId != null → cleanup + error
 *   379   voyage.authors?.map(...) ?? [] in publishVoyage (authors undefined)
 *   444   voyage.authors?.map(...) ?? [] in deleteVoyage (authors undefined)
 */

import {
  createVoyageWithNodes,
  publishVoyage,
  deleteVoyage,
} from "@/lib/requests/voyage";
import { flattenAttributes } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  getMockedFetchAPI,
  mockGlobalFetch,
  makeFetchResponse,
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
// Helpers
// ---------------------------------------------------------------------------

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = getMockedFetchAPI();
const mockedFlattenAttributes = jest.mocked(flattenAttributes);

function makeAdminAuth() {
  return {
    ok: true as const,
    user: {
      id: 1,
      email: "admin@test.com",
      roles: [AuthorizedUserRoleTitle.SysAdmin],
    },
  };
}

function makeFacultyAuth(userId = 10) {
  return {
    ok: true as const,
    user: {
      id: userId,
      email: "faculty@test.com",
      roles: [AuthorizedUserRoleTitle.Faculty],
    },
  };
}

// Minimal valid node for createVoyageWithNodes
function makeMainNode(playlistId: number, orderIndex = 0) {
  return {
    playlistId,
    label: `Node ${playlistId}`,
    isMainPath: true,
    branchType: "required" as const,
    parentPlaylistId: null,
    orderIndex,
  };
}

function makeBranchNode(
  playlistId: number,
  parentPlaylistId: number | null,
  orderIndex = 1,
) {
  return {
    playlistId,
    label: `Branch ${playlistId}`,
    isMainPath: false,
    branchType: "optional" as const,
    parentPlaylistId,
    orderIndex,
  };
}

beforeEach(() => {
  // resetAllMocks clears mockReturnValueOnce queues too, preventing cross-test
  // leakage of unconsumed return values on mockedFlattenAttributes.
  jest.resetAllMocks();
  // Restore the default pass-through implementation after reset.
  mockedFlattenAttributes.mockImplementation((data: unknown) => data);
});

// ---------------------------------------------------------------------------
// Line 215 — description ?? "" when description is undefined
// ---------------------------------------------------------------------------

describe("voyage-branches — description ?? '' in voyage body (line 215)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("sends empty string for description when not provided", async () => {
    mockedRequireRole.mockResolvedValue(makeAdminAuth());

    // Default flattenAttributes pass-through:
    //   voyageData.data   = { id: 1, attributes: { slug: "my-voyage" } } → voyage.id = 1
    //   nodeData.data     = { id: 10, attributes: {} }                   → nodeId = 10
    fetchMock
      .mockResolvedValueOnce(
        makeFetchResponse({
          data: { id: 1, attributes: { slug: "my-voyage" } },
        }),
      )
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 10, attributes: {} } }),
      );

    const result = await createVoyageWithNodes({
      name: "My Voyage",
      // description intentionally omitted → ?? "" branch fires
      nodes: [makeMainNode(100)],
    });

    expect(result.ok).toBe(true);
    const voyageBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    // description should be "" (the ?? "" fallback)
    expect(voyageBody.data.description).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Line 255 — nodeData.error?.message ?? "Failed to create voyage node"
// when error object has no message field
// ---------------------------------------------------------------------------

describe("voyage-branches — node creation error fallback message (line 255)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("uses fallback node error message when error.message is absent", async () => {
    mockedRequireRole.mockResolvedValue(makeAdminAuth());

    // Default flattenAttributes pass-through handles voyage creation.
    fetchMock
      // POST voyage succeeds
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 1, attributes: { slug: "v" } } }),
      )
      // POST node: ok=false, error without message → ?? fallback
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: {} }), // no message field
        text: async () => "{}",
        headers: new Headers(),
      } as Response)
      // cleanup DELETE
      .mockResolvedValueOnce(makeFetchResponse({}));

    const result = await createVoyageWithNodes({
      name: "Voyage",
      nodes: [makeMainNode(200)],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Failed to create voyage node");
  });
});

// ---------------------------------------------------------------------------
// Lines 302-306 — branch node with parentPlaylistId in map (no miss) vs
// parentPlaylistId that IS in the map (map.get ?? null — the ?? fires
// when get returns undefined, i.e., parentPlaylistId is not in the map)
// AND the guard: parentNodeId === null && node.parentPlaylistId != null
// ---------------------------------------------------------------------------

// NOTE: Lines 302-306 (parentPlaylistId not in map at runtime) are
// defence-in-depth dead code: the Zod superRefine check rejects any branch
// node whose parentPlaylistId is not in the nodes list before reaching
// this guard (confirmed in voyage-extra-coverage.test.ts). No test written.

describe("voyage-branches — branch node parent body fields (lines 299-336)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("resolves branch node when parentPlaylistId is in the map — includes parentNode in body", async () => {
    mockedRequireRole.mockResolvedValue(makeAdminAuth());

    // flattenAttributes default pass-through is sufficient:
    //   voyageData.data   = { id: 5, attributes: { slug: "voy" } } → voyage.id = 5
    //   main nodeData.data = { id: 20, attributes: {} }            → nodeId = 20
    //   branch nodeData.data = { id: 21, attributes: {} }          → nodeId = 21

    fetchMock
      // POST voyage
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 5, attributes: { slug: "voy" } } }),
      )
      // POST main node (playlist 100 → nodeId 20)
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 20, attributes: {} } }),
      )
      // POST branch node
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 21, attributes: {} } }),
      );

    const result = await createVoyageWithNodes({
      name: "Voyage",
      nodes: [
        makeMainNode(100),
        makeBranchNode(200, 100), // parent 100 is main → nodeId 20 is in map
      ],
    });

    expect(result.ok).toBe(true);
    // Branch node POST body should include parentNode: 20
    const branchBody = JSON.parse(fetchMock.mock.calls[2][1]?.body as string);
    expect(branchBody.data.parentNode).toBe(20);
  });

  it("branch node with null parentPlaylistId — parentNode absent from body", async () => {
    mockedRequireRole.mockResolvedValue(makeAdminAuth());

    fetchMock
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 7, attributes: { slug: "voy2" } } }),
      )
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 30, attributes: {} } }),
      )
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 31, attributes: {} } }),
      );

    const result = await createVoyageWithNodes({
      name: "Voyage",
      nodes: [
        makeMainNode(100),
        makeBranchNode(300, null), // null parentPlaylistId → parentNodeId = null → no parentNode
      ],
    });

    expect(result.ok).toBe(true);
    const branchBody = JSON.parse(fetchMock.mock.calls[2][1]?.body as string);
    expect(branchBody.data).not.toHaveProperty("parentNode");
  });
});

// ---------------------------------------------------------------------------
// Line 379 — voyage.authors?.map(...) ?? [] in publishVoyage when authors is undefined
// ---------------------------------------------------------------------------

describe("voyage-branches — publishVoyage authors ?? [] (line 379)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  it("treats missing authors as empty array → faculty not in list → forbidden", async () => {
    mockedRequireRole.mockResolvedValue(makeFacultyAuth(10));

    // fetchAPI returns voyage with no authors field → authors?.map() ?? [] = []
    mockedFetchAPI.mockResolvedValueOnce({
      id: 5,
      // authors intentionally absent
    });

    const result = await publishVoyage(5);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("forbidden");
  });

  it("treats authors: undefined as empty array → forbidden", async () => {
    mockedRequireRole.mockResolvedValue(makeFacultyAuth(10));

    mockedFetchAPI.mockResolvedValueOnce({
      id: 5,
      authors: undefined,
    });

    const result = await publishVoyage(5);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("forbidden");
  });
});

// ---------------------------------------------------------------------------
// Line 444 — voyage.authors?.map(...) ?? [] in deleteVoyage when authors is undefined
// ---------------------------------------------------------------------------

describe("voyage-branches — deleteVoyage authors ?? [] (line 444)", () => {
  beforeEach(() => {
    mockGlobalFetch();
  });

  it("treats missing authors as empty array → faculty not in list → forbidden", async () => {
    mockedRequireRole.mockResolvedValue(makeFacultyAuth(20));

    mockedFetchAPI.mockResolvedValueOnce({
      id: 7,
      // no authors field
    });

    const result = await deleteVoyage(7);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("forbidden");
  });

  it("treats authors: null as triggering ?? [] → forbidden when faculty not in list", async () => {
    mockedRequireRole.mockResolvedValue(makeFacultyAuth(20));

    mockedFetchAPI.mockResolvedValueOnce({
      id: 8,
      authors: null,
    });

    const result = await deleteVoyage(8);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("forbidden");
  });
});
