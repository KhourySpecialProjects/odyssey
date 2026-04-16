/**
 * Additional coverage tests for lib/requests/lesson.ts
 *
 * Target: 85%+ statements/lines, 75%+ branches, 75%+ functions
 *
 * Uncovered lines addressed here:
 *   117         completeLesson — response.ok false path
 *   142         deleteLesson — response.ok false path
 *   152-153     deleteLesson — catch path
 *   204-205     updateLesson — catch path
 *   290, 296    duplicateLessonToDroplet — source fetch failures
 *   312-378     duplicateLessonToDroplet — v1 block cleaning (all branch types)
 *   413-416     duplicateLessonToDroplet — create failure
 *   438-439     duplicateLessonToDroplet — catch path
 *   458-459     duplicateLessonToDroplet — catch in outer error handler
 */

import {
  completeLesson,
  deleteLesson,
  updateLesson,
  duplicateLessonToDroplet,
  markLessonAsComplete,
  addLesson,
} from "@/lib/requests/lesson";
import { revalidateTag } from "next/cache";
import {
  mockGlobalFetch,
  makeFetchResponse,
  makeFetchErrorResponse,
} from "@/lib/testing/mock-helpers";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  stripHtmlTags: jest.fn((str: string) => str),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

describe("lesson-coverage — completeLesson error paths", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns { success: false } when response is not ok (line 117)", async () => {
    const { getCurrentUser } = jest.requireMock("@/lib/auth/session");
    const { getAuthorizedUserByEmail } = jest.requireMock(
      "@/lib/requests/authorized-user",
    );
    getCurrentUser.mockResolvedValue({ email: "test@test.com" });
    getAuthorizedUserByEmail.mockResolvedValue({ id: 42 });

    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "bad request" }, 400),
    );

    const result = await completeLesson(1, [1, 2]);

    expect(result).toEqual({ success: false, error: expect.any(Error) });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns { success: false } when getCurrentUser returns no email", async () => {
    const { getCurrentUser } = jest.requireMock("@/lib/auth/session");
    getCurrentUser.mockResolvedValue({ email: null });

    const result = await completeLesson(5, [1]);
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });

  it("returns { success: false } when getCurrentUser returns null", async () => {
    const { getCurrentUser } = jest.requireMock("@/lib/auth/session");
    getCurrentUser.mockResolvedValue(null);

    const result = await completeLesson(5, [1]);
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });
});

describe("lesson-coverage — deleteLesson error paths", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns { ok: false } when response is not ok (line 142)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Not found" } }),
    } as Response);

    const result = await deleteLesson(999);
    expect(result).toEqual({
      ok: false,
      error: "Not found",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns error object when response.ok=true but data.error is set", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ error: { message: "Constraint violation" } }),
    } as Response);

    const result = await deleteLesson(42);
    expect(result).toEqual({
      ok: false,
      error: "Constraint violation",
      data: null,
    });
  });

  it("returns catch error string when fetch throws (lines 152-153)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network failure"));

    const result = await deleteLesson(1);
    expect(result).toEqual({
      error: "Database Error: Failed to Delete Lesson.",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("lesson-coverage — updateLesson error paths", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns catch error when fetch throws (lines 204-205)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await updateLesson(1, { name: "Test" });
    expect(result).toEqual({
      ok: false,
      error: "Database Error: Failed to update droplet.",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns error when response is not ok (no error.details)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            message: "Unauthorized",
            details: { errors: [{ path: ["slug"] }] },
          },
        }),
    } as Response);

    const result = await updateLesson(1, { slug: "bad-slug" });
    expect(result).toEqual({
      ok: false,
      error: "Unauthorized (slug)",
      data: null,
    });
  });

  it("updates slug field", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 5 } }));

    const result = await updateLesson(5, { slug: "my-new-slug" });
    expect(result.ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data.slug).toBe("my-new-slug");
  });

  it("updates orderIndex when provided as 0", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 5 } }));

    await updateLesson(5, { orderIndex: 0 });
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data.orderIndex).toBe(0);
  });

  it("updates blocksVersion field", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 5 } }));

    await updateLesson(5, { blocksVersion: "v1" });
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data.blocksVersion).toBe("v1");
  });
});

