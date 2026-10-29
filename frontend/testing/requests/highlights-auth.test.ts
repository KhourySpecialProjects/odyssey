// Auth gates for the highlight writes (ODY-508, ODY-785). Highlights are
// private, so updates and deletes check ownership with no role bypass.
import {
  createHighlight,
  deleteHighlight,
  updateHighlight,
} from "@/lib/requests/highlights";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import {
  makeEmptyResponse,
  makeFetchResponse,
  mockGlobalFetch,
} from "@/lib/testing/mock-helpers";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
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
const fetchMock = mockGlobalFetch();

const highlightOwnedBySeven = () => ({
  id: 42,
  documentId: "docH42",
  authorized_user: { id: 7 },
});

beforeEach(() => {
  jest.clearAllMocks();
});

describeServerActionAuth("createHighlight", {
  requireRole: mockedRequireRole,
  invoke: () =>
    createHighlight({
      text: "SQL",
      position: { start: 0, end: 3 },
      color: "#fff300",
      blockId: 1,
      lessonId: 2,
    }),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: [] },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));
    },
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describeServerActionAuth("updateHighlight", {
  requireRole: mockedRequireRole,
  invoke: () => updateHighlight(42, { color: "#86efac" }),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue([highlightOwnedBySeven()]);
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue([highlightOwnedBySeven()]);
      fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 42 } }));
    },
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describeServerActionAuth("deleteHighlight", {
  requireRole: mockedRequireRole,
  invoke: () => deleteHighlight(42),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue([highlightOwnedBySeven()]);
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue([highlightOwnedBySeven()]);
      fetchMock.mockResolvedValue(makeEmptyResponse(204));
    },
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("highlight ownership", () => {
  it.each([
    ["update", () => updateHighlight(42, { color: "#86efac" })],
    ["delete", () => deleteHighlight(42)],
  ])("doesn't let a SysAdmin %s another user's highlight", async (_, act) => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue([highlightOwnedBySeven()]);

    await expect(act()).resolves.toEqual({
      ok: false,
      error: "forbidden",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
