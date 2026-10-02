import { revalidateTag } from "next/cache";

const {
  getNotesByAuthorizedUserAndLesson,
  getNotesByDroplet,
  updateNoteContent,
  updateNotePosition,
  createNote,
  deleteNote,
} = require("../../lib/requests/notes");
const { fetchAPI } = require("../../lib/utils");
const {
  resolveDocumentId,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} = require("../../lib/strapi-document-id");

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
  const { revalidateTag } = require("next/cache");

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
          tags: ["notes-4"],
          revalidate: 900,
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
            },
          },
          fields: ["id", "content", "positionY"],
          pagination: {
            pageSize: 250,
            page: 1,
          },
        },
        next: {
          tags: ["notes-4"],
          revalidate: 900,
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
          tags: ["notes-4"],
          revalidate: 900,
        },
      });
    });
  });

  describe("updateNoteContent", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidateTag.mockReset();
    });

    it("updates via the note documentId", async () => {
      strapiEntryUrl.mockResolvedValueOnce("http://strapi/api/notes/docN1");
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await updateNoteContent(1, "x", 4);

      expect(strapiEntryUrl).toHaveBeenCalledWith("notes", 1);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://strapi/api/notes/docN1",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("returns success:false when the note cannot be resolved", async () => {
      strapiEntryUrl.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      const result = await updateNoteContent(1, "x", 4);

      expect(result.success).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should successfully update note content", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: { id: 1, attributes: { content: "Updated content" } },
        }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await updateNoteContent(1, "Updated content", 4);

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

      expect(revalidateTag).toHaveBeenCalledWith("notes-4");

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

      const result = await updateNoteContent(1, "Test content", 4);

      expect(result).toEqual({ success: false, error: expect.any(Object) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when updating note content", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await updateNoteContent(1, "Test content", 4);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("updateNotePosition", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidateTag.mockReset();
    });

    it("should successfully update note position", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1, attributes: { positionY: 150 } } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await updateNotePosition(1, 150, 4);

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

      expect(revalidateTag).toHaveBeenCalledWith("notes-4");

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

      const result = await updateNotePosition(1, 150, 4);

      expect(result).toEqual({ success: false, error: expect.any(Object) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network errors when updating note position", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await updateNotePosition(1, 150, 4);

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("createNote", () => {
    beforeEach(() => {
      global.fetch.mockReset();
      revalidateTag.mockReset();
    });

    it("should successfully create a new note", async () => {
      const mockLesson = {
        id: 101,
        documentId: "docL101",
        title: "Test Lesson",
      };
      const mockEnrollment = {
        id: 201,
        documentId: "docE201",
        authorizedUser: { id: 4 },
      };
      const mockPosition = 150;
      const mockHighlight = {
        id: 301,
        documentId: "docH301",
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
      resolveDocumentId.mockImplementation(async (_c, ref) => `doc${ref}`);

      const result = await createNote(
        mockLesson,
        mockEnrollment,
        mockPosition,
        4,
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
              lesson: "doc101",
              enrollment: "doc201",
              positionY: Math.round(mockPosition),
              highlight: "doc301",
            },
          }),
        }),
      );

      expect(revalidateTag).toHaveBeenCalledWith("notes-4");

      expect(result).toEqual({ success: true });
    });

    it("resolves relations from numeric ids only and ignores client documentIds", async () => {
      const lesson = { id: 101, documentId: "someoneElsesLesson" };
      const enrollment = { id: 201, documentId: "someoneElsesEnrollment" };
      const highlight = { id: 301, documentId: "someoneElsesHighlight" };
      resolveDocumentId.mockImplementation(async (_c, ref) => `doc${ref}`);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await createNote(lesson, enrollment, 10, 4, highlight);

      expect(resolveDocumentId).toHaveBeenCalledWith("lessons", 101);
      expect(resolveDocumentId).toHaveBeenCalledWith("enrollments", 201);
      expect(resolveDocumentId).toHaveBeenCalledWith("highlights", 301);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data).toMatchObject({
        lesson: "doc101",
        enrollment: "doc201",
        highlight: "doc301",
      });
    });

    it("resolves numeric-only entities to documentIds", async () => {
      const toDoc = async (_c, ref) =>
        "doc" + (typeof ref === "object" ? ref.id : ref);
      resolveDocumentId
        .mockImplementationOnce(toDoc)
        .mockImplementationOnce(toDoc)
        .mockImplementationOnce(toDoc);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });

      await createNote({ id: 101 }, { id: 201 }, 10, 4, { id: 301 });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.data).toMatchObject({
        lesson: "doc101",
        enrollment: "doc201",
        highlight: "doc301",
      });
    });

    it("returns the add-failed result when a relation cannot be resolved", async () => {
      resolveDocumentId.mockRejectedValueOnce(
        new StrapiEntryNotFoundError("missing"),
      );

      const result = await createNote({ id: 1 }, { id: 2 }, 10, 4);

      expect(result).toEqual({
        success: false,
        error: "Failed to add new note",
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should create a note without a highlight", async () => {
      const mockLesson = {
        id: 101,
        documentId: "docL101",
        title: "Test Lesson",
      };
      const mockEnrollment = {
        id: 201,
        documentId: "docE201",
        authorizedUser: { id: 4 },
      };
      const mockPosition = 150;

      const mockResponse = {
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      };

      global.fetch.mockResolvedValueOnce(mockResponse);
      resolveDocumentId.mockImplementation(async (_c, ref) => `doc${ref}`);

      const result = await createNote(
        mockLesson,
        mockEnrollment,
        mockPosition,
        4,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({
            data: {
              content: "",
              lesson: "doc101",
              enrollment: "doc201",
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

      const result = await createNote(
        mockLesson,
        mockEnrollment,
        mockPosition,
        4,
      );

      expect(result).toEqual({
        success: false,
        error: "Failed to add new note",
      });
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

      const result = await createNote(
        mockLesson,
        mockEnrollment,
        mockPosition,
        4,
      );

      expect(result).toEqual({
        success: false,
        error: "Failed to process request",
      });
      expect(revalidateTag).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe("deleteNote", () => {
  beforeEach(() => {
    global.fetch.mockReset();
    revalidateTag.mockReset();
  });
  it("successfully deletes a note", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ data: { id: 1 } }),
      status: 200,
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await deleteNote(1, 4);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/api/notes/1"),
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: expect.stringContaining("Bearer"),
        }),
      }),
    );

    expect(result).toEqual({
      ok: true,
      error: null,
      data: { id: 1 },
    });

    expect(revalidateTag).toHaveBeenCalledWith("notes-4");
  });

  it("deletes via the note documentId", async () => {
    strapiEntryUrl.mockResolvedValueOnce("http://strapi/api/notes/docN1");
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    });

    await deleteNote(1, 4);

    expect(strapiEntryUrl).toHaveBeenCalledWith("notes", 1);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://strapi/api/notes/docN1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns the not-found result when the note cannot be resolved", async () => {
    strapiEntryUrl.mockRejectedValueOnce(
      new StrapiEntryNotFoundError("missing"),
    );

    const result = await deleteNote(1, 4);

    expect(result).toEqual({ ok: false, error: "Not Found", data: null });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("handles deletion failure", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ error: { message: "Failed to delete" } }),
      status: 400,
    };

    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await deleteNote(1, 4);

    expect(result).toEqual({
      ok: false,
      error: "Failed to delete",
      data: null,
    });

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
