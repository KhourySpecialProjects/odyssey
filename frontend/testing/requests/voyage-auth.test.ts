// Reference-shaped auth tests for archiveVoyage (ODY-502 Task 4).
import { archiveVoyage } from "@/lib/requests/voyage";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

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

/** A voyage authored by authorized user 7. */
function voyageAuthoredBySeven() {
  return { id: 1, authors: [{ id: 7 }] };
}

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
});

describeServerActionAuth("archiveVoyage", {
  requireRole: mockedRequireRole,
  invoke: () => archiveVoyage(1, true),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(voyageAuthoredBySeven());
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(voyageAuthoredBySeven());
      fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));
    },
    expect: (result) => {
      expect(result.success).toBe(true);
    },
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ success: false, error: code }),
});

describe("archiveVoyage: extra cases", () => {
  it("allows an admin to archive a voyage authored by someone else", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue(voyageAuthoredBySeven());
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));

    const result = await archiveVoyage(1, true);

    expect(result.success).toBe(true);
  });

  it("denies a voyage with no authors and runs no mutation or cache invalidation", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue({ id: 1, authors: [] });

    const result = await archiveVoyage(1, true);

    expect(result).toEqual({ success: false, error: "forbidden" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns success:false with no write when the voyage lookup fails", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockRejectedValue(new Error("network error"));

    const result = await archiveVoyage(1, true);

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});
