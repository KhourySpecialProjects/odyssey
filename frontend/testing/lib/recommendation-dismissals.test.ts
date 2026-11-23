/** @jest-environment node */
import { fetchAPI } from "@/lib/utils";
import { getDismissedDropletIds } from "@/lib/recommendations/dismissals";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

const fetchApiMock = fetchAPI as jest.Mock;

beforeEach(() => fetchApiMock.mockReset());

describe("getDismissedDropletIds", () => {
  it("reads one student's dismissals under their own tag only", async () => {
    fetchApiMock.mockResolvedValue([]);

    await getDismissedDropletIds(7);

    expect(fetchApiMock).toHaveBeenCalledWith("/recommendation-dismissals", {
      urlParams: expect.objectContaining({
        filters: { user: { id: { $eq: 7 } } },
        populate: { droplet: { fields: ["id"] } },
        pagination: { page: 1, pageSize: 1000 },
      }),
      next: { tags: ["recommendations-7"], revalidate: 900 },
    });
    expect(fetchApiMock.mock.calls[0][1]).not.toHaveProperty("cache");
  });

  it.each([
    [
      "skips rows whose droplet was deleted",
      [{ droplet: { id: 3 } }, { droplet: null }, { droplet: { id: 9 } }],
      [3, 9],
    ],
    ["returns [] for null", null, []],
  ])("%s", async (_name, rows, expected) => {
    fetchApiMock.mockResolvedValue(rows);

    await expect(getDismissedDropletIds(7)).resolves.toEqual(expected);
  });
});
