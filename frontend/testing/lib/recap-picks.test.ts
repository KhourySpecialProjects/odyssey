import { getRecommendations } from "@/lib/recommendations";
import { getRecapPicks } from "@/lib/recommendations/recap";
import { recommendation } from "@/testing/mocks/recommendations";
import type { RecommendationRule } from "@/types";

jest.mock("@/lib/recommendations", () => ({ getRecommendations: jest.fn() }));

const mockedGet = jest.mocked(getRecommendations);
const picksLedBy = (rule: RecommendationRule) => [
  recommendation({ id: 1 }, { rule }),
  recommendation({ id: 2 }),
];

beforeEach(() => jest.clearAllMocks());

describe("getRecapPicks", () => {
  it("asks the engine for Recap's picks without the droplet just finished", async () => {
    mockedGet.mockResolvedValue([]);

    await getRecapPicks(7, 42);

    expect(mockedGet).toHaveBeenCalledWith(7, {
      surface: "recap",
      limit: 8,
      excludeDropletIds: [42],
    });
  });

  it.each(["next-in-voyage", "next-in-playlist"] as const)(
    "puts a %s top pick in the banner",
    async (rule) => {
      const picks = picksLedBy(rule);
      mockedGet.mockResolvedValue(picks);

      expect(await getRecapPicks(7, 42)).toEqual({ picks, next: picks[0] });
    },
  );

  it.each(["postrequisite", "interest", "popular"] as const)(
    "has no banner when the top pick is %s",
    async (rule) => {
      mockedGet.mockResolvedValue(picksLedBy(rule));

      expect((await getRecapPicks(7, 42)).next).toBeNull();
    },
  );
});
