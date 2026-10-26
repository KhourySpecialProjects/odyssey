import { getOrOpenReview } from "@/lib/requests/reviews";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
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

const ROLES = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.ContentEditor,
];
const reviewer = () =>
  authFixtures.as({
    id: 9,
    roles: [AuthorizedUserRoleTitle.ContentEditor],
  });

let fetchMock: jest.MockedFunction<typeof fetch>;

type Cfg = { urlParams?: { filters?: Record<string, any> } };

/** Routes fetchAPI by path; `rows` maps a review key to its stored row. */
function arrangeFetch(
  droplet: { inReview: boolean; reviewRound: number | null } | null,
  rows: Record<string, object> = {},
) {
  mockedFetchAPI.mockImplementation((async (path: string, cfg: Cfg) => {
    if (path === "/droplets") {
      return droplet ? [{ id: 3, documentId: "droplet-3", ...droplet }] : [];
    }
    if (path === "/reviews") {
      const row = rows[cfg.urlParams?.filters?.key?.$eq];
      return row ? [row] : [];
    }
    return [];
  }) as any);
}

function reviewLookups(): string[] {
  return mockedFetchAPI.mock.calls
    .filter(([path]) => path === "/reviews")
    .map(([, cfg]) => (cfg as Cfg).urlParams?.filters?.key?.$eq);
}

const created = { id: 50, round: 1, key: "3:9:1", state: "open" };

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  mockedRequireRole.mockResolvedValue(reviewer());
});

describeServerActionAuth("getOrOpenReview", {
  requireRole: mockedRequireRole,
  invoke: () => getOrOpenReview(3),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => {
      arrangeFetch({ inReview: true, reviewRound: 1 });
      fetchMock.mockResolvedValue(
        makeFetchResponse({ data: { id: 50, attributes: created } }),
      );
    },
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("getOrOpenReview", () => {
  it("reads the droplet's inReview and reviewRound without caching", async () => {
    arrangeFetch({ inReview: true, reviewRound: 1 }, { "3:9:1": created });

    await getOrOpenReview(3);

    expect(mockedFetchAPI).toHaveBeenCalledWith(
      "/droplets",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          fields: ["inReview", "reviewRound"],
        }),
        cache: "no-store",
      }),
    );
  });

  it("returns an existing review without a POST or revalidate", async () => {
    arrangeFetch({ inReview: true, reviewRound: 1 }, { "3:9:1": created });

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: true, error: null, data: created });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("creates the review for the current round", async () => {
    arrangeFetch({ inReview: true, reviewRound: 1 });
    fetchMock.mockResolvedValue(
      makeFetchResponse({ data: { id: 50, attributes: created } }),
    );

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: true, error: null, data: created });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/reviews$/);
    expect(JSON.parse(String(init?.body)).data).toEqual({
      droplet: "droplet-3",
      reviewer: "doc9",
      round: 1,
      key: "3:9:1",
      state: "open",
    });
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("opens round 2 after round 1 was sent and the droplet was resubmitted", async () => {
    arrangeFetch(
      { inReview: true, reviewRound: 2 },
      { "3:9:1": { id: 40, key: "3:9:1", state: "sent" } },
    );
    fetchMock.mockResolvedValue(
      makeFetchResponse({
        data: {
          id: 51,
          attributes: { id: 51, round: 2, key: "3:9:2", state: "open" },
        },
      }),
    );

    await getOrOpenReview(3);

    expect(reviewLookups()).toEqual(["3:9:2"]);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).data;
    expect(body).toMatchObject({ round: 2, key: "3:9:2" });
  });

  it("returns the sent review when not resubmitted", async () => {
    const sent = { id: 40, key: "3:9:1", state: "sent" };
    arrangeFetch({ inReview: false, reviewRound: 1 }, { "3:9:1": sent });

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: true, error: null, data: sent });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([0, null])(
    "returns not_in_review for reviewRound %s without a lookup",
    async (reviewRound) => {
      for (const inReview of [true, false]) {
        mockedFetchAPI.mockClear();
        arrangeFetch({ inReview, reviewRound });

        const result = await getOrOpenReview(3);

        expect(result).toEqual({
          ok: false,
          error: "not_in_review",
          data: null,
        });
        expect(reviewLookups()).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
      }
    },
  );

  it("returns not_in_review when not inReview and no row exists", async () => {
    arrangeFetch({ inReview: false, reviewRound: 2 });

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: false, error: "not_in_review", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the winning row when the POST loses the key race", async () => {
    const winner = { id: 60, key: "3:9:1", state: "open" };
    let lookups = 0;
    mockedFetchAPI.mockImplementation((async (path: string) => {
      if (path === "/droplets") {
        return [
          { id: 3, documentId: "droplet-3", inReview: true, reviewRound: 1 },
        ];
      }
      return ++lookups === 1 ? [] : [winner];
    }) as any);
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status: 400 } }, 400),
    );

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: true, error: null, data: winner });
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("fails when the POST fails and nothing is found on re-lookup", async () => {
    arrangeFetch({ inReview: true, reviewRound: 1 });
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status: 500 } }, 500),
    );

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: false, error: "failed", data: null });
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("logs and returns failed when a lookup throws", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedFetchAPI.mockRejectedValue(new Error("boom"));

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: false, error: "failed", data: null });
    expect(spy).toHaveBeenCalledWith(
      "getOrOpenReview failed",
      expect.any(Error),
    );
    spy.mockRestore();
  });

  it("logs the status when the POST is not ok", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    arrangeFetch({ inReview: true, reviewRound: 1 });
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status: 500 } }, 500),
    );

    await getOrOpenReview(3);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("POST"),
      500,
      expect.anything(),
    );
    spy.mockRestore();
  });

  it("falls back to a re-lookup when the POST returns no data", async () => {
    const winner = { id: 60, key: "3:9:1", state: "open" };
    let lookups = 0;
    mockedFetchAPI.mockImplementation((async (path: string) => {
      if (path === "/droplets") {
        return [
          { id: 3, documentId: "droplet-3", inReview: true, reviewRound: 1 },
        ];
      }
      return ++lookups === 1 ? [] : [winner];
    }) as any);
    fetchMock.mockResolvedValue(makeFetchResponse({ data: null }));

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: true, error: null, data: winner });
  });

  it("uses the fetched droplet id, never the argument", async () => {
    const row = { id: 50, key: "4:9:1", state: "open" };
    mockedFetchAPI.mockImplementation((async (path: string, cfg: Cfg) => {
      if (path === "/droplets") {
        return [
          { id: 4, documentId: "droplet-4", inReview: true, reviewRound: 1 },
        ];
      }
      return cfg.urlParams?.filters?.key?.$eq === "4:9:1" ? [] : [];
    }) as any);
    fetchMock.mockResolvedValue(
      makeFetchResponse({ data: { id: 50, attributes: row } }),
    );

    await getOrOpenReview(3);

    expect(reviewLookups()).toEqual(["4:9:1"]);
    expect(
      JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).data,
    ).toMatchObject({ droplet: "droplet-4", key: "4:9:1" });
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-4");
    expect(mockedRevalidateTag).not.toHaveBeenCalledWith("review-3");
  });

  it("returns not_found for an unknown droplet", async () => {
    arrangeFetch(null);

    const result = await getOrOpenReview(3);

    expect(result).toEqual({ ok: false, error: "not_found", data: null });
  });

  it.each([0, "3"])("rejects dropletId %p as invalid_input", async (bad) => {
    const result = await getOrOpenReview(bad as any);

    expect(result).toEqual({ ok: false, error: "invalid_input", data: null });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });
});
