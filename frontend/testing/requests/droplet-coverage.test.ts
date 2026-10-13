/**
 * Additional coverage tests for lib/requests/droplet.ts
 *
 * Target: 80%+ statements/lines, 70%+ branches, 65%+ functions
 *
 * Uncovered line ranges addressed:
 *   263           deepDeleteDroplet — delete response not ok
 *   300           updateDroplet — learningObjectives mapping
 *   335-336       updateDroplet — error with errorPath branch
 *   360-361       updateDroplet — catch path
 *   396           archiveDroplet — fetch error path
 *   423-424       createNewTag — fetch not ok path
 *   509-511       createDroplet — error response path
 *   563           duplicateDroplet — no originalDroplet
 *   637           duplicateDroplet — draft check error (inner catch)
 *   670-683       duplicateDroplet — existing draft found for current user
 *   717-787       duplicateDroplet — cleanBlocks branches (quiz, open-ended, callout, generic)
 *   794-862       duplicateDroplet — lesson duplication loop (v1 + v2)
 *   960           publishDraftToOriginal — draftDroplet not found
 *   973           publishDraftToOriginal — missing difficulty guard
 *   992-1002      publishDraftToOriginal — delete lessons loop
 *   1027          publishDraftToOriginal — optional fields (focusArea/type/difficulty)
 *   1035-1040     publishDraftToOriginal — learningObjectives mapping (string + object forms)
 *   1046          publishDraftToOriginal — prerequisites
 *   1050-1051     publishDraftToOriginal — postrequisites
 *   1057-1060     publishDraftToOriginal — nextSteps cleaning
 *   1073-1074     publishDraftToOriginal — updateResult not ok
 *   1087-1114     publishDraftToOriginal — enrollment update loop
 *   1119-1154     publishDraftToOriginal — cleanBlocks helper (quiz, open-ended)
 *   1160-1231     publishDraftToOriginal — lesson creation loop (v1 + v2)
 *   1245-1246     publishDraftToOriginal — deepDelete draft
 *   1310-1320     favoriteDroplet — add user when not in list / already in list
 *   1340          favoriteDroplet — fetch update not ok
 *   1367          updateDropletLearningObjective — fetch not ok
 */

import {
  deepDeleteDroplet,
  updateDroplet,
  archiveDroplet,
  createNewTag,
  createDroplet,
  duplicateDroplet,
  publishDraftToOriginal,
  favoriteDroplet,
  updateDropletLearningObjective,
} from "@/lib/requests/droplet";
import type { DropletDifficulty, LearningObjective, Resource } from "@/types";
import { revalidateTag } from "next/cache";
import {
  mockGlobalFetch,
  makeFetchResponse,
  makeFetchErrorResponse,
  makeDroplet,
  makeLesson,
} from "@/lib/testing/mock-helpers";

// ─── module mocks ────────────────────────────────────────────────────────────

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
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

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollmentByUserAndDroplet: jest.fn(),
}));

