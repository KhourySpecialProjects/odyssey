import {
  getDropletAccessFresh,
  getListedDropletIds,
} from "@/lib/requests/droplet-access";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

const mockedFetchAPI = jest.mocked(fetchAPI);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getDropletAccessFresh", () => {
  it("reads visibility and authors with no-store", async () => {
    const row = {
      id: 5,
      isHidden: true,
      status: "published",
      authorized_users: [{ id: 1 }],
    };
    mockedFetchAPI.mockResolvedValue([row]);

    const result = await getDropletAccessFresh(5);

    expect(mockedFetchAPI).toHaveBeenCalledWith("/droplets", {
      urlParams: {
        filters: { id: { $eq: 5 } },
        fields: ["id", "isHidden", "status"],
        populate: { authorized_users: { fields: ["id"] } },
        pagination: { page: 1, pageSize: 1 },
      },
      cache: "no-store",
    });
    expect(result).toEqual(row);
  });

  it("returns null when the droplet does not exist", async () => {
    mockedFetchAPI.mockResolvedValue([]);
    expect(await getDropletAccessFresh(404)).toBeNull();
  });
});

describe("getListedDropletIds", () => {
  it("returns [] without fetching for empty input", async () => {
    expect(await getListedDropletIds([])).toEqual([]);
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("queries listed droplets among the ids with no-store", async () => {
    mockedFetchAPI.mockResolvedValue([{ id: 1 }, { id: 3 }]);

    const result = await getListedDropletIds([1, 2, 3]);

    expect(mockedFetchAPI).toHaveBeenCalledWith("/droplets", {
      urlParams: {
        filters: {
          id: { $in: [1, 2, 3] },
          isHidden: { $eq: false },
          status: { $eq: "published" },
        },
        fields: ["id"],
        pagination: { page: 1, pageSize: 3 },
      },
      cache: "no-store",
    });
    expect(result).toEqual([1, 3]);
  });

  it("caps the page size at the REST max limit", async () => {
    mockedFetchAPI.mockResolvedValue([]);
    const ids = Array.from({ length: 1500 }, (_, i) => i + 1);

    await getListedDropletIds(ids);

    const params = mockedFetchAPI.mock.calls[0][1] as {
      urlParams: { pagination: { pageSize: number } };
    };
    expect(params.urlParams.pagination.pageSize).toBe(1000);
  });
});
