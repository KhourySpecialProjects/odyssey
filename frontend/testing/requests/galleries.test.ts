import { getGalleryBySlug } from "@/lib/requests/galleries";
import { getMockedFetchAPI } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

const mockFetchAPI = getMockedFetchAPI();

describe("getGalleryBySlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("filters by slug and reads from the data cache (time-based only)", async () => {
    const gallery = { id: 1, slug: "features", title: "Features", items: [] };
    mockFetchAPI.mockResolvedValueOnce([gallery]);

    const result = await getGalleryBySlug("features");

    expect(result).toEqual(gallery);
    expect(mockFetchAPI).toHaveBeenCalledTimes(1);
    const [path, config] = mockFetchAPI.mock.calls[0];
    expect(path).toBe("/galleries");
    expect(config.urlParams).toEqual(
      expect.objectContaining({ filters: { slug: { $eq: "features" } } }),
    );
    expect(config.next).toEqual({ revalidate: 3600 });
    // `cache` and `next` are mutually exclusive in Next 15.
    expect(config).not.toHaveProperty("cache");
  });

  it("returns undefined when no gallery matches", async () => {
    mockFetchAPI.mockResolvedValueOnce([]);

    await expect(getGalleryBySlug("missing")).resolves.toBeUndefined();
  });
});
