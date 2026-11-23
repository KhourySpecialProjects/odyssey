import { getAuthorNames } from "@/lib/requests/droplet-authors";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

const mockedFetchAPI = jest.mocked(fetchAPI);

describe("getAuthorNames", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("reads only the authors' names by id", async () => {
    mockedFetchAPI.mockResolvedValue([
      { id: 7, firstName: "Ada", lastName: "Lovelace" },
      { id: 9, firstName: "Alan", lastName: null },
    ] as never);

    const result = await getAuthorNames([7, 9]);

    expect(mockedFetchAPI).toHaveBeenCalledWith("/authorized-users", {
      urlParams: {
        filters: { id: { $in: [7, 9] } },
        fields: ["id", "firstName", "lastName"],
        pagination: { pageSize: 100, page: 1 },
      },
      next: { tags: [CACHE_TAGS.users], revalidate: 900 },
    });
    expect(result).toEqual([
      { id: 7, name: "Ada Lovelace" },
      { id: 9, name: "Alan" },
    ]);
  });

  it("makes no request without valid ids", async () => {
    expect(await getAuthorNames([])).toEqual([]);
    expect(await getAuthorNames([0, -1, 1.5])).toEqual([]);
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("returns an empty list when the lookup fails", async () => {
    mockedFetchAPI.mockRejectedValue(new Error("boom"));

    expect(await getAuthorNames([7])).toEqual([]);
  });
});
