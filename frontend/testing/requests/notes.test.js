const {
  getNotesByAuthorizedUserAndLesson,
  getNotesByDroplet,
  updateNoteContent,
  updateNotePosition,
  createNote,
} = require("../../lib/requests/notes");
const { fetchAPI } = require("../../lib/utils");

const mockNotes = require("../mocks/notesMock");

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

describe("Notes Tests", () => {
  const { revalidatePath, revalidateTag } = require("next/cache");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getNotesByAuthorizedUserAndLesson", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should fetch and return notes for this user and lesson", async () => {
      const mockStrapiResponse = {
        data: mockNotes.map((note) => ({
          id: note.id,
          content: note.attributes.content,
          positionY: note.attributes.positionY,
        })),
      };

      fetchAPI.mockResolvedValueOnce(mockStrapiResponse);

      const result = await getNotesByAuthorizedUserAndLesson(4, "101");

      expect(fetchAPI).toHaveBeenCalledWith("/notes", {
        urlParams: {
          sort: undefined,
          filters: {
            enrollment: {
              authorizedUser: {
                id: { $eq: 4 },
              },
            },
            lesson: {
              slug: { $eq: "101" },
            },
          },
          populate: {
            highlight: {
              fields: ["*"],
            },
          },
          fields: ["id", "content", "positionY"],
          pagination: {
            pageSize: 250,
            page: 1,
          },
        },
        next: {
          tags: ["notes"],
        },
      });

      expect(result).toEqual(mockStrapiResponse);
    });

    it("should handle fetch errors", async () => {
      fetchAPI.mockRejectedValueOnce(new Error("Failed to fetch notes"));

      await expect(
        getNotesByAuthorizedUserAndLesson(-1, 500),
      ).rejects.toThrow();
    });
  });

  describe("getNotesByDroplet", () => {
    it("should fetch and return notes for a specific user and droplet", async () => {
      const mockStrapiResponse = {
        data: mockNotes.map((note) => ({
          id: note.id,
          content: note.attributes.content,
          positionY: note.attributes.positionY,
        })),
      };

      fetchAPI.mockResolvedValueOnce(mockStrapiResponse);

      const result = await getNotesByDroplet(4, 101);

      expect(fetchAPI).toHaveBeenCalledWith("/notes", {
        urlParams: {
          sort: undefined,
          filters: {
            enrollment: {
              authorizedUser: {
                id: { $eq: 4 },
              },
            },
            lesson: {
              droplets: {
                id: { $eq: 101 },
              },
            },
          },
          populate: {
            highlight: {
              fields: ["text", "color", "yLevel"],
            },
            lesson: {
              fields: ["*"],
              populate: {
                droplet_lessons: {
                  fields: ["*"],
                },
              },
            },
          },
          fields: ["id", "content", "positionY"],
          pagination: {
            pageSize: 250,
            page: 1,
          },
        },
        next: {
          tags: ["notes"],
        },
      });

      expect(result).toEqual(mockStrapiResponse);
    });

    it("should handle fetch errors for getNotesByDroplet", async () => {
      fetchAPI.mockRejectedValueOnce(
        new Error("Failed to fetch notes by droplet"),
      );
      await expect(getNotesByDroplet(-1, 500)).rejects.toThrow();
    });

    it("should accept custom query parameters", async () => {
      const mockStrapiResponse = { data: [] };
      fetchAPI.mockResolvedValueOnce(mockStrapiResponse);

      const customParams = {
        sort: ["positionY:asc"],
        pagination: { pageSize: 10, page: 2 },
        fields: ["id", "content"],
      };

      await getNotesByDroplet(4, 101, customParams);

      expect(fetchAPI).toHaveBeenCalledWith("/notes", {
        urlParams: expect.objectContaining({
          sort: ["positionY:asc"],
          pagination: { pageSize: 10, page: 2 },
          fields: ["id", "content"],
        }),
        next: {
          tags: ["notes"],
        },
      });
    });
  });

  describe("updateNoteContent", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
      revalidateTag.mockReset();
    });

    it("should successfully update note content", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: { id: 1, attributes: { content: "Updated content" } },
        }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await updateNoteContent(1, "Updated content");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes/1"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              content: "Updated content",
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith(
        "/d/[slug]/[lessonSlug]",
        "page",
      );
      expect(revalidateTag).toHaveBeenCalledWith("notes");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors when updating note content", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await updateNoteContent(1, "Test content");

      expect(result).toEqual({ success: false, error: expect.any(Object) });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when updating note content", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await updateNoteContent(1, "Test content");

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("updateNotePosition", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
      revalidateTag.mockReset();
    });

    it("should successfully update note position", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1, attributes: { positionY: 150 } } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await updateNotePosition(1, 150);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes/1"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              positionY: 150,
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith(
        "/d/[slug]/[lessonSlug]",
        "page",
      );
      expect(revalidateTag).toHaveBeenCalledWith("notes");

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors when updating note position", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await updateNotePosition(1, 150);

      expect(result).toEqual({ success: false, error: expect.any(Object) });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when updating note position", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await updateNotePosition(1, 150);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createNote", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidatePath.mockReset();
      revalidateTag.mockReset();
    });

    it("should successfully create a new note", async () => {
      const mockLesson = { id: 101, title: "Test Lesson" };
      const mockEnrollment = { id: 201, authorizedUser: { id: 4 } };
      const mockPosition = 150;
      const mockHighlight = {
        id: 301,
        text: "Highlighted text",
        color: "yellow",
        yLevel: 75,
      };
      const mockContent = "New note content";

      const mockResponse = {
        ok: true,
        json: async () => ({
          data: {
            id: 1,
            attributes: {
              content: mockContent,
              positionY: mockPosition,
              lesson: { data: { id: mockLesson.id } },
              enrollment: { data: { id: mockEnrollment.id } },
              highlight: mockHighlight
                ? { data: { id: mockHighlight.id } }
                : null,
            },
          },
        }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await createNote(
        mockLesson,
        mockEnrollment,
        mockPosition,
        mockHighlight,
        mockContent,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
          body: JSON.stringify({
            data: {
              content: "",
              lesson: mockLesson.id,
              enrollment: mockEnrollment.id,
              positionY: Math.round(mockPosition),
              highlight: mockHighlight.id,
            },
          }),
        }),
      );

      expect(revalidatePath).toHaveBeenCalledWith(
        "/d/[slug]/[lessonSlug]",
        "page",
      );
      expect(revalidateTag).toHaveBeenCalledWith("notes");

      expect(result).toEqual({ success: true });
    });

    it("should create a note without a highlight", async () => {
      const mockLesson = { id: 101, title: "Test Lesson" };
      const mockEnrollment = { id: 201, authorizedUser: { id: 4 } };
      const mockPosition = 150;

      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await createNote(mockLesson, mockEnrollment, mockPosition);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({
            data: {
              content: "",
              lesson: mockLesson.id,
              enrollment: mockEnrollment.id,
              positionY: Math.round(mockPosition),
              highlight: undefined,
            },
          }),
        }),
      );

      expect(result).toEqual({ success: true });
    });

    it("should handle API errors when creating a note", async () => {
      const mockLesson = { id: 101, title: "Test Lesson" };
      const mockEnrollment = { id: 201, authorizedUser: { id: 4 } };
      const mockPosition = 150;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Bad Request",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createNote(mockLesson, mockEnrollment, mockPosition);

      expect(result).toEqual({
        success: false,
        error: "Failed to add new note",
      });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when creating a note", async () => {
      const mockLesson = { id: 101, title: "Test Lesson" };
      const mockEnrollment = { id: 201, authorizedUser: { id: 4 } };
      const mockPosition = 150;

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createNote(mockLesson, mockEnrollment, mockPosition);

      expect(result).toEqual({
        success: false,
        error: "Failed to process request",
      });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