jest.mock("@/lib/requests/lesson", () => ({
  deleteLesson: jest.fn(),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function getGetCurrentUser() {
  return jest.requireMock("@/lib/auth/session").getCurrentUser;
}
function getGetAuthorizedUserByEmail() {
  return jest.requireMock("@/lib/requests/authorized-user")
    .getAuthorizedUserByEmail;
}
function getGetEnrollmentByUserAndDroplet() {
  return jest.requireMock("@/lib/requests/enrollment")
    .getEnrollmentByUserAndDroplet;
}
function getMockedFetchAPI() {
  return jest.mocked(jest.requireMock("@/lib/utils").fetchAPI);
}
function getMockedDeleteLesson() {
  return jest.requireMock("@/lib/requests/lesson").deleteLesson;
}

// ─── deepDeleteDroplet ───────────────────────────────────────────────────────

describe("droplet-coverage — deepDeleteDroplet", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns error when DELETE response is not ok (line 263)", async () => {
    // getDropletById uses fetchAPI
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, lessons: [] }),
    );

    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "forbidden" }, 403),
    );

    const result = await deepDeleteDroplet(1);
    expect(result).toEqual({
      ok: false,
      error: "Failed to delete droplet.",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("deletes associated lessons before the droplet", async () => {
    const deleteLesson = getMockedDeleteLesson();
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({
        id: 1,
        lessons: [
          makeLesson({ id: 10, name: "L1", slug: "l1", orderIndex: 0 }),
          makeLesson({ id: 11, name: "L2", slug: "l2", orderIndex: 1 }),
        ],
      }),
    );
    deleteLesson.mockResolvedValue({ ok: true, error: null, data: {} });

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await deepDeleteDroplet(1);
    expect(deleteLesson).toHaveBeenCalledTimes(2);
    expect(deleteLesson).toHaveBeenCalledWith(10, false);
    expect(deleteLesson).toHaveBeenCalledWith(11, false);
    expect(result).toEqual({ ok: true, error: null, data: { id: 1 } });
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
  });

  it("returns catch error when fetchAPI throws (line 275)", async () => {
    getMockedFetchAPI().mockRejectedValueOnce(new Error("DB down"));

    const result = await deepDeleteDroplet(1);
    expect(result).toEqual({
      error: "Database Error: Failed to Delete Droplet.",
    });
  });
});

// ─── updateDroplet ───────────────────────────────────────────────────────────

describe("droplet-coverage — updateDroplet", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("maps learningObjectives correctly (line 300)", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 5 } }));

    // DropletSchema.learningObjectives is string[] — updateDroplet wraps each
    // string into { objective: str } when sending to Strapi.
    await updateDroplet(5, {
      learningObjectives: ["Learn X", "Do Y"],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data.learningObjectives).toEqual([
      { objective: "Learn X" },
      { objective: "Do Y" },
    ]);
  });

  it("returns error with errorPath when error.details exists (lines 335-336)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            message: "Validation failed",
            details: { errors: [{ path: ["name"] }] },
          },
        }),
    } as Response);

    const result = await updateDroplet(1, { name: "X" });
    expect(result).toEqual({
      ok: false,
      error: "Validation failed (name)",
      data: null,
    });
  });

  it("returns generic error message when error.details is missing", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: { message: "Some error" },
        }),
    } as Response);

    const result = await updateDroplet(1, { name: "X" });
    expect(result).toEqual({
      ok: false,
      error: "Some error",
      data: null,
    });
  });

  it("returns catch error when fetch throws (lines 360-361)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Timeout"));

    const result = await updateDroplet(1, { name: "Test" });
    expect(result).toEqual({
      ok: false,
      error: "Database Error: Failed to update droplet.",
      data: null,
    });
  });

  it("includes tagIds, isHidden, prerequisiteIds, postrequisiteIds in payload", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 7 } }));

    await updateDroplet(7, {
      tagIds: [1, 2],
      isHidden: true,
      prerequisiteIds: [3],
      postrequisiteIds: [4],
      datasets: [
        {
          name: "ds",
          url: "https://example.com",
          fileType: "csv",
          fileSize: 100,
        },
      ],
      description: "desc",
      overview: "overview",
      inReview: true,
      status: "published",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data.tags).toEqual([1, 2]);
    expect(body.data.isHidden).toBe(true);
    expect(body.data.prerequisites).toEqual([3]);
    expect(body.data.postrequisites).toEqual([4]);
    expect(body.data.datasets).toEqual([
      {
        name: "ds",
        url: "https://example.com",
        fileType: "csv",
        fileSize: 100,
      },
    ]);
    expect(body.data.description).toBe("desc");
    expect(body.data.overview).toBe("overview");
    expect(body.data.inReview).toBe(true);
    expect(body.data.status).toBe("published");
  });

  it("sets regenerateSlug on the request body", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 3 } }));

    await updateDroplet(3, { name: "New" }, { regenerateSlug: true });

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data.regenerateSlug).toBe(true);
  });
});

