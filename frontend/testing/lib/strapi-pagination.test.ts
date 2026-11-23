import fs from "fs";
import path from "path";
import { fetchAllPages, STRAPI_MAX_PAGE_SIZE } from "@/lib/strapi-pagination";
import { getMockedFetchAPI } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

const rows = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: from + i }));

describe("fetchAllPages", () => {
  const fetchAPI = getMockedFetchAPI();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads pages until a short one and keeps the rows in order", async () => {
    fetchAPI
      .mockResolvedValueOnce(rows(1, 2))
      .mockResolvedValueOnce(rows(3, 2))
      .mockResolvedValueOnce(rows(5, 1));

    const result = await fetchAllPages<{ id: number }>(
      "/due-dates",
      {
        urlParams: { filters: { id: { $gt: 0 } }, pagination: { pageSize: 9 } },
        next: { tags: ["due-dates"], revalidate: 900 },
      },
      2,
    );

    expect(result.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
    expect(fetchAPI).toHaveBeenCalledTimes(3);
    expect(fetchAPI).toHaveBeenNthCalledWith(3, "/due-dates", {
      urlParams: {
        filters: { id: { $gt: 0 } },
        pagination: { page: 3, pageSize: 2 },
      },
      next: { tags: ["due-dates"], revalidate: 900 },
    });
  });

  it("asks for Strapi's largest page by default", async () => {
    fetchAPI.mockResolvedValueOnce([]);

    await fetchAllPages("/datasets", { cache: "no-store" });

    expect(fetchAPI).toHaveBeenCalledWith("/datasets", {
      cache: "no-store",
      urlParams: { pagination: { page: 1, pageSize: STRAPI_MAX_PAGE_SIZE } },
    });
  });

  it("stops on an empty or null page after a full one", async () => {
    fetchAPI.mockResolvedValueOnce(rows(1, 2)).mockResolvedValueOnce(null);

    const result = await fetchAllPages("/x", {}, 2);

    expect(result).toHaveLength(2);
    expect(fetchAPI).toHaveBeenCalledTimes(2);
  });

  it("gives up after 100 pages and says so", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    fetchAPI.mockImplementation(async () => rows(1, 1));

    const result = await fetchAllPages("/x", {}, 1);

    expect(result).toHaveLength(100);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("stopped after 100 pages"),
    );
    error.mockRestore();
  });

  it("matches the backend's REST maxLimit", () => {
    const config = fs.readFileSync(
      path.join(__dirname, "../../../backend/config/api.ts"),
      "utf8",
    );
    const maxLimit = Number(config.match(/maxLimit:\s*(\d+)/)?.[1]);
    expect(maxLimit).toBe(STRAPI_MAX_PAGE_SIZE);
  });
});
