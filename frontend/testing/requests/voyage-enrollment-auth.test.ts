// Auth tests for claimNodeForUser/claimVoyageDropletNode/unclaimVoyageDropletNode (ODY-502 Task 5).
import {
  claimNodeForUser,
  claimVoyageDropletNode,
  unclaimVoyageDropletNode,
} from "@/lib/requests/voyage-enrollment";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);
const mockedRevalidateTag = jest.mocked(revalidateTag);

/** An unclaimed droplet node, ready to be claimed. */
function unclaimedNode() {
  return [
    {
      id: 1,
      label: "Node 1",
      nodeType: "droplet",
      claimStatus: "unclaimed",
      voyage: { name: "Test Voyage" },
    },
  ];
}

/** A droplet node already claimed by authorized user 7. */
function claimedBySeven() {
  return [{ id: 1, claimStatus: "claimed", claimedBy: { id: 7 } }];
}

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  // Both the droplet-creation POST and the node-update PUT ignore their
  // response body except .ok/.json(), so one shared success response works.
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { id: 5, slug: "n" } }),
  );
});

describeServerActionAuth("claimNodeForUser", {
  requireRole: mockedRequireRole,
  invoke: () => claimNodeForUser(1, 7),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(unclaimedNode());
    },
    expect: (result) => {
      expect(result.ok).toBe(true);
    },
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("claimNodeForUser: extra cases", () => {
  it("allows a SysAdmin to claim a node for another user", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue(unclaimedNode());

    const result = await claimNodeForUser(1, 7);

    expect(result.ok).toBe(true);
  });
});

describeServerActionAuth("claimVoyageDropletNode", {
  requireRole: mockedRequireRole,
  invoke: () => claimVoyageDropletNode(1),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "role",
    roles: [
      AuthorizedUserRoleTitle.ContentCreator,
      AuthorizedUserRoleTitle.ContentEditor,
      AuthorizedUserRoleTitle.Faculty,
      AuthorizedUserRoleTitle.SysAdmin,
    ],
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(unclaimedNode());
    },
    expect: (result) => {
      expect(result.ok).toBe(true);
      // The nested claimNodeForUser call re-gates with withAuth([]).
      expect(mockedRequireRole).toHaveBeenNthCalledWith(2, []);
    },
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describeServerActionAuth("unclaimVoyageDropletNode", {
  requireRole: mockedRequireRole,
  invoke: () => unclaimVoyageDropletNode(1),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(claimedBySeven());
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(claimedBySeven());
    },
    expect: (result) => {
      expect(result.ok).toBe(true);
    },
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code }),
});

describe("unclaimVoyageDropletNode: extra cases", () => {
  it("allows Faculty to unclaim someone else's node", async () => {
    mockedRequireRole.mockResolvedValue(
      authFixtures.as({ id: 1, roles: [AuthorizedUserRoleTitle.Faculty] }),
    );
    mockedFetchAPI.mockResolvedValue(claimedBySeven());

    const result = await unclaimVoyageDropletNode(1);

    expect(result.ok).toBe(true);
  });

  it("denies an already-unclaimed node with no write", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(unclaimedNode());

    const result = await unclaimVoyageDropletNode(1);

    expect(result).toEqual({ ok: false, error: "Node is not claimed" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns ok:false with no write when the node lookup fails", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue([]);

    const result = await unclaimVoyageDropletNode(1);

    expect(result).toEqual({ ok: false, error: "Node not found" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});