// ─── archiveDroplet ──────────────────────────────────────────────────────────

describe("droplet-coverage — archiveDroplet", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("archives a droplet successfully", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });
    getGetEnrollmentByUserAndDroplet().mockResolvedValue({ id: "enroll-1" });

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const droplet = makeDroplet({ id: 1 });
    const result = await archiveDroplet(droplet, true);

    expect(result).toEqual({ success: true });
    expect(revalidateTag).toHaveBeenCalledWith("enrollments-7");
  });

  it("returns { success: false } when fetch is not ok (line 396)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });
    getGetEnrollmentByUserAndDroplet().mockResolvedValue({ id: "enroll-1" });

    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "failed" }, 500),
    );

    const droplet = makeDroplet({ id: 1 });
    const result = await archiveDroplet(droplet, false);

    expect(result).toEqual({ success: false, error: expect.any(Error) });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns { success: false } when user is not authenticated", async () => {
    getGetCurrentUser().mockResolvedValue(null);

    const droplet = makeDroplet({ id: 1 });
    const result = await archiveDroplet(droplet, true);
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });

  it("returns { success: false } when no enrollment found", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });
    getGetEnrollmentByUserAndDroplet().mockResolvedValue(null);

    const droplet = makeDroplet({ id: 1 });
    const result = await archiveDroplet(droplet, true);
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });
});

// ─── createNewTag ─────────────────────────────────────────────────────────────

describe("droplet-coverage — createNewTag", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns success when tag is created", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            id: 5,
            attributes: { name: "NewTag", slug: "NewTag" },
          },
        }),
    } as Response);

    const result = await createNewTag("NewTag");
    expect(result).toEqual({
      success: true,
      data: { id: 5, name: "NewTag", slug: "NewTag", droplets: [] },
    });
    expect(revalidateTag).toHaveBeenCalledWith("tags");
  });

  it("returns { success: false } when fetch is not ok (lines 423-424)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("Internal Server Error"),
      json: () => Promise.resolve({}),
    } as Response);

    const result = await createNewTag("BadTag");
    expect(result).toEqual({
      success: false,
      error: "Failed to add new tag",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns { success: false } when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const result = await createNewTag("ErrorTag");
    expect(result).toEqual({
      success: false,
      error: "Failed to process request",
    });
  });
});

// ─── createDroplet ───────────────────────────────────────────────────────────

describe("droplet-coverage — createDroplet", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns duplicate error when name already exists", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });
    // getDroplets (for duplicate check) returns a hit
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ name: "Existing" }),
    ]);

    const result = await createDroplet({
      name: "Existing",
      focusArea: "technical",
      type: "knowledge",
      tagIds: [],
      learningObjectives: [],
      difficulty: "beginner",
    });

    expect(result).toEqual({
      ok: false,
      error: "This attribute must be unique (name)",
      data: null,
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns error when POST response is not ok (lines 509-511)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });
    // No existing droplets
    getMockedFetchAPI().mockResolvedValueOnce([]);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            message: "Validation error",
            details: { errors: [{ path: ["name"] }] },
          },
        }),
    } as Response);

    const result = await createDroplet({
      name: "New Droplet",
      focusArea: "technical",
      type: "knowledge",
      tagIds: [],
      learningObjectives: ["Objective 1"],
      difficulty: "beginner",
    });

    expect(result).toEqual({
      ok: false,
      error: "Validation error (name)",
      data: null,
    });
  });

  it("successfully creates a droplet", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 3 });
    getMockedFetchAPI().mockResolvedValueOnce([]);

    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({
        data: { id: 10, attributes: { name: "New Droplet" } },
      }),
    );

    const result = await createDroplet({
      name: "New Droplet",
      focusArea: "technical",
      type: "knowledge",
      tagIds: [1, 2],
      learningObjectives: ["Learn this"],
      difficulty: "beginner",
    });

    expect(result).toEqual({ ok: true, error: null, data: expect.anything() });
    expect(revalidateTag).toHaveBeenCalledWith("authors");
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
  });

  it("returns catch error when getCurrentUser throws", async () => {
    getGetCurrentUser().mockRejectedValueOnce(new Error("Session error"));

    const result = await createDroplet({
      name: "Fail",
      focusArea: "technical",
      type: "knowledge",
      tagIds: [],
      learningObjectives: [],
      difficulty: "beginner",
    });

    expect(result).toEqual({
      ok: false,
      error: "Database Error: Failed to create droplet.",
      data: null,
    });
  });
});