describe("lesson-coverage — markLessonAsComplete error paths", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns false when user is not authenticated (line 117)", async () => {
    const { getCurrentUser } = jest.requireMock("@/lib/auth/session");
    getCurrentUser.mockResolvedValue(null);

    const result = await markLessonAsComplete("enroll-1", [1], 2);
    expect(result).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns false when response is not ok (throws inside try/catch)", async () => {
    const { getCurrentUser } = jest.requireMock("@/lib/auth/session");
    const { getAuthorizedUserByEmail } = jest.requireMock(
      "@/lib/requests/authorized-user",
    );
    getCurrentUser.mockResolvedValue({ email: "user@test.com" });
    getAuthorizedUserByEmail.mockResolvedValue({ id: 10 });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "forbidden" }),
    } as Response);

    const result = await markLessonAsComplete("enroll-1", [1], 2);
    expect(result).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("lesson-coverage — addLesson error paths", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("handles ok response with error field (line 259)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: { message: "Duplicate slug" } }),
    } as Response);

    const result = await addLesson({
      name: "Test",
      dropletId: 1,
      orderIndex: 0,
    });
    expect(result).toEqual({
      ok: false,
      error: "Duplicate slug",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("lesson-coverage — duplicateLessonToDroplet", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns error when source fetch fails (not ok) (line 290)", async () => {
    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "not found" }, 404),
    );

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Failed to fetch source lesson/);
  });

  it("returns error when source lesson data is missing (line 296)", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: null }));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Source lesson not found/);
  });

  it("duplicates v1 lesson with generic blocks (lines 312-378)", async () => {
    const mockV1Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "Original",
          slug: "original",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.generic",
              id: 10,
              content: "<p>Hello</p>",
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV1Lesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    const result = await duplicateLessonToDroplet(1, 2, 1);

    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    // Generic blocks: id should be stripped
    expect(body.data.blocks[0]).not.toHaveProperty("id");
    expect(body.data.blocks[0]).toHaveProperty("content", "<p>Hello</p>");
    expect(body.data.blocksVersion).toBe("v1");
  });

  it("duplicates v1 lesson with quiz blocks — strips nested ids (lines 319-336)", async () => {
    const mockV1Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "Quiz Lesson",
          slug: "quiz-lesson",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.quiz",
              id: 20,
              questions: [
                {
                  id: 100,
                  text: "What is X?",
                  answerOptions: [
                    { id: 200, text: "A" },
                    { id: 201, text: "B" },
                  ],
                },
              ],
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV1Lesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    const quizBlock = body.data.blocks[0];
    expect(quizBlock).not.toHaveProperty("id");
    expect(quizBlock.questions[0]).not.toHaveProperty("id");
    expect(quizBlock.questions[0].answerOptions[0]).not.toHaveProperty("id");
  });

  it("duplicates v1 lesson with open-ended-quiz blocks (lines 339-349)", async () => {
    const mockV1Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "OE Quiz Lesson",
          slug: "oe-quiz-lesson",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.open-ended-quiz",
              id: 30,
              questions: [{ id: 300, text: "Describe..." }],
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV1Lesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    const block = body.data.blocks[0];
    expect(block).not.toHaveProperty("id");
    expect(block.questions[0]).not.toHaveProperty("id");
    expect(block.questions[0]).toHaveProperty("text", "Describe...");
  });

  it("duplicates v1 lesson with callout blocks — strips nested ids (lines 351-372)", async () => {
    const mockV1Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "Callout Lesson",
          slug: "callout-lesson",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.callout",
              id: 40,
              content: [
                {
                  id: 400,
                  text: "node",
                  children: [{ id: 500, text: "child" }],
                },
              ],
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV1Lesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    const calloutBlock = body.data.blocks[0];
    expect(calloutBlock).not.toHaveProperty("id");
    expect(calloutBlock.content[0]).not.toHaveProperty("id");
    expect(calloutBlock.content[0].children[0]).not.toHaveProperty("id");
  });

  it("uses v1 when blocksVersion is undefined (defaults to v1)", async () => {
    const mockLessonNoVersion = {
      data: {
        id: 1,
        attributes: {
          name: "No Version",
          slug: "no-version",
          // blocksVersion omitted → defaults to v1
          blocks: [{ __component: "droplets.generic", id: 1, content: "hi" }],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockLessonNoVersion))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 77 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.data.blocksVersion).toBe("v1");
    expect(body.data).toHaveProperty("blocks");
    expect(body.data).not.toHaveProperty("blocksV2");
  });

  it("returns error when create (POST) fails (lines 413-416)", async () => {
    const mockV2Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "Original",
          slug: "original",
          blocksVersion: "v2",
          blocksV2: [{ id: "1", type: "paragraph" }],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV2Lesson))
      .mockResolvedValueOnce(
        makeFetchErrorResponse({ error: { message: "Create failed" } }, 500),
      );

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Create failed/);
  });

  it("returns error when create POST returns ok=true but has error field (lines 437-443)", async () => {
    const mockV2Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "Original",
          slug: "original",
          blocksVersion: "v2",
          blocksV2: [{ id: "1", type: "paragraph" }],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV2Lesson))
      .mockResolvedValueOnce(
        makeFetchResponse({ error: { message: "Slug taken" } }),
      );

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Slug taken");
  });

  it("handles network error in catch (lines 458-459)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("DNS failure"));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("DNS failure");
    expect(result.data).toBeNull();
  });

  it("handles quiz block without questions (returns blockWithoutId)", async () => {
    const mockV1Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "Quiz No Questions",
          slug: "quiz-no-questions",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.quiz",
              id: 20,
              // no questions property
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV1Lesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.data.blocks[0]).not.toHaveProperty("id");
    expect(body.data.blocks[0]).not.toHaveProperty("questions");
  });

  it("handles open-ended-quiz block without questions (returns blockWithoutId)", async () => {
    const mockV1Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "OE Quiz No Questions",
          slug: "oe-quiz-no-questions",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.open-ended-quiz",
              id: 30,
              // no questions property
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV1Lesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.data.blocks[0]).not.toHaveProperty("id");
  });

  it("handles callout block with non-array content (returns blockWithoutId)", async () => {
    const mockV1Lesson = {
      data: {
        id: 1,
        attributes: {
          name: "Callout No Content",
          slug: "callout-no-content",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.callout",
              id: 40,
              content: "not an array",
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV1Lesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);
    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.data.blocks[0]).not.toHaveProperty("id");
  });

  it("duplicates v2 lesson with blocksV2 but no blocks (v2 path)", async () => {
    const mockV2Lesson = {
      data: {
        id: 5,
        attributes: {
          name: "V2 Lesson",
          slug: "v2-lesson",
          blocksVersion: "v2",
          blocksV2: [
            { id: "abc", type: "heading", props: { level: 1 }, children: [] },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockV2Lesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 66 } }));

    const result = await duplicateLessonToDroplet(5, 10, 2);
    expect(result.ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.data.blocksV2).toBeDefined();
    expect(body.data.blocksVersion).toBe("v2");
    expect(body.data).not.toHaveProperty("blocks");
  });
});
