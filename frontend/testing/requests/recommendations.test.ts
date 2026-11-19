import { revalidateTag } from "next/cache";
import {
  dismissRecommendation,
  getMyRecommendations,
} from "@/lib/requests/recommendations";
import {
  resolveDocumentId,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";
import {
  fakeDocumentId,
  installDocumentIdMock,
} from "@/lib/testing/document-id-mock";
import { requireRole } from "@/lib/auth/require-role";
import { getRecommendations } from "@/lib/recommendations";
import type { Recommendation, RecommendationOptions } from "@/types";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("next/cache");
jest.mock("@/lib/recommendations", () => ({ getRecommendations: jest.fn() }));

const mockedRequireRole = jest.mocked(requireRole);
const mockedGetRecommendations = jest.mocked(getRecommendations);

const OPTIONS: RecommendationOptions = {
  surface: "recap",
  limit: 3,
  excludeDropletIds: [4, 5],
};
const PICKS = [
  {
    droplet: { id: 1, name: "A", slug: "a" },
    reason: "Top rated on Odyssey",
    rule: "popular",
  },
] as Recommendation[];

beforeEach(() => {
  jest.clearAllMocks();
  installDocumentIdMock();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockedGetRecommendations.mockResolvedValue(PICKS);
});

describeServerActionAuth("getMyRecommendations", {
  requireRole: mockedRequireRole,
  invoke: () => getMyRecommendations(OPTIONS),
  mutations: () => [mockedGetRecommendations],
  denial: { kind: "role", roles: [] },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    expect: (result) => {
      expect(result).toEqual({ ok: true, error: null, data: PICKS });
      // The gate user's id, never one from the client
      expect(mockedGetRecommendations).toHaveBeenCalledWith(7, OPTIONS);
    },
  },
  expectDenied: (result, code) => {
    expect(result).toEqual({ ok: false, error: code, data: null });
  },
});

it.each([
  ["a bad surface", { surface: "home", limit: 3 }],
  ["limit 0", { surface: "recap", limit: 0 }],
  ["limit 25", { surface: "recap", limit: 25 }],
  [
    "a non-integer id",
    { surface: "recap", limit: 3, excludeDropletIds: [1.5] },
  ],
  [
    "51 ids",
    {
      surface: "recap",
      limit: 3,
      excludeDropletIds: Array.from({ length: 51 }, (_, i) => i + 1),
    },
  ],
])("rejects %s without reading", async (_label, options) => {
  mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));

  expect(
    await getMyRecommendations(options as unknown as RecommendationOptions),
  ).toEqual({ ok: false, error: "invalid_options", data: null });
  expect(mockedGetRecommendations).not.toHaveBeenCalled();
});

it("returns an error, not a throw, when the read fails", async () => {
  mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
  mockedGetRecommendations.mockRejectedValue(new Error("boom"));

  expect(await getMyRecommendations(OPTIONS)).toEqual({
    ok: false,
    error: "Couldn't load recommendations.",
    data: null,
  });
});

describe("dismissRecommendation", () => {
  const fetchMock = jest.fn();
  const DISMISSED = { ok: true, error: null, data: null };
  const post = () => {
    const [url, init] = fetchMock.mock.calls[0];
    return { url: String(url), body: JSON.parse(init.body) };
  };

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describeServerActionAuth("dismissRecommendation", {
    requireRole: mockedRequireRole,
    invoke: () => dismissRecommendation(5),
    mutations: () => [fetchMock, jest.mocked(revalidateTag)],
    denial: { kind: "role", roles: [] },
    authorized: {
      as: authFixtures.as({ id: 7 }),
      expect: (result) => {
        expect(result).toEqual(DISMISSED);
        expect(post().url).toMatch(/\/api\/recommendation-dismissals$/);
        // Both documentIds are resolved on the server, the user from the gate
        expect(post().body).toEqual({
          data: { user: "doc7", droplet: "doc5" },
        });
        expect(revalidateTag).toHaveBeenCalledWith("recommendations-7");
      },
    },
    expectDenied: (result, code) => {
      expect(result).toEqual({ ok: false, error: code, data: null });
    },
  });

  describe("when signed in", () => {
    beforeEach(() => {
      mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    });

    it.each([0, -1, 1.5, "doc5"])(
      "rejects %p without a request",
      async (id) => {
        expect(await dismissRecommendation(id as number)).toEqual({
          ok: false,
          error: "invalid_droplet",
          data: null,
        });
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it.each([
      ["droplets", "not_found"],
      ["authorized-users", "Couldn't dismiss that droplet."],
    ])(
      "a missing %s entry answers %s, with no POST",
      async (collection, error) => {
        jest.mocked(resolveDocumentId).mockImplementation(async (c, ref) => {
          if (c === collection) throw new StrapiEntryNotFoundError("x");
          return fakeDocumentId(ref);
        });

        expect(await dismissRecommendation(5)).toEqual({
          ok: false,
          error,
          data: null,
        });
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it("logs only the error name when the request itself fails", async () => {
      fetchMock.mockRejectedValue(new TypeError("x"));

      expect(await dismissRecommendation(5)).toEqual({
        ok: false,
        error: "Couldn't dismiss that droplet.",
        data: null,
      });
      expect(jest.mocked(console.error).mock.calls).toEqual([
        ["dismissRecommendation failed:", "TypeError"],
      ]);
    });

    it("reports a Strapi failure without revalidating, logging only the status", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      expect(await dismissRecommendation(5)).toEqual({
        ok: false,
        error: "Couldn't dismiss that droplet.",
        data: null,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
      expect(jest.mocked(console.error).mock.calls).toEqual([
        ["dismissRecommendation failed:", 500],
      ]);
    });
  });
});