// ─── duplicateDroplet ────────────────────────────────────────────────────────

describe("droplet-coverage — duplicateDroplet", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns error when user has no email", async () => {
    getGetCurrentUser().mockResolvedValue({ email: null });

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No email identified/);
  });

  it("returns error when original droplet not found (line 563)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });
    // getDropletById returns undefined/null
    getMockedFetchAPI().mockResolvedValueOnce(undefined);

    const result = await duplicateDroplet(99);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Original droplet not found/);
  });

  it("continues when existing-draft check throws (line 637 inner catch)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    // getDropletById (for original)
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, name: "Original", lessons: [] }),
    );

    // The inner fetch for existing drafts throws
    fetchMock
      .mockRejectedValueOnce(new Error("network error checking drafts"))
      // POST to create new droplet
      .mockResolvedValueOnce(
        makeFetchResponse({
          data: {
            id: 200,
            attributes: { slug: "draft-xyz", name: "[EDIT] Original" },
          },
        }),
      );

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(true);
    expect(result.isExisting).toBe(false);
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
  });

  it("returns existing draft when user is already an authorized user (lines 670-683)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, name: "Original", lessons: [] }),
    );

    // existing drafts fetch returns a draft where user id=5 is authorized
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({
        data: [
          {
            id: 42,
            attributes: {
              slug: "existing-draft-slug",
              name: "[EDIT] Original",
              authorized_users: {
                data: [{ id: 5 }],
              },
            },
          },
        ],
      }),
    );

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(true);
    expect(result.isExisting).toBe(true);
    expect(result.data).toMatchObject({ id: 42 });
    // No new POST should have been made
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates new draft and duplicates v2 lessons (lines 794-862)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({
        id: 1,
        name: "Original",
        authorized_users: [{ id: 5 }],
        lessons: [
          makeLesson({
            id: 10,
            name: "Lesson 1",
            slug: "lesson-1",
            orderIndex: 0,
            blocksVersion: "v2",
            blocksV2: [{ id: "a", type: "paragraph", props: {}, children: [] }],
            blocks: [],
          }),
        ],
      }),
    );

    // existing drafts fetch — no drafts
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

    // POST new droplet
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    // POST lesson
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 101 } }));

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(true);
    expect(result.isExisting).toBe(false);

    // Verify the lesson POST included blocksV2
    const lessonPost = fetchMock.mock.calls[2];
    const lessonBody = JSON.parse(lessonPost[1]?.body as string);
    expect(lessonBody.data.blocksV2).toBeDefined();
    expect(lessonBody.data.blocksVersion).toBe("v2");
  });

  it("creates new draft and duplicates v1 lessons with quiz blocks (lines 729-746)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({
        id: 1,
        name: "Original",
        authorized_users: [],
        lessons: [
          makeLesson({
            id: 20,
            name: "Quiz Lesson",
            slug: "quiz-lesson",
            orderIndex: 0,
            blocksVersion: "v1",
            blocks: [
              {
                __component: "droplets.quiz",
                id: 99,
                questions: [
                  {
                    id: 100,
                    content: "Q?",
                    answerOptions: [
                      { id: 200, content: "A", isCorrect: false },
                    ],
                  },
                ],
              },
            ],
          }),
        ],
      }),
    );

    // No existing drafts
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    // POST droplet
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 50 } }));
    // POST lesson
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 51 } }));

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(true);

    const lessonPost = fetchMock.mock.calls[2];
    const lessonBody = JSON.parse(lessonPost[1]?.body as string);
    expect(lessonBody.data.blocks[0]).not.toHaveProperty("id");
    expect(lessonBody.data.blocks[0].questions[0]).not.toHaveProperty("id");
    expect(
      lessonBody.data.blocks[0].questions[0].answerOptions[0],
    ).not.toHaveProperty("id");
  });

  it("creates new draft and duplicates v1 lessons with callout blocks (lines 761-781)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({
        id: 1,
        name: "Original",
        authorized_users: [],
        lessons: [
          makeLesson({
            id: 30,
            name: "Callout Lesson",
            slug: "callout-lesson",
            orderIndex: 0,
            blocksVersion: "v1",
            blocks: [
              {
                __component: "droplets.callout",
                id: 88,
                color: "blue",
                type: "info",
                content: [
                  {
                    type: "paragraph",
                    children: [{ type: "text", text: "parent child" }],
                  },
                ],
              },
            ],
          }),
        ],
      }),
    );

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 60 } }));
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 61 } }));

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(true);

    const lessonPost = fetchMock.mock.calls[2];
    const lessonBody = JSON.parse(lessonPost[1]?.body as string);
    const calloutBlock = lessonBody.data.blocks[0];
    expect(calloutBlock).not.toHaveProperty("id");
    expect(calloutBlock.content[0]).not.toHaveProperty("id");
    expect(calloutBlock.content[0].children[0]).not.toHaveProperty("id");
  });

  it("returns error when droplet POST fails (lines 702-710)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, name: "Original", lessons: [] }),
    );

    // No existing drafts
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    // POST droplet fails
    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: { message: "Slug conflict" } }, 400),
    );

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Slug conflict/);
  });

  it("returns error when lesson POST fails (lines 852-858)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({
        id: 1,
        name: "Original",
        authorized_users: [],
        lessons: [
          makeLesson({
            id: 10,
            name: "L1",
            slug: "l1",
            orderIndex: 0,
            blocksVersion: "v1",
            blocks: [],
          }),
        ],
      }),
    );

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 70 } }));
    // Lesson POST fails
    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "lesson creation failed" }, 500),
    );

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Failed to create lesson/);
  });
});

