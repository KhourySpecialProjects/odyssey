const {
  getHighlightsByDroplet,
  getHighlightsByAuthorizedUserAndLesson,
} = require("../../lib/requests/highlights");
const { fetchAPI } = require("../../lib/utils");

jest.mock("../../lib/utils", () => ({
  fetchAPI: jest.fn(),
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
            },
          },
          fields: ["text", "color", "yLevel"],
          pagination: { pageSize: 250, page: 1 },
        }),
        next: { tags: ["highlights-5"], revalidate: 900 },
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
        next: { tags: ["highlights-5"], revalidate: 900 },
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

describe("getHighlightsByAuthorizedUserAndLesson", () => {
  it("should fetch a user's highlights for a lesson by slug", async () => {
    const mockHighlights = [
      { id: 1, text: "Key idea", color: "#fff300", blockId: 2 },
    ];
    fetchAPI.mockResolvedValueOnce(mockHighlights);

    const result = await getHighlightsByAuthorizedUserAndLesson(1, "lesson-1");

    expect(result).toEqual(mockHighlights);
    expect(fetchAPI).toHaveBeenCalledWith(
      "/highlights",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: {
            authorized_user: { id: { $eq: 1 } },
            lesson: { slug: { $eq: "lesson-1" } },
          },
          populate: { note: { fields: ["id"] } },
        }),
        next: { tags: ["highlights-1", "notes-1"], revalidate: 900 },
      }),
    );
  });
});
