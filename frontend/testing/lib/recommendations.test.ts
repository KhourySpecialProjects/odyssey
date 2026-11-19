/** @jest-environment node */
import { getRecommendations } from "@/lib/recommendations";
import { getRankInput } from "@/lib/recommendations/candidates";
import { candidateDroplet, studentState } from "../mocks/recommendations";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/recommendations/candidates", () => ({
  getRankInput: jest.fn(),
}));

const rankInput = jest.mocked(getRankInput);
const withDroplets = (n: number) =>
  rankInput.mockResolvedValue({
    candidates: Array.from({ length: n }, (_, i) =>
      candidateDroplet({ id: i + 1 }),
    ),
    student: studentState(),
    excludeIds: [],
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  withDroplets(3);
});

it("passes the user and exclusions through and caps at limit", async () => {
  const result = await getRecommendations(7, {
    surface: "recap",
    limit: 2,
    excludeDropletIds: [9],
  });

  expect(rankInput).toHaveBeenCalledWith(7, [9]);
  expect(result.map((p) => p.droplet.id)).toEqual([1, 2]);
});

it("defaults exclusions to an empty list and caps limit at 24", async () => {
  withDroplets(30);

  const result = await getRecommendations(7, { surface: "recap", limit: 100 });

  expect(rankInput).toHaveBeenCalledWith(7, []);
  expect(result).toHaveLength(24);
});

it.each([0, -3])(
  "returns [] without a read when limit is %s",
  async (limit) => {
    expect(await getRecommendations(7, { surface: "recap", limit })).toEqual(
      [],
    );
    expect(rankInput).not.toHaveBeenCalled();
  },
);

it("returns [] when a required read fails, logging only the error name", async () => {
  rankInput.mockRejectedValue(new TypeError("http://strapi/users/7"));

  expect(await getRecommendations(7, { surface: "recap", limit: 3 })).toEqual(
    [],
  );
  expect(console.error).toHaveBeenCalledWith(
    "getRecommendations failed:",
    "TypeError",
  );
});