// ─── publishDraftToOriginal ──────────────────────────────────────────────────

describe("droplet-coverage — publishDraftToOriginal", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns error when draft droplet not found (line 960)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    // draftDroplet fetch returns undefined
    getMockedFetchAPI()
      .mockResolvedValueOnce(undefined) // draftDroplet
      .mockResolvedValueOnce(makeDroplet({ id: 2, slug: "original-slug" })); // originalDroplet

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Draft droplet not found/);
  });

  it("returns error when difficulty is missing (line 973)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    const draftDroplet = makeDroplet({
      id: 1,
      name: "[EDIT] Draft",
      difficulty: null as unknown as DropletDifficulty,
      lessons: [],
    });
    const originalDroplet = makeDroplet({
      id: 2,
      slug: "original-slug",
      lessons: [],
    });

    // draftDroplet (call 1), originalDroplet (call 2) — both via fetchAPI
    // The difficulty check happens BEFORE the enrollments fetch, so no fetchMock needed
    getMockedFetchAPI()
      .mockResolvedValueOnce(draftDroplet)
      .mockResolvedValueOnce(originalDroplet);

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/missing a difficulty/);
    // dbWritesStarted is false at this point so no revalidation
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns error when original droplet not found", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    getMockedFetchAPI()
      .mockResolvedValueOnce(
        makeDroplet({ id: 1, name: "[EDIT] Draft", lessons: [] }),
      )
      .mockResolvedValueOnce(undefined); // originalDroplet not found

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Original droplet not found/);
  });

  it("deletes original lessons and creates new ones from draft (lines 992-1002, 1160-1231)", async () => {
    const deleteLesson = getMockedDeleteLesson();
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    const draftDroplet = makeDroplet({
      id: 1,
      name: "[EDIT] My Droplet",
      difficulty: "beginner",
      focusArea: "technical",
      type: "knowledge",
      tags: [{ id: 3, name: "Tag", slug: "tag", droplets: [] }],
      learningObjectives: [{ id: 1, objective: "Learn A" }],
      lessons: [
        makeLesson({
          id: 100,
          name: "Draft Lesson",
          slug: "draft-lesson",
          orderIndex: 0,
          blocksVersion: "v1",
          blocks: [],
        }),
      ],
    });

    const originalDroplet = makeDroplet({
      id: 2,
      slug: "my-droplet",
      difficulty: "beginner",
      lessons: [
        makeLesson({
          id: 200,
          name: "Old Lesson",
          slug: "old-lesson",
          orderIndex: 0,
        }),
      ],
    });

    getMockedFetchAPI()
      .mockResolvedValueOnce(draftDroplet)
      .mockResolvedValueOnce(originalDroplet);

    deleteLesson.mockResolvedValue({ ok: true, error: null, data: {} });

    // enrollments fetch
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

    // updateDroplet (PUT) for original
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));

    // POST new lesson
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 300 } }));

    // deepDeleteDroplet inner: getDropletById + DELETE
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, lessons: [] }),
    );
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(true);
    expect(result.slug).toBe("my-droplet");
    expect(deleteLesson).toHaveBeenCalledWith(200, false);
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
    expect(revalidateTag).toHaveBeenCalledWith("lesson");
  });

  it("updates enrollments to point to original droplet (lines 1087-1114)", async () => {
    getMockedDeleteLesson();
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    const draftDroplet = makeDroplet({
      id: 1,
      name: "[EDIT] Droplet",
      difficulty: "intermediate",
      lessons: [],
    });
    const originalDroplet = makeDroplet({
      id: 2,
      slug: "droplet-slug",
      lessons: [],
    });

    getMockedFetchAPI()
      .mockResolvedValueOnce(draftDroplet)
      .mockResolvedValueOnce(originalDroplet);

    // enrollments fetch — returns 1 enrollment to migrate
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({ data: [{ id: "enroll-99" }] }),
    );

    // updateDroplet PUT
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));

    // enrollment PUT
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: {} }));

    // deepDeleteDroplet: getDropletById + DELETE
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, lessons: [] }),
    );
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(true);

    // Verify enrollment was updated
    const enrollmentPut = fetchMock.mock.calls.find(
      (c) =>
        (c[0] as string).includes("enrollments/enroll-99") &&
        c[1]?.method === "PUT",
    );
    expect(enrollmentPut).toBeDefined();
  });

  it("maps learningObjectives — string form (lines 1035-1040)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    const draftDroplet = makeDroplet({
      id: 1,
      name: "[EDIT] Droplet",
      difficulty: "beginner",
      // learningObjectives as plain strings (edge case path)
      learningObjectives: [
        "Objective string A",
        "Objective string B",
      ] as unknown as LearningObjective[],
      lessons: [],
    });
    const originalDroplet = makeDroplet({
      id: 2,
      slug: "droplet-slug",
      lessons: [],
    });

    getMockedFetchAPI()
      .mockResolvedValueOnce(draftDroplet)
      .mockResolvedValueOnce(originalDroplet);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    // updateDroplet PUT
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));
    // deepDeleteDroplet: getDropletById + DELETE
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, lessons: [] }),
    );
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(true);

    // publishDraftToOriginal maps plain-string learningObjectives through
    // the "typeof obj === 'string' → return obj" branch, producing a string[].
    // updateDroplet then wraps each string into { objective: str } for Strapi.
    const updateCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PUT");
    const updateBody = JSON.parse(updateCall![1]?.body as string);
    expect(updateBody.data.learningObjectives).toEqual([
      { objective: "Objective string A" },
      { objective: "Objective string B" },
    ]);
  });

  it("propagates updateDroplet failure (lines 1073-1074)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    const draftDroplet = makeDroplet({
      id: 1,
      name: "[EDIT] Droplet",
      difficulty: "beginner",
      lessons: [],
    });
    const originalDroplet = makeDroplet({
      id: 2,
      slug: "droplet-slug",
      lessons: [],
    });

    getMockedFetchAPI()
      .mockResolvedValueOnce(draftDroplet)
      .mockResolvedValueOnce(originalDroplet);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    // updateDroplet PUT — fails
    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse(
        {
          error: {
            message: "DB error",
            details: { errors: [{ path: ["name"] }] },
          },
        },
        500,
      ),
    );

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/DB error/);
    // dbWritesStarted was true, so revalidation should have fired (in finally)
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
  });

  it("handles v2 lessons in the creation loop (lines 1195-1198)", async () => {
    getMockedDeleteLesson();
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    const draftDroplet = makeDroplet({
      id: 1,
      name: "[EDIT] Droplet",
      difficulty: "beginner",
      lessons: [
        makeLesson({
          id: 55,
          name: "V2 Lesson",
          slug: "v2-lesson",
          orderIndex: 0,
          blocksVersion: "v2",
          blocksV2: [{ id: "abc", type: "paragraph", props: {}, children: [] }],
          blocks: [],
        }),
      ],
    });
    const originalDroplet = makeDroplet({
      id: 2,
      slug: "droplet-slug",
      lessons: [],
    });

    getMockedFetchAPI()
      .mockResolvedValueOnce(draftDroplet)
      .mockResolvedValueOnce(originalDroplet);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));
    // POST lesson
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 66 } }));
    // deepDeleteDroplet
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, lessons: [] }),
    );
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(true);

    const lessonPost = fetchMock.mock.calls.find(
      (c) =>
        c[1]?.method === "POST" && (c[0] as string).includes("/api/lessons"),
    );
    const lessonBody = JSON.parse(lessonPost![1]?.body as string);
    expect(lessonBody.data.blocksV2).toBeDefined();
    expect(lessonBody.data.blocksVersion).toBe("v2");
  });

  it("includes prerequisites and postrequisites in the update (lines 1046, 1050-1051)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    const prereq = makeDroplet({ id: 10 });
    const postreq = makeDroplet({ id: 20 });

    const draftDroplet = makeDroplet({
      id: 1,
      name: "[EDIT] Droplet",
      difficulty: "beginner",
      prerequisites: [prereq],
      postrequisites: [postreq],
      nextSteps: [
        { id: 99, __component: "droplets.link", url: "https://example.com" },
      ] as unknown as Resource[],
      lessons: [],
    });
    const originalDroplet = makeDroplet({
      id: 2,
      slug: "droplet-slug",
      lessons: [],
    });

    getMockedFetchAPI()
      .mockResolvedValueOnce(draftDroplet)
      .mockResolvedValueOnce(originalDroplet);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));
    // deepDeleteDroplet
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, lessons: [] }),
    );
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(true);

    const updateCall = fetchMock.mock.calls.find(
      (c) =>
        c[1]?.method === "PUT" && (c[0] as string).includes("/api/droplets/2"),
    );
    const updateBody = JSON.parse(updateCall![1]?.body as string);
    expect(updateBody.data.prerequisites).toEqual([10]);
    expect(updateBody.data.postrequisites).toEqual([20]);
    // nextSteps should have id stripped
    expect(updateBody.data.nextSteps[0]).not.toHaveProperty("id");
    expect(updateBody.data.nextSteps[0]).toHaveProperty("__component");
  });
});

