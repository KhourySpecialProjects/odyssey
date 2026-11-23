/** @jest-environment node */
import { getCoCompletion } from "@/lib/recommendations/co-completion";
import { fetchAPI } from "@/lib/utils";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));

const api = fetchAPI as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it("reads one shared URL with the global tag and no cache or params", async () => {
  api.mockResolvedValue({ data: { pairs: [] } });

  await getCoCompletion();

  expect(api).toHaveBeenCalledWith("/co-completions", {
    next: { tags: ["co-completion"], revalidate: 3600 },
    flattenResponse: false,
  });
});

it.each([
  [
    "groups pairs by source",
    [
      { source: 1, target: 2, count: 3 },
      { source: 1, target: 4, count: 5 },
      { source: 2, target: 1, count: 3 },
    ],
    [
      [
        1,
        [
          { id: 2, count: 3 },
          { id: 4, count: 5 },
        ],
      ],
      [2, [{ id: 1, count: 3 }]],
    ],
  ],
  [
    "skips malformed entries",
    [
      { source: 1, target: "2", count: 3 },
      { source: 1, target: 2 },
      null,
      { source: 1, target: 2, count: 3 },
    ],
    [[1, [{ id: 2, count: 3 }]]],
  ],
  ["gives an empty map for missing pairs", undefined, []],
])("%s", async (_name, pairs, expected) => {
  api.mockResolvedValue({ data: pairs === undefined ? {} : { pairs } });

  expect([...(await getCoCompletion())]).toEqual(expected);
});

it("throws when the read fails", async () => {
  api.mockRejectedValue(new Error("x"));
  await expect(getCoCompletion()).rejects.toThrow();
});
