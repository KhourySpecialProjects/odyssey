/* eslint-disable @typescript-eslint/no-require-imports */
import { createLessonsFromImport } from "../create-lessons";

// Mock the addLesson server action
jest.mock("@/lib/requests/lesson", () => ({
  addLesson: jest.fn(),
}));

const { addLesson } = require("@/lib/requests/lesson");

beforeEach(() => {
  jest.clearAllMocks();
});

function makeLessonData(title: string) {
  return {
    title,
    blocks: [
      {
        id: "block-1",
        type: "paragraph" as const,
        props: {
          textColor: "default",
          textAlignment: "left" as const,
          backgroundColor: "default",
        },
        content: [{ text: title, type: "text" as const, styles: {} }],
        children: [],
      },
    ],
  };
}

function makeSuccessResponse(id: number, name: string, orderIndex: number) {
  return {
    ok: true,
    error: null,
    data: {
      id,
      attributes: {
        name,
        slug: `slug-${id}`,
        type: "general",
        orderIndex,
      },
    },
  };
}

describe("createLessonsFromImport", () => {
  it("creates lessons sequentially with correct orderIndex", async () => {
    addLesson
      .mockResolvedValueOnce(makeSuccessResponse(1, "Lesson 1", 3))
      .mockResolvedValueOnce(makeSuccessResponse(2, "Lesson 2", 4))
      .mockResolvedValueOnce(makeSuccessResponse(3, "Lesson 3", 5));

    const result = await createLessonsFromImport({
      dropletId: 10,
      startOrderIndex: 3,
      lessons: [
        makeLessonData("Lesson 1"),
        makeLessonData("Lesson 2"),
        makeLessonData("Lesson 3"),
      ],
    });

    expect(addLesson).toHaveBeenCalledTimes(3);

    // Verify sequential calls with correct orderIndex
    expect(addLesson).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: "Lesson 1",
        dropletId: 10,
        orderIndex: 3,
        blocksVersion: "v2",
      }),
    );

    expect(addLesson).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: "Lesson 2",
        dropletId: 10,
        orderIndex: 4,
        blocksVersion: "v2",
      }),
    );

    expect(addLesson).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        name: "Lesson 3",
        dropletId: 10,
        orderIndex: 5,
        blocksVersion: "v2",
      }),
    );

    expect(result.created).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it("passes blocksV2 to addLesson", async () => {
    addLesson.mockResolvedValue(makeSuccessResponse(1, "Lesson 1", 0));

    const blocks = [
      {
        id: "b1",
        type: "heading" as const,
        props: {
          level: 1 as const,
          textColor: "default",
          isToggleable: false,
          textAlignment: "left" as const,
          backgroundColor: "default",
        },
        content: [{ text: "Hello", type: "text" as const, styles: {} }],
        children: [],
      },
    ];

    await createLessonsFromImport({
      dropletId: 1,
      startOrderIndex: 0,
      lessons: [{ title: "Lesson 1", blocks }],
    });

    expect(addLesson).toHaveBeenCalledWith(
      expect.objectContaining({ blocksV2: blocks }),
    );
  });

  it("collects errors for failed lessons and continues", async () => {
    addLesson
      .mockResolvedValueOnce(makeSuccessResponse(1, "Lesson 1", 0))
      .mockResolvedValueOnce({ ok: false, error: "Database error", data: null })
      .mockResolvedValueOnce(makeSuccessResponse(3, "Lesson 3", 2));

    const result = await createLessonsFromImport({
      dropletId: 5,
      startOrderIndex: 0,
      lessons: [
        makeLessonData("Lesson 1"),
        makeLessonData("Lesson 2"),
        makeLessonData("Lesson 3"),
      ],
    });

    expect(addLesson).toHaveBeenCalledTimes(3);
    expect(result.created).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      index: 1,
      error: "Database error",
    });
  });

  it("handles thrown exceptions from addLesson", async () => {
    addLesson.mockRejectedValue(new Error("Network failure"));

    const result = await createLessonsFromImport({
      dropletId: 1,
      startOrderIndex: 0,
      lessons: [makeLessonData("Lesson 1")],
    });

    expect(result.created).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Network failure");
  });

  it("calls onProgress callback for each lesson", async () => {
    addLesson
      .mockResolvedValueOnce(makeSuccessResponse(1, "A", 0))
      .mockResolvedValueOnce(makeSuccessResponse(2, "B", 1));

    const onProgress = jest.fn();

    await createLessonsFromImport({
      dropletId: 1,
      startOrderIndex: 0,
      lessons: [makeLessonData("A"), makeLessonData("B")],
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2, "Creating lessons");
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2, "Creating lessons");
  });

  it("returns empty created array when all lessons fail", async () => {
    addLesson.mockResolvedValue({ ok: false, error: "Error", data: null });

    const result = await createLessonsFromImport({
      dropletId: 1,
      startOrderIndex: 0,
      lessons: [makeLessonData("A"), makeLessonData("B")],
    });

    expect(result.created).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });

  it("returns correct lesson objects for created lessons", async () => {
    addLesson.mockResolvedValue(makeSuccessResponse(42, "My Lesson", 5));

    const blocks = makeLessonData("My Lesson").blocks;
    const result = await createLessonsFromImport({
      dropletId: 1,
      startOrderIndex: 5,
      lessons: [{ title: "My Lesson", blocks }],
    });

    const created = result.created[0];
    expect(created.id).toBe(42);
    expect(created.name).toBe("My Lesson");
    expect(created.slug).toBe("slug-42");
    expect(created.blocksV2).toEqual(blocks);
    expect(created.blocksVersion).toBe("v2");
    expect(created.orderIndex).toBe(5);
  });

  it("handles undefined response from addLesson gracefully", async () => {
    addLesson.mockResolvedValue(undefined);

    const result = await createLessonsFromImport({
      dropletId: 1,
      startOrderIndex: 0,
      lessons: [makeLessonData("Lesson 1")],
    });

    expect(result.created).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Unknown error creating lesson");
  });
});