// ─── favoriteDroplet ─────────────────────────────────────────────────────────

describe("droplet-coverage — favoriteDroplet", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("adds user to favorites when not already present (lines 1308-1312)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });

    // Fetch current favorites — user 7 is NOT in the list
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({
        data: {
          id: 5,
          attributes: {
            usersFavorited: { data: [{ id: 3 }] },
          },
        },
      }),
    );

    // PUT update
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 5 } }));

    const droplet = makeDroplet({ id: 5 });
    const result = await favoriteDroplet(droplet, true);
    expect(result).toEqual({ success: true });

    const putCall = fetchMock.mock.calls[1];
    const putBody = JSON.parse(putCall[1]?.body as string);
    // Should include both original user (3) and new user (7)
    expect(putBody.data.usersFavorited).toContain(3);
    expect(putBody.data.usersFavorited).toContain(7);
  });

  it("does not duplicate user when already in favorites (lines 1313-1315)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });

    // User 7 IS already in the list
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({
        data: {
          id: 5,
          attributes: {
            usersFavorited: { data: [{ id: 7 }] },
          },
        },
      }),
    );

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 5 } }));

    const droplet = makeDroplet({ id: 5 });
    const result = await favoriteDroplet(droplet, true);
    expect(result).toEqual({ success: true });

    const putBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(putBody.data.usersFavorited).toEqual([7]); // no duplicates
  });

  it("removes user from favorites (unfavorite path — lines 1317-1321)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });

    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({
        data: {
          id: 5,
          attributes: {
            usersFavorited: { data: [{ id: 3 }, { id: 7 }] },
          },
        },
      }),
    );
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 5 } }));

    const droplet = makeDroplet({ id: 5 });
    const result = await favoriteDroplet(droplet, false);
    expect(result).toEqual({ success: true });

    const putBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(putBody.data.usersFavorited).toEqual([3]); // 7 removed
  });

  it("returns { success: false } when fetch latest state fails", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });

    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "not found" }, 404),
    );

    const droplet = makeDroplet({ id: 5 });
    const result = await favoriteDroplet(droplet, true);
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });

  it("returns { success: false } when PUT update fails (line 1340)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });

    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({
        data: {
          id: 5,
          attributes: { usersFavorited: { data: [] } },
        },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "update failed" }, 500),
    );

    const droplet = makeDroplet({ id: 5 });
    const result = await favoriteDroplet(droplet, true);
    expect(result).toEqual({ success: false, error: expect.any(Error) });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns { success: false } when user has no email", async () => {
    getGetCurrentUser().mockResolvedValue({ email: null });

    const droplet = makeDroplet({ id: 5 });
    const result = await favoriteDroplet(droplet, true);
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });
});

