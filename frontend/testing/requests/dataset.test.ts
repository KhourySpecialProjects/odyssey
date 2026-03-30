import { getDatasetsByDropletId } from "@/lib/requests/dataset";
import { CACHE_TAGS } from "@/lib/cache-tags";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data) => data),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

describe("getDatasetsByDropletId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches datasets filtered by droplet id", async () => {
    const { fetchAPI } = require("@/lib/utils");
    const mockDatasets = [
      {
        id: 1,
        name: "data.csv",
        format: "csv",
        fileUrl: "https://cdn.example.com/data.csv",
        fileSize: 1024,
        rowCount: 100,
        columnCount: 5,
        columnNames: ["a", "b", "c", "d", "e"],
        columnTypes: ["string", "number", "number", "number", "number"],
      },
    ];
    (fetchAPI as jest.Mock).mockResolvedValue(mockDatasets);

    const result = await getDatasetsByDropletId(42);

    expect(fetchAPI).toHaveBeenCalledWith("/datasets", {
      urlParams: expect.objectContaining({
        filters: {
          droplet: {
            id: { $eq: 42 },
          },
        },
      }),
      next: expect.objectContaining({
        tags: [CACHE_TAGS.datasets],
      }),
    });
    expect(result).toEqual(mockDatasets);
  });

  it("returns empty array when no datasets exist for droplet", async () => {
    const { fetchAPI } = require("@/lib/utils");
    (fetchAPI as jest.Mock).mockResolvedValue([]);

    const result = await getDatasetsByDropletId(99);

    expect(result).toEqual([]);
  });
});
