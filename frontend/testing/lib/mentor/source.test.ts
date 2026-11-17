jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));

import { CACHE_TAGS } from "@/lib/cache-tags";
import { getMentorSource } from "@/lib/mentor/source";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";
import { fetchAPI } from "@/lib/utils";
import { classicLesson } from "@/testing/mocks/mentorLessonMock";

const mockFetch = jest.mocked(fetchAPI);
const lesson = classicLesson();

/** A droplet as fetchAPI returns it, flattened */
const row = (over: Record<string, unknown> = {}) => ({
  id: 5,
  name: "Databases 101",
  difficulty: "beginner",
  status: "published",
  isHidden: false,
  learningObjectives: [{ objective: " Write a join " }, { objective: "" }],
  lessons: [lesson],
  ...over,
});

describe("getMentorSource", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the droplet and the one lesson by id, cached with the page's tags", async () => {
    mockFetch.mockResolvedValue([row()]);
    await expect(getMentorSource(5, lesson.id)).resolves.toEqual({
      droplet: {
        name: "Databases 101",
        difficulty: "beginner",
        learningObjectives: ["Write a join"],
        status: "published",
        isHidden: false,
        lessons: [{ id: lesson.id }],
      },
      lesson,
    });
    expect(mockFetch).toHaveBeenCalledWith("/droplets", {
      urlParams: {
        filters: { id: { $eq: 5 } },
        fields: ["name", "difficulty", "status", "isHidden"],
        populate: {
          learningObjectives: true,
          lessons: {
            filters: { id: { $eq: lesson.id } },
            fields: ["name", "blocksVersion", "blocksV2"],
            populate: LESSON_BLOCKS_POPULATE,
          },
        },
        pagination: { pageSize: 1, page: 1 },
      },
      next: {
        tags: [CACHE_TAGS.droplets, CACHE_TAGS.lesson],
        revalidate: 900,
      },
    });
  });

  it.each<[string, unknown[], unknown]>([
    ["no droplet", [], null],
    [
      "a lesson not in the droplet",
      [row({ lessons: [] })],
      expect.objectContaining({
        lesson: null,
        droplet: expect.objectContaining({ lessons: [] }),
      }),
    ],
    [
      "an ignored populate filter",
      [row({ lessons: [{ ...lesson, id: 999 }, lesson] })],
      expect.objectContaining({ lesson }),
    ],
    [
      "a missing hidden flag",
      [row({ isHidden: undefined })],
      expect.objectContaining({
        droplet: expect.objectContaining({ isHidden: true }),
      }),
    ],
  ])("handles %s", async (_, rows, expected) => {
    mockFetch.mockResolvedValue(rows);
    await expect(getMentorSource(5, lesson.id)).resolves.toEqual(expected);
  });
});