// ─── updateDropletLearningObjective ──────────────────────────────────────────

describe("droplet-coverage — updateDropletLearningObjective", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    jest.resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("updates a learning objective successfully", async () => {
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({
        id: 1,
        learningObjectives: [
          { id: 1, objective: "Old objective" },
          { id: 2, objective: "Keep this" },
        ],
      }),
    );

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await updateDropletLearningObjective(
      1,
      "Old objective",
      "New objective",
    );
    expect(result).toEqual({ success: true });
    expect(revalidateTag).toHaveBeenCalledWith("droplets");

    const putBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    // Production maps to strings and wraps into { objective } — ids are dropped.
    expect(putBody.data.learningObjectives).toEqual([
      { objective: "New objective" },
      { objective: "Keep this" },
    ]);
  });

  it("returns { success: false } when fetch is not ok (line 1367)", async () => {
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({
        id: 1,
        learningObjectives: [{ id: 1, objective: "Some objective" }],
      }),
    );

    fetchMock.mockResolvedValueOnce(
      makeFetchErrorResponse({ error: "failed" }, 500),
    );

    const result = await updateDropletLearningObjective(
      1,
      "Some objective",
      "New objective",
    );
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });

  it("returns { success: false } when droplet not found (line 1366)", async () => {
    getMockedFetchAPI().mockResolvedValueOnce(undefined);

    const result = await updateDropletLearningObjective(1, "Old", "New");
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });

  it("handles empty learningObjectives gracefully", async () => {
    getMockedFetchAPI().mockResolvedValueOnce(
      makeDroplet({ id: 1, learningObjectives: undefined }),
    );

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await updateDropletLearningObjective(1, "X", "Y");
    expect(result).toEqual({ success: true });
    const putBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(putBody.data.learningObjectives).toEqual([]);
  });
});
