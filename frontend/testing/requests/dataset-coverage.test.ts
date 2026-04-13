/**
 * Coverage tests for lib/requests/dataset.ts.
 * Targets previously-uncovered paths: createDataset and deleteDataset,
 * including Zod validation errors, HTTP error responses, and revalidateTag calls.
 */

import {
  getDatasetsByDropletId,
  createDataset,
  deleteDataset,
} from "@/lib/requests/dataset";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getMockedFetchAPI,
  mockGlobalFetch,
  makeFetchResponse,
  assertOk,
} from "@/lib/testing/mock-helpers";
import { revalidateTag } from "next/cache";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

const mockedRevalidateTag = jest.mocked(revalidateTag);

describe("dataset requests", () => {
  let mockedFetchAPI: ReturnType<typeof getMockedFetchAPI>;
  let mockFetch: ReturnType<typeof mockGlobalFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchAPI = getMockedFetchAPI();
    mockFetch = mockGlobalFetch();
  });

  // ── getDatasetsByDropletId ──────────────────────────────────────────────────

  describe("getDatasetsByDropletId", () => {
    it("returns datasets filtered by droplet id", async () => {
      const mockDatasets = [
        {
          id: 1,
          name: "data.csv",
          fileUrl: "https://cdn.example.com/data.csv",
          format: "csv",
          fileSize: 1024,
        },
      ];
      mockedFetchAPI.mockResolvedValueOnce(mockDatasets);

      const result = await getDatasetsByDropletId(42);

      expect(mockedFetchAPI).toHaveBeenCalledWith("/datasets", {
        urlParams: expect.objectContaining({
          filters: { droplet: { id: { $eq: 42 } } },
          sort: ["createdAt:asc"],
        }),
        next: { tags: [CACHE_TAGS.datasets], revalidate: 900 },
      });
      expect(result).toEqual(mockDatasets);
    });

    it("returns empty array when no datasets exist", async () => {
      mockedFetchAPI.mockResolvedValueOnce([]);

      const result = await getDatasetsByDropletId(99);

      expect(result).toEqual([]);
    });

    it("propagates fetchAPI errors", async () => {
      mockedFetchAPI.mockRejectedValueOnce(new Error("Network failure"));

      await expect(getDatasetsByDropletId(1)).rejects.toThrow(
        "Network failure",
      );
    });
  });

  // ── createDataset ───────────────────────────────────────────────────────────

  describe("createDataset", () => {
    const validInput = {
      name: "sales.csv",
      fileUrl: "https://cdn.example.com/sales.csv",
      format: "csv" as const,
      fileSize: 2048,
      droplet: 10,
    };

    it("creates a dataset and returns ok result with flattened data", async () => {
      const createdDataset = {
        id: 7,
        name: "sales.csv",
        fileUrl: "https://cdn.example.com/sales.csv",
        format: "csv",
        fileSize: 2048,
      };
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ data: createdDataset }),
      );

      const result = await createDataset(validInput);

      assertOk(result);
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(createdDataset);
    });

    it("calls revalidateTag for datasets and droplets on success", async () => {
      const createdDataset = {
        id: 7,
        name: "sales.csv",
        fileUrl: "https://cdn.example.com/sales.csv",
        format: "csv",
        fileSize: 2048,
      };
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ data: createdDataset }),
      );

      await createDataset(validInput);

      expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.datasets);
      expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.droplets);
    });

    it("returns ok:false with error message when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ error: { message: "Unauthorized" } }, 401),
      );

      const result = await createDataset(validInput);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(result.data).toBeNull();
      expect(mockedRevalidateTag).not.toHaveBeenCalled();
    });

    it("returns ok:false with fallback message when response error has no message", async () => {
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ error: {} }, 500));

      const result = await createDataset(validInput);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Failed to create dataset");
      expect(result.data).toBeNull();
    });

    it("returns ok:false when responseData.error is set even if response.ok is true", async () => {
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ error: { message: "Duplicate entry" } }, 200),
      );

      const result = await createDataset(validInput);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Duplicate entry");
    });

    it("returns ok:false with Zod validation error for invalid format", async () => {
      const result = await createDataset({
        name: "data.txt",
        fileUrl: "https://cdn.example.com/data.txt",
        format: "txt" as "csv",
        fileSize: 100,
        droplet: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns ok:false with Zod validation error for empty name", async () => {
      const result = await createDataset({
        name: "",
        fileUrl: "https://cdn.example.com/data.csv",
        format: "csv",
        fileSize: 100,
        droplet: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });

    it("returns ok:false with Zod validation error for invalid fileUrl", async () => {
      const result = await createDataset({
        name: "data.csv",
        fileUrl: "not-a-url",
        format: "csv",
        fileSize: 100,
        droplet: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("fileUrl must be");
      expect(result.data).toBeNull();
    });

    it("returns ok:false with Zod validation error for negative droplet id", async () => {
      const result = await createDataset({
        name: "data.csv",
        fileUrl: "https://cdn.example.com/data.csv",
        format: "csv",
        fileSize: 100,
        droplet: -1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("returns ok:false on unexpected network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await createDataset(validInput);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Database Error: Failed to create dataset.");
      expect(result.data).toBeNull();
    });

    it("accepts /uploads/ path as valid fileUrl", async () => {
      const createdDataset = {
        id: 8,
        name: "data.csv",
        fileUrl: "/uploads/data.csv",
        format: "csv",
        fileSize: 512,
      };
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ data: createdDataset }),
      );

      const result = await createDataset({
        ...validInput,
        fileUrl: "/uploads/data.csv",
      });

      assertOk(result);
      expect(result.ok).toBe(true);
    });
  });

  // ── deleteDataset ───────────────────────────────────────────────────────────

  describe("deleteDataset", () => {
    it("deletes a dataset and returns ok:true", async () => {
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, 200));

      const result = await deleteDataset(5);

      expect(result.ok).toBe(true);
      expect(result.error).toBeNull();
    });

    it("calls revalidateTag for datasets and droplets on success", async () => {
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, 200));

      await deleteDataset(5);

      expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.datasets);
      expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.droplets);
    });

    it("returns ok:false when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce(
        makeFetchResponse({ message: "Not found" }, 404),
      );

      const result = await deleteDataset(999);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Failed to delete dataset.");
      expect(mockedRevalidateTag).not.toHaveBeenCalled();
    });

    it("returns ok:false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await deleteDataset(5);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Database Error: Failed to delete dataset.");
    });

    it("uses the correct dataset ID in the DELETE URL", async () => {
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, 200));

      await deleteDataset(42);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/datasets/42"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
