import { getMyRecommendations } from "@/lib/requests/recommendations";
import { requireRole } from "@/lib/auth/require-role";
import { getRecommendations } from "@/lib/recommendations";
import type { Recommendation, RecommendationOptions } from "@/types";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
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
