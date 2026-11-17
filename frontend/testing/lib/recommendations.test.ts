/** @jest-environment node */
import { getRecommendations } from "@/lib/recommendations";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import { getDroplets } from "@/lib/requests/droplet";
import type { RecommendedDroplet } from "@/types";

jest.mock("@/lib/requests/droplet", () => ({ getDroplets: jest.fn() }));

const mockedGetDroplets = jest.mocked(getDroplets);

const droplet = (id: number): RecommendedDroplet =>
  ({
    id,
    documentId: `doc-${id}`,
    name: `Droplet ${id}`,
    slug: `d-${id}`,
  }) as RecommendedDroplet;

const callArgs = () => mockedGetDroplets.mock.calls[0][0]!;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockedGetDroplets.mockResolvedValue([
    droplet(1),
    droplet(2),
    droplet(3),
  ] as never);
});

it("wraps droplets as popular picks, in order, capped at limit", async () => {
  const result = await getRecommendations(7, { surface: "recap", limit: 2 });

  expect(result).toEqual([
    { droplet: droplet(1), reason: "Top rated on Odyssey", rule: "popular" },
    { droplet: droplet(2), reason: "Top rated on Odyssey", rule: "popular" },
  ]);
});

it("skips droplets that have no documentId", async () => {
  mockedGetDroplets.mockResolvedValue([
    { id: 9, name: "x", slug: "x" },
  ] as never);

  expect(await getRecommendations(7, { surface: "recap", limit: 2 })).toEqual(
    [],
  );
});

it("asks for live, rated droplets, best first", async () => {
  await getRecommendations(7, { surface: "activity", limit: 5 });

  expect(callArgs()).toMatchObject({
    filters: {
      $and: [
        { status: { $eq: "published" } },
        { isHidden: false },
        { lessons: { id: { $notNull: true } } },
        { averageRating: { $notNull: true } },
      ],
    },
    sort: ["averageRating:desc", "name:asc"],
    pagination: { page: 1, pageSize: 5 },
    fields: [
      "name",
      "slug",
      "type",
      "focusArea",
      "difficulty",
      "description",
      "averageRating",
    ],
    populate: {
      lessons: { fields: ["id"] },
      tags: { fields: ["name", "slug"] },
      authorized_users: USER_POPULATES.authorName,
    },
  });
});

it.each([
  ["ids given", [3, 4], true],
  ["empty", [], false],
  ["missing", undefined, false],
])("excludeDropletIds %s", async (_label, ids, expected) => {
  await getRecommendations(7, {
    surface: "recap",
    limit: 5,
    excludeDropletIds: ids,
  });

  const clauses = (callArgs().filters as { $and: unknown[] }).$and;
  expect(clauses.some((c) => JSON.stringify(c).includes("$notIn"))).toBe(
    expected,
  );
  if (expected) expect(clauses).toContainEqual({ id: { $notIn: [3, 4] } });
});

it("returns [] without a request when limit is 0 or less", async () => {
  expect(await getRecommendations(7, { surface: "recap", limit: 0 })).toEqual(
    [],
  );
  expect(await getRecommendations(7, { surface: "recap", limit: -3 })).toEqual(
    [],
  );
  expect(mockedGetDroplets).not.toHaveBeenCalled();
});

it("caps the page size at 24", async () => {
  await getRecommendations(7, { surface: "recap", limit: 100 });

  expect(callArgs().pagination).toEqual({ page: 1, pageSize: 24 });
});

it("returns [] when Strapi fails, logging only the error", async () => {
  const error = new Error("Strapi is down");
  mockedGetDroplets.mockRejectedValue(error);

  expect(await getRecommendations(7, { surface: "recap", limit: 3 })).toEqual(
    [],
  );
  expect(console.error).toHaveBeenCalledWith(
    "getRecommendations failed:",
    error,
  );
});
