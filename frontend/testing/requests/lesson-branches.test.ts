/**
 * Branch-coverage tests for lib/requests/lesson.ts
 *
 * Targets uncovered branches:
 *   312   cleanBlocks — non-array blocks returns []
 *   329   answerOptions?.map(...) || [] — when answerOptions is undefined
 *   441   responseData.error?.message || "Failed to duplicate lesson" — message undefined
 *   462   err instanceof Error ? err.message : "Database Error..." — non-Error thrown
 */

import { duplicateLessonToDroplet } from "@/lib/requests/lesson";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  stripHtmlTags: jest.fn((str: string) => str),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Line 312 — cleanBlocks: !Array.isArray(blocks) → return []
// ---------------------------------------------------------------------------

describe("lesson-branches — cleanBlocks non-array guard (line 312)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("treats non-array blocks value as empty array (returns [])", async () => {
    const mockLesson = {
      data: {
        id: 1,
        attributes: {
          name: "Bad Blocks",
          slug: "bad-blocks",
          blocksVersion: "v1",
          // blocks is an object rather than an array — triggers !Array.isArray guard
          blocks: { invalid: true },
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockLesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 50 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);

    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    // cleanBlocks returned [] for the non-array input
    expect(body.data.blocks).toEqual([]);
  });

  it("treats an empty-object blocks value as empty array", async () => {
    // cleanBlocks is only called when lesson.blocks is truthy.
    // Passing an object (truthy, not an array) reaches the !Array.isArray guard.
    const mockLesson = {
      data: {
        id: 1,
        attributes: {
          name: "Object Blocks",
          slug: "object-blocks",
          blocksVersion: "v1",
          blocks: { 0: "bad" }, // truthy, not an array → !Array.isArray fires
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockLesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 51 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);

    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.data.blocks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Line 329 — answerOptions?.map(...) || [] when answerOptions is undefined
// ---------------------------------------------------------------------------

describe("lesson-branches — quiz answerOptions || [] fallback (line 329)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("defaults answerOptions to [] when the field is absent from a question", async () => {
    const mockLesson = {
      data: {
        id: 1,
        attributes: {
          name: "Quiz No Answers",
          slug: "quiz-no-answers",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.quiz",
              id: 10,
              questions: [
                {
                  id: 100,
                  text: "What?",
                  // answerOptions intentionally absent → ?? / || [] branch
                },
              ],
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockLesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 77 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);

    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    const question = body.data.blocks[0].questions[0];
    expect(question.answerOptions).toEqual([]);
    expect(question).not.toHaveProperty("id");
  });

  it("defaults answerOptions to [] when the field is explicitly null", async () => {
    const mockLesson = {
      data: {
        id: 1,
        attributes: {
          name: "Quiz Null Answers",
          slug: "quiz-null-answers",
          blocksVersion: "v1",
          blocks: [
            {
              __component: "droplets.quiz",
              id: 20,
              questions: [
                {
                  id: 200,
                  text: "Why?",
                  answerOptions: null,
                },
              ],
            },
          ],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockLesson))
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 88 } }));

    const result = await duplicateLessonToDroplet(1, 2, 0);

    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.data.blocks[0].questions[0].answerOptions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Line 441 — responseData.error?.message || "Failed to duplicate lesson"
// when error object has no message field
// ---------------------------------------------------------------------------

describe("lesson-branches — duplicate error fallback message (line 441)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("uses fallback error message when error object has no message field", async () => {
    const mockLesson = {
      data: {
        id: 1,
        attributes: {
          name: "V2 Lesson",
          slug: "v2-lesson",
          blocksVersion: "v2",
          blocksV2: [{ id: "abc", type: "paragraph" }],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockLesson))
      // POST returns ok=false with error object that has no message
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: {} }), // no message key
        text: async () => "{}",
        headers: new Headers(),
      } as Response);

    const result = await duplicateLessonToDroplet(1, 2, 0);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Failed to duplicate lesson");
    expect(result.data).toBeNull();
  });

  it("uses fallback when error is undefined on the response", async () => {
    const mockLesson = {
      data: {
        id: 1,
        attributes: {
          name: "V2 Lesson",
          slug: "v2-lesson",
          blocksVersion: "v2",
          blocksV2: [],
          type: "general",
        },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeFetchResponse(mockLesson))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}), // no error field at all
        text: async () => "{}",
        headers: new Headers(),
      } as Response);

    const result = await duplicateLessonToDroplet(1, 2, 0);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Failed to duplicate lesson");
  });
});

// ---------------------------------------------------------------------------
// Lines 460-465 — err instanceof Error ? err.message : "Database Error..."
// when a non-Error value is thrown from the catch block
// ---------------------------------------------------------------------------

describe("lesson-branches — catch non-Error thrown (lines 460-465)", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("uses generic error message when a non-Error string is thrown", async () => {
    // makeFetchResponse builds a real Response when available and a
    // structural fallback otherwise. Override json() to throw a non-
    // Error value so the outer catch's "instanceof Error" false branch
    // is exercised without any `as` cast.
    const response = makeFetchResponse({}, 200);
    Object.defineProperty(response, "json", {
      value: async () => {
        throw "plain string error";
      },
    });
    fetchMock.mockResolvedValueOnce(response);

    const result = await duplicateLessonToDroplet(1, 2, 0);

    expect(result.ok).toBe(false);
    // Non-Error thrown → uses the fallback message
    expect(result.error).toBe("Database Error: Failed to duplicate lesson.");
    expect(result.data).toBeNull();
  });

  it("uses err.message when an Error instance is thrown", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Custom network error"));

    const result = await duplicateLessonToDroplet(1, 2, 0);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Custom network error");
  });
});
