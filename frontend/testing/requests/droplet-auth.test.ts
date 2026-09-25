// Reference example for describeServerActionAuth (ODY-502). Copy this shape for ODY-503–511.
import { togglePresentationEnabled } from "@/lib/requests/droplet";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import {
  makeDroplet,
  mockGlobalFetch,
  makeFetchResponse,
} from "@/lib/testing/mock-helpers";

// ─── module mocks ────────────────────────────────────────────────────────────

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentByUserAndDroplet: jest.fn(),
}));

jest.mock("@/lib/requests/lesson", () => ({
  deleteLesson: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);
const mockedRevalidateTag = jest.mocked(revalidateTag);

/** A droplet owned by authorized user 7 — the fixture most cases share. */
function dropletOwnedBySeven() {
  return makeDroplet({ id: 1, authorized_users: [{ id: 7 }] });
}

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
});

describeServerActionAuth("togglePresentationEnabled", {
  requireRole: mockedRequireRole,
  invoke: () => togglePresentationEnabled(1, true),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(dropletOwnedBySeven());
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(dropletOwnedBySeven());
      fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));
    },
    expect: (result) => {
      expect(result.ok).toBe(true);
    },
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("togglePresentationEnabled: extra cases", () => {
  it("allows an admin to toggle presentation on a droplet owned by someone else", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue(dropletOwnedBySeven());
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));

    const result = await togglePresentationEnabled(1, true);

    expect(result.ok).toBe(true);
  });

  it("denies a droplet with no owners and runs no mutation or cache invalidation", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(
      makeDroplet({ id: 1, authorized_users: [] }),
    );

    const result = await togglePresentationEnabled(1, true);

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});
