const {
  getHighlights,
  getHighlightsByDroplet,
} = require("../../lib/requests/highlights");
const { flattenAttributes } = require("../../lib/utils");
const { fetchAPI } = require("../../lib/utils");

jest.mock("../../lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data) => {
    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        ...item.attributes,
      }));
    }
    return data;
  }),
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

describe("Highlights Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getHighlights", () => {
    it("should fetch highlights for an authorized user with specific text", async () => {
      const mockHighlights = [
        {
          id: 1,
          color: "yellow",
          text: "This is an important concept",
          yLevel: 150,
          lesson: { id: 101 },
        },
        {
          id: 2,
          color: "green",
          text: "This is an important concept",
          yLevel: 300,
          lesson: { id: 102 },
        },
      ];

      fetchAPI.mockResolvedValueOnce(mockHighlights);

      const authorizedUserId = 5;
      const text = "This is an important concept";
      const result = await getHighlights(authorizedUserId, text);

      expect(result).toEqual(mockHighlights);

      expect(fetchAPI).toHaveBeenCalledWith("/highlights", {
        urlParams: expect.objectContaining({
          filters: {
            authorized_user: {
              id: { $eq: authorizedUserId },
            },
            text: { $eq: text },
          },
          populate: {
            lesson: {
              fields: ["id"],
            },
          },
          fields: ["id", "color", "text", "yLevel"],
          pagination: { pageSize: 250, page: 1 },
        }),
        next: { tags: ["highlights"] },
      });
    });

    it("should use custom sort and pagination parameters when provided", async () => {
      const mockHighlights = [
        { id: 1, color: "yellow", text: "Custom params test" },
      ];

      fetchAPI.mockResolvedValueOnce(mockHighlights);

      const authorizedUserId = 5;
      const text = "Custom params test";
      const customParams = {
        sort: ["id:desc"],
        pagination: { pageSize: 50, page: 2 },
        fields: ["id", "color"],
      };

      await getHighlights(authorizedUserId, text, customParams);

      expect(fetchAPI).toHaveBeenCalledWith("/highlights", {
        urlParams: expect.objectContaining({
          sort: ["id:desc"],
          pagination: { pageSize: 50, page: 2 },
          fields: ["id", "color"],
        }),
        next: { tags: ["highlights"] },
      });
    });

    it("should return empty array when no highlights found", async () => {
      fetchAPI.mockResolvedValueOnce([]);

      const result = await getHighlights(5, "Non-existent text");

      expect(result).toEqual([]);
    });

    it("should handle errors from fetchAPI", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch highlights"));

      await expect(getHighlights(5, "Error test")).rejects.toThrow(
        "Failed to fetch highlights",
      );
    });
  });

  describe("getHighlightsByDroplet", () => {
    it("should fetch highlights for an authorized user and droplet", async () => {
      const mockHighlights = [
        {
          text: "Important concept in lesson 1",
          color: "yellow",
          yLevel: 100,
          lesson: {
            id: 201,
            name: "Introduction",
            slug: "intro",
            droplet_lessons: [{ id: 301 }],
          },
        },
        {
          text: "Another highlight in lesson 2",
          color: "blue",
          yLevel: 200,
          lesson: {
            id: 202,
            name: "Advanced Topics",
            slug: "advanced",
            droplet_lessons: [{ id: 302 }],
          },
        },
      ];

      fetchAPI.mockResolvedValueOnce(mockHighlights);

      const authorizedUserId = 5;
      const dropletId = 10;
      const result = await getHighlightsByDroplet(authorizedUserId, dropletId);

      expect(result).toEqual(mockHighlights);

      expect(fetchAPI).toHaveBeenCalledWith("/highlights", {
        urlParams: expect.objectContaining({
          sort: ["yLevel:asc"],
          filters: {
            lesson: {
              droplets: {
                id: { $eq: dropletId },
              },
            },
            authorized_user: {
              id: { $eq: authorizedUserId },
            },
          },
          populate: {
            lesson: {
              fields: ["id", "name", "slug"],
              populate: {
                droplet_lessons: {
                  fields: ["id"],
                },
              },
            },
          },
          fields: ["text", "color", "yLevel"],
          pagination: { pageSize: 250, page: 1 },
        }),
        next: { tags: ["highlights"] },
      });
    });

    it("should use custom sort and pagination parameters when provided", async () => {
      const mockHighlights = [
        { text: "Custom sort test", color: "pink", yLevel: 150 },
      ];

      fetchAPI.mockResolvedValueOnce(mockHighlights);

      const authorizedUserId = 5;
      const dropletId = 10;
      const customParams = {
        sort: ["color:asc"],
        pagination: { pageSize: 100, page: 3 },
        fields: ["text", "color"],
      };

      await getHighlightsByDroplet(authorizedUserId, dropletId, customParams);

      expect(fetchAPI).toHaveBeenCalledWith("/highlights", {
        urlParams: expect.objectContaining({
          sort: ["color:asc"],
          pagination: { pageSize: 100, page: 3 },
          fields: ["text", "color"],
        }),
        next: { tags: ["highlights"] },
      });
    });

    it("should return empty array when no highlights found", async () => {
      fetchAPI.mockResolvedValueOnce([]);

      const result = await getHighlightsByDroplet(5, 999);

      expect(result).toEqual([]);
    });

    it("should handle errors from fetchAPI", async () => {
      fetchAPI.mockRejectedValueOnce(
        new Error("Failed to fetch highlights by droplet"),
      );

      await expect(getHighlightsByDroplet(5, 10)).rejects.toThrow(
        "Failed to fetch highlights by droplet",
      );
    });

    it("should handle numeric and string inputs for IDs", async () => {
      fetchAPI.mockResolvedValueOnce([]);

      await getHighlightsByDroplet(5, "10");

      expect(fetchAPI).toHaveBeenCalledWith(
        "/highlights",
        expect.objectContaining({
          urlParams: expect.objectContaining({
            filters: expect.objectContaining({
              lesson: {
                droplets: {
                  id: { $eq: "10" },
                },
              },
            }),
          }),
        }),
      );
    });
  });
});
