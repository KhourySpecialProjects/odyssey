jest.unmock("@/lib/strapi-document-id");

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
}));

import { fetchAPI } from "@/lib/utils";
import {
  InvalidEntryRefError,
  StrapiEntryNotFoundError,
  clearDocumentIdCache,
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
} from "@/lib/strapi-document-id";

const mockFetchAPI = fetchAPI as jest.Mock;

beforeEach(() => {
  clearDocumentIdCache();
  mockFetchAPI.mockReset();
  process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://strapi.test";
});

describe("resolveDocumentId", () => {
  it("returns a documentId string without fetching", async () => {
    await expect(resolveDocumentId("droplets", "abc123xyz")).resolves.toBe(
      "abc123xyz",
    );
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("returns the documentId of an object without fetching", async () => {
    await expect(
      resolveDocumentId("droplets", { id: 5, documentId: "doc5" }),
    ).resolves.toBe("doc5");
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("looks up a numeric id with the exact query", async () => {
    mockFetchAPI.mockResolvedValue([{ documentId: "doc5" }]);

    await expect(resolveDocumentId("droplets", 5)).resolves.toBe("doc5");

    expect(mockFetchAPI).toHaveBeenCalledTimes(1);
    expect(mockFetchAPI).toHaveBeenCalledWith("/droplets", {
      urlParams: {
        filters: { id: { $eq: 5 } },
        fields: ["documentId"],
        pagination: { pageSize: 1 },
      },
      cache: "no-store",
    });
  });

  it("looks up an all-digit string", async () => {
    mockFetchAPI.mockResolvedValue([{ documentId: "doc7" }]);

    await expect(resolveDocumentId("lessons", "7")).resolves.toBe("doc7");

    expect(mockFetchAPI).toHaveBeenCalledWith(
      "/lessons",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: { id: { $eq: 7 } },
        }),
      }),
    );
  });

  it("looks up an object that only has an id", async () => {
    mockFetchAPI.mockResolvedValue([{ documentId: "doc9" }]);

    await expect(resolveDocumentId("tags", { id: 9 })).resolves.toBe("doc9");
    expect(mockFetchAPI).toHaveBeenCalledTimes(1);
  });

  it("serves a repeated lookup from the cache", async () => {
    mockFetchAPI.mockResolvedValue([{ documentId: "doc5" }]);

    await resolveDocumentId("droplets", 5);
    await resolveDocumentId("droplets", "5");

    expect(mockFetchAPI).toHaveBeenCalledTimes(1);
  });

  it("keys the cache by collection", async () => {
    mockFetchAPI
      .mockResolvedValueOnce([{ documentId: "dropletDoc" }])
      .mockResolvedValueOnce([{ documentId: "lessonDoc" }]);

    await expect(resolveDocumentId("droplets", 5)).resolves.toBe("dropletDoc");
    await expect(resolveDocumentId("lessons", 5)).resolves.toBe("lessonDoc");
  });

  it("shares one request between concurrent lookups", async () => {
    mockFetchAPI.mockResolvedValue([{ documentId: "doc5" }]);

    const results = await Promise.all([
      resolveDocumentId("droplets", 5),
      resolveDocumentId("droplets", 5),
      resolveDocumentId("droplets", 5),
    ]);

    expect(results).toEqual(["doc5", "doc5", "doc5"]);
    expect(mockFetchAPI).toHaveBeenCalledTimes(1);
  });

  it("throws StrapiEntryNotFoundError when nothing matches, and retries next time", async () => {
    mockFetchAPI.mockResolvedValueOnce([]);

    const error = await resolveDocumentId("droplets", 404).catch((e) => e);
    expect(error).toBeInstanceOf(StrapiEntryNotFoundError);
    expect(error.message).toContain("droplets");
    expect(error.message).toContain("404");

    mockFetchAPI.mockResolvedValueOnce([{ documentId: "doc404" }]);
    await expect(resolveDocumentId("droplets", 404)).resolves.toBe("doc404");
    expect(mockFetchAPI).toHaveBeenCalledTimes(2);
  });

  it("treats a null response as not found", async () => {
    mockFetchAPI.mockResolvedValueOnce(null);
    await expect(resolveDocumentId("droplets", 1)).rejects.toBeInstanceOf(
      StrapiEntryNotFoundError,
    );
  });

  it("does not cache request failures", async () => {
    mockFetchAPI.mockRejectedValueOnce(new Error("boom"));
    await expect(resolveDocumentId("droplets", 5)).rejects.toThrow("boom");

    mockFetchAPI.mockResolvedValueOnce([{ documentId: "doc5" }]);
    await expect(resolveDocumentId("droplets", 5)).resolves.toBe("doc5");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["NaN", NaN],
    ["an empty string", ""],
    ["an object with no id", {}],
    ["an object with a null id", { id: null }],
  ])("throws InvalidEntryRefError for %s", async (_label, ref) => {
    const error = await resolveDocumentId("droplets", ref as any).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(InvalidEntryRefError);
    expect(error).toBeInstanceOf(StrapiEntryNotFoundError);
    expect(error.name).toBe("InvalidEntryRefError");
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it.each([
    ["a parent-directory string", "../x"],
    ["a slash string", "a/b"],
    ["a query string", "a?b=1"],
    ["a documentId object", { documentId: "../x" }],
    ["a documentId object with a slash", { id: 5, documentId: "a/b" }],
  ])("rejects %s as a malformed documentId", async (_label, ref) => {
    const error = await resolveDocumentId("droplets", ref as any).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(InvalidEntryRefError);
    expect(error).toBeInstanceOf(StrapiEntryNotFoundError);
    expect(mockFetchAPI).not.toHaveBeenCalled();
    await expect(strapiEntryUrl("droplets", ref as any)).rejects.toBeInstanceOf(
      InvalidEntryRefError,
    );
  });

  it("caps the cache and drops the oldest entry", async () => {
    mockFetchAPI.mockImplementation(async (_path: string, config: any) => [
      { documentId: `doc${config.urlParams.filters.id.$eq}` },
    ]);

    for (let i = 1; i <= 5001; i++) {
      await resolveDocumentId("droplets", i);
    }
    expect(mockFetchAPI).toHaveBeenCalledTimes(5001);

    // Newest is still cached, oldest was evicted.
    await resolveDocumentId("droplets", 5001);
    expect(mockFetchAPI).toHaveBeenCalledTimes(5001);
    await resolveDocumentId("droplets", 1);
    expect(mockFetchAPI).toHaveBeenCalledTimes(5002);
  });
});

describe("resolveDocumentIds", () => {
  it("returns an empty array for no refs without fetching", async () => {
    await expect(resolveDocumentIds("tags", [])).resolves.toEqual([]);
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("handles mixed refs in input order with one batched lookup", async () => {
    mockFetchAPI.mockResolvedValue([
      { id: 2, documentId: "doc2" },
      { id: 1, documentId: "doc1" },
    ]);

    const result = await resolveDocumentIds("tags", [
      1,
      "stringDoc",
      { id: 9, documentId: "doc9" },
      2,
    ]);

    expect(result).toEqual(["doc1", "stringDoc", "doc9", "doc2"]);
    expect(mockFetchAPI).toHaveBeenCalledTimes(1);
    expect(mockFetchAPI).toHaveBeenCalledWith("/tags", {
      urlParams: {
        filters: { id: { $in: [1, 2] } },
        fields: ["documentId", "id"],
        pagination: { pageSize: 100 },
      },
      cache: "no-store",
    });
  });

  it("dedupes ids before looking them up", async () => {
    mockFetchAPI.mockResolvedValue([{ id: 1, documentId: "doc1" }]);

    const result = await resolveDocumentIds("tags", [1, "1", { id: 1 }, 1]);

    expect(result).toEqual(["doc1", "doc1", "doc1", "doc1"]);
    expect(mockFetchAPI).toHaveBeenCalledTimes(1);
    expect(mockFetchAPI.mock.calls[0][1].urlParams.filters).toEqual({
      id: { $in: [1] },
    });
  });

  it("does not fetch when every ref already has a documentId", async () => {
    await expect(
      resolveDocumentIds("tags", ["a", { documentId: "b" }]),
    ).resolves.toEqual(["a", "b"]);
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("uses the cache for ids it has already resolved", async () => {
    mockFetchAPI.mockResolvedValueOnce([{ documentId: "doc1" }]);
    await resolveDocumentId("tags", 1);

    mockFetchAPI.mockResolvedValueOnce([{ id: 2, documentId: "doc2" }]);
    const result = await resolveDocumentIds("tags", [1, 2]);

    expect(result).toEqual(["doc1", "doc2"]);
    expect(mockFetchAPI.mock.calls[1][1].urlParams.filters).toEqual({
      id: { $in: [2] },
    });
  });

  it("chunks lookups at 100 ids", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);
    mockFetchAPI.mockImplementation(async (_path: string, config: any) =>
      (config.urlParams.filters.id.$in as number[]).map((id) => ({
        id,
        documentId: `doc${id}`,
      })),
    );

    const result = await resolveDocumentIds("tags", ids);

    expect(mockFetchAPI).toHaveBeenCalledTimes(3);
    expect(
      mockFetchAPI.mock.calls.map((c) => c[1].urlParams.filters.id.$in.length),
    ).toEqual([100, 100, 50]);
    expect(result).toEqual(ids.map((id) => `doc${id}`));
  });

  it("throws an error naming the missing id", async () => {
    mockFetchAPI.mockResolvedValue([{ id: 1, documentId: "doc1" }]);

    const error = await resolveDocumentIds("tags", [1, 42]).catch((e) => e);

    expect(error).toBeInstanceOf(StrapiEntryNotFoundError);
    expect(error.message).toContain("42");
    expect(error.message).not.toContain("doc1");
  });

  it("names every missing id", async () => {
    mockFetchAPI.mockResolvedValue([]);

    const error = await resolveDocumentIds("tags", [41, 42]).catch((e) => e);

    expect(error.message).toContain("41");
    expect(error.message).toContain("42");
  });

  it("rejects a malformed documentId in a batch", async () => {
    await expect(
      resolveDocumentIds("tags", ["ok1", "../x"]),
    ).rejects.toBeInstanceOf(InvalidEntryRefError);
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("returns every result even if concurrent inserts evict cache entries mid-call", async () => {
    // Fill the cache to capacity, then let a mid-call insert burst evict the
    // entries this call just cached.
    mockFetchAPI.mockImplementation(async (_path: string, config: any) => [
      { documentId: `doc${config.urlParams.filters.id.$eq}` },
    ]);
    for (let i = 1; i <= 5000; i++) {
      await resolveDocumentId("droplets", i);
    }
    mockFetchAPI.mockReset();

    let calls = 0;
    mockFetchAPI.mockImplementation(async (_path: string, config: any) => {
      calls++;
      if (calls === 1) {
        // Cached ids 1 and 2 are read at the start of the call. Evict them
        // (and everything else old) while the batch is in flight.
        mockFetchAPI.mockImplementation(async (_p: string, c: any) => [
          { documentId: `doc${c.urlParams.filters.id.$eq}` },
        ]);
        for (let i = 6001; i <= 11001; i++) {
          await resolveDocumentId("droplets", i);
        }
      }
      return (config.urlParams.filters.id.$in as number[]).map((id) => ({
        id,
        documentId: `doc${id}`,
      }));
    });

    const result = await resolveDocumentIds("droplets", [1, 2, 20000]);

    expect(result).toEqual(["doc1", "doc2", "doc20000"]);
  });

  it("throws InvalidEntryRefError (a not-found error) for a bad ref", async () => {
    const error = await resolveDocumentIds("tags", [1, null as any]).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(InvalidEntryRefError);
    expect(error).toBeInstanceOf(StrapiEntryNotFoundError);
  });
});

describe("strapiEntryUrl", () => {
  it("builds the URL from a documentId", async () => {
    await expect(strapiEntryUrl("droplets", "abc")).resolves.toBe(
      "http://strapi.test/api/droplets/abc",
    );
  });

  it("resolves a numeric id", async () => {
    mockFetchAPI.mockResolvedValue([{ documentId: "doc5" }]);

    await expect(strapiEntryUrl("droplets", 5)).resolves.toBe(
      "http://strapi.test/api/droplets/doc5",
    );
  });

  it("appends a non-empty query", async () => {
    await expect(
      strapiEntryUrl(
        "authorized-users",
        { id: 1, documentId: "u1" },
        "populate=roles",
      ),
    ).resolves.toBe(
      "http://strapi.test/api/authorized-users/u1?populate=roles",
    );
  });

  it("omits the query separator for an empty query", async () => {
    await expect(strapiEntryUrl("droplets", "abc", "")).resolves.toBe(
      "http://strapi.test/api/droplets/abc",
    );
  });
});
