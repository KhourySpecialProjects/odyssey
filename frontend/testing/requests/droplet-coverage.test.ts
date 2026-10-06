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
 *   1050-1113     applyLessonSync — update / create / delete basics (in depth: publish-draft-lesson-sync.test.ts)
 *   1189          publishDraftToOriginal — draftDroplet not found
 *   1217-1220     publishDraftToOriginal — missing difficulty guard
 *   1271-1278     publishDraftToOriginal — optional fields (focusArea/type/difficulty)
 *   1284-1297     publishDraftToOriginal — learningObjectives mapping (string + object forms)
 *   1299-1301     publishDraftToOriginal — prerequisites
 *   1303-1307     publishDraftToOriginal — postrequisites
 *   1309-1316     publishDraftToOriginal — nextSteps cleaning
 *   1328-1333     publishDraftToOriginal — updateResult not ok
 *   1342-1376     publishDraftToOriginal — enrollment update loop
 *   1380-1389     publishDraftToOriginal — deepDelete draft
 *   1310-1320     favoriteDroplet — add user when not in list / already in list
 *   1340          favoriteDroplet — fetch update not ok
 *   1367          updateDropletLearningObjective — fetch not ok
 */

import {
  getDropletById,
  deepDeleteDroplet,
  updateDroplet,
  archiveDroplet,
  createNewTag,
  createDroplet,
  duplicateDroplet,
  publishDraftToOriginal,
  favoriteDroplet,
  updateDropletLearningObjective,
  updateDropletAverageRating,
  updateDropletFunFact,
} from "@/lib/requests/droplet";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";
import type {
  DropletDifficulty,
  LearningObjective,
  Lesson,
  Resource,
} from "@/types";
import { revalidateTag } from "next/cache";
import {
  mockGlobalFetch,
  makeFetchResponse,
  makeFetchErrorResponse,
  makeDroplet,
  makeLesson,
} from "@/lib/testing/mock-helpers";

import {
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";
import { installDocumentIdMock } from "@/lib/testing/document-id-mock";

// jest.resetAllMocks() also wipes the documentId mock installed in
// jest.setup.ts, so put it back after every reset.
function resetAllMocks() {
  jest.resetAllMocks();
  installDocumentIdMock();
}

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

// ─── getDropletById ──────────────────────────────────────────────────────────

describe("droplet-coverage — getDropletById", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("reads through the data cache by default", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([makeDroplet({ id: 7 })]);

    await getDropletById(7);

    const [path, options] = getMockedFetchAPI().mock.calls[0];
    // Strapi v5 single-entry routes need a documentId, so this reads the list
    // endpoint with an id filter (no lookup, safe while rendering).
    expect(path).toBe("/droplets");
    expect(options.urlParams).toEqual(
      expect.objectContaining({ filters: { id: { $eq: 7 } } }),
    );
    expect(options).toEqual(
      expect.objectContaining({
        next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
      }),
    );
    expect(options).not.toHaveProperty("cache");
    expect(strapiEntryUrl).not.toHaveBeenCalled();
    expect(resolveDocumentId).not.toHaveBeenCalled();
  });

  it("skips the data cache when fresh is set, and never passes next with it", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([makeDroplet({ id: 7 })]);

    await getDropletById(7, {}, { fresh: true });

    const [path, options] = getMockedFetchAPI().mock.calls[0];
    expect(path).toBe("/droplets");
    expect(options).toEqual(expect.objectContaining({ cache: "no-store" }));
    // cache and next are mutually exclusive in Next 15: passing both breaks caching
    expect(options).not.toHaveProperty("next");
  });

  it("builds the same query whether or not the read is fresh", async () => {
    const params = {
      populate: { lessons: { fields: ["*"] } },
      fields: ["name"],
    };
    getMockedFetchAPI().mockResolvedValue([makeDroplet({ id: 7 })]);

    await getDropletById(7, params);
    await getDropletById(7, params, { fresh: true });

    const [, cachedOptions] = getMockedFetchAPI().mock.calls[0];
    const [, freshOptions] = getMockedFetchAPI().mock.calls[1];
    expect(freshOptions.urlParams).toEqual(cachedOptions.urlParams);
    expect(freshOptions.urlParams).toEqual(
      expect.objectContaining({
        populate: params.populate,
        fields: params.fields,
      }),
    );
  });

  it("returns the first droplet fetchAPI resolves with", async () => {
    const droplet = makeDroplet({ id: 7, name: "Fresh read" });
    getMockedFetchAPI().mockResolvedValueOnce([droplet]);

    await expect(getDropletById(7, {}, { fresh: true })).resolves.toBe(droplet);
  });

  it("keeps the failure a missing droplet used to produce", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    getMockedFetchAPI().mockResolvedValueOnce([]);

    await expect(getDropletById(404)).rejects.toThrow(
      "Failed to fetch data: HTTP error! status: 404",
    );
  });
});

// ─── deepDeleteDroplet ───────────────────────────────────────────────────────

describe("droplet-coverage — deepDeleteDroplet", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues; clearAllMocks only
    // resets call counts. Both are needed to prevent cross-test contamination.
    resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns error when DELETE response is not ok (line 263)", async () => {
    // getDropletById uses fetchAPI
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, lessons: [] }),
    ]);

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
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({
        id: 1,
        lessons: [
          makeLesson({ id: 10, name: "L1", slug: "l1", orderIndex: 0 }),
          makeLesson({ id: 11, name: "L2", slug: "l2", orderIndex: 1 }),
        ],
      }),
    ]);
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
    resetAllMocks();
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
    // Non-identity mapping: proves the relations go out as documentIds
    jest
      .mocked(resolveDocumentIds)
      .mockImplementation(async (collection, refs) =>
        refs.map((r) => `${collection}-doc${typeof r === "object" ? r.id : r}`),
      );

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
    expect(body.data.tags).toEqual(["tags-doc1", "tags-doc2"]);
    expect(body.data.isHidden).toBe(true);
    expect(body.data.prerequisites).toEqual(["droplets-doc3"]);
    expect(body.data.postrequisites).toEqual(["droplets-doc4"]);
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
    resetAllMocks();
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
    resetAllMocks();
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
    resetAllMocks();
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
    resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns error when user has no email", async () => {
    getGetCurrentUser().mockResolvedValue({ email: null });

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No email identified/);
  });

  it("returns error when original droplet not found (line 563)", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });
    // getDropletById throws the 404 failure when the list comes back empty
    getMockedFetchAPI().mockResolvedValueOnce([]);

    const result = await duplicateDroplet(99);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/status: 404/);
  });

  it("continues when existing-draft check throws (line 637 inner catch)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    // getDropletById (for original)
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, name: "Original", lessons: [] }),
    ]);

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

    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, name: "Original", lessons: [] }),
    ]);

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

    getMockedFetchAPI().mockResolvedValueOnce([
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
    ]);

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
    // Lineage: the clone remembers which live lesson it came from
    expect(lessonBody.data.originalLessonId).toBe(10);
  });

  it("creates new draft and duplicates v1 lessons with quiz blocks (lines 729-746)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce([
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
    ]);

    // No existing drafts
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    // POST droplet
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 50 } }));
    // POST lesson
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 51 } }));

    const result = await duplicateDroplet(1);
    expect(result.ok).toBe(true);

    // The source droplet read populates lesson blocks per component
    const readOptions = getMockedFetchAPI().mock.calls[0][1] as {
      urlParams: { populate: { lessons: unknown } };
    };
    expect(readOptions.urlParams.populate.lessons).toEqual({
      fields: ["*"],
      populate: LESSON_BLOCKS_POPULATE,
      sort: ["orderIndex:asc"],
    });

    const lessonPost = fetchMock.mock.calls[2];
    const lessonBody = JSON.parse(lessonPost[1]?.body as string);
    expect(lessonBody.data.blocks[0]).not.toHaveProperty("id");
    expect(lessonBody.data.blocks[0].questions[0]).not.toHaveProperty("id");
    expect(
      lessonBody.data.blocks[0].questions[0].answerOptions[0],
    ).not.toHaveProperty("id");
    expect(lessonBody.data.originalLessonId).toBe(20);
  });

  it("creates new draft and duplicates v1 lessons with callout blocks (lines 761-781)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce([
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
    ]);

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
    expect(lessonBody.data.originalLessonId).toBe(30);
  });

  it("reads the original droplet fresh, bypassing the data cache", async () => {
    // Direct edits to a live droplet autosave without revalidating. A cached read
    // could clone stale content, and publishing would then revert those edits.
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, name: "Original", lessons: [] }),
    ]);
    // No existing drafts
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    // POST droplet
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 99 } }));

    const result = await duplicateDroplet(1);

    expect(result.ok).toBe(true);
    const [path, options] = getMockedFetchAPI().mock.calls[0];
    expect(path).toBe("/droplets");
    expect(options.urlParams.filters).toEqual({ id: { $eq: 1 } });
    expect(options).toEqual(expect.objectContaining({ cache: "no-store" }));
    // cache and next are mutually exclusive in Next 15: passing both breaks caching
    expect(options).not.toHaveProperty("next");
  });

  it("returns error when droplet POST fails (lines 702-710)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 5 });

    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, name: "Original", lessons: [] }),
    ]);

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

    getMockedFetchAPI().mockResolvedValueOnce([
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
    ]);

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
    resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("returns error when draft droplet not found (line 960)", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    // draftDroplet fetch returns undefined
    getMockedFetchAPI()
      .mockResolvedValueOnce([]) // draftDroplet
      .mockResolvedValueOnce([makeDroplet({ id: 2, slug: "original-slug" })]); // originalDroplet

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/status: 404/);
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
      .mockResolvedValueOnce([draftDroplet])
      .mockResolvedValueOnce([originalDroplet]);

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/missing a difficulty/);
    // dbWritesStarted is false at this point so no revalidation
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns error when original droplet not found", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    getMockedFetchAPI()
      .mockResolvedValueOnce([
        makeDroplet({ id: 1, name: "[EDIT] Draft", lessons: [] }),
      ])
      .mockResolvedValueOnce([]); // originalDroplet not found

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/status: 404/);
  });

  // Lesson sync in depth (ids, progress, failure order, payloads) is covered in
  // publish-draft-lesson-sync.test.ts. These two pin the basic create/delete and
  // update-in-place outcomes against the queued fetch order.

  it("creates a draft lesson that matches no live lesson, then deletes the live lesson the draft dropped", async () => {
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

    // A different name and no originalLessonId, so nothing links it to the draft lesson
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
      .mockResolvedValueOnce([draftDroplet])
      .mockResolvedValueOnce([originalDroplet]);

    deleteLesson.mockResolvedValue({ ok: true, error: null, data: {} });

    // enrollments fetch
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

    // updateDroplet (PUT) for original
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));

    // POST new lesson (the live lesson is removed through deleteLesson, not fetch)
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 300 } }));

    // deepDeleteDroplet inner: getDropletById + DELETE
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, lessons: [] }),
    ]);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(true);
    expect(result.slug).toBe("my-droplet");

    const postIndex = fetchMock.mock.calls.findIndex(
      (c) =>
        c[1]?.method === "POST" && (c[0] as string).includes("/api/lessons"),
    );
    expect(postIndex).toBeGreaterThan(-1);
    expect(deleteLesson).toHaveBeenCalledTimes(1);
    expect(deleteLesson).toHaveBeenCalledWith(200, false);
    // The new lesson is written before the old one goes away
    expect(fetchMock.mock.invocationCallOrder[postIndex]).toBeLessThan(
      deleteLesson.mock.invocationCallOrder[0],
    );
    expect(revalidateTag).toHaveBeenCalledWith("droplets");
    expect(revalidateTag).toHaveBeenCalledWith("lesson");
  });

  it.each<[string, Partial<Lesson>]>([
    ["lineage", { name: "Renamed in the draft", originalLessonId: 200 }],
    ["name", { name: "Old Lesson" }],
  ])(
    "updates the live lesson in place, with no delete, when the draft lesson matches it by %s",
    async (_how, draftLessonFields) => {
      const deleteLesson = getMockedDeleteLesson();
      getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
      getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

      const draftDroplet = makeDroplet({
        id: 1,
        name: "[EDIT] My Droplet",
        difficulty: "beginner",
        lessons: [
          makeLesson({
            id: 100,
            slug: "draft-lesson",
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
                    children: [{ type: "text", text: "New text" }],
                  },
                ],
              },
            ],
            ...draftLessonFields,
          }),
        ],
      });
      const originalDroplet = makeDroplet({
        id: 2,
        slug: "my-droplet",
        lessons: [
          makeLesson({
            id: 200,
            name: "Old Lesson",
            slug: "old-lesson",
            orderIndex: 0,
            blocks: [],
          }),
        ],
      });

      getMockedFetchAPI()
        .mockResolvedValueOnce([draftDroplet])
        .mockResolvedValueOnce([originalDroplet]);

      // enrollments fetch
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
      // updateDroplet (PUT) for original
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));
      // PUT the live lesson in place
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 200 } }));
      // deepDeleteDroplet inner: getDropletById + DELETE
      getMockedFetchAPI().mockResolvedValueOnce([
        makeDroplet({ id: 1, lessons: [] }),
      ]);
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

      const result = await publishDraftToOriginal(1, 2);
      expect(result.ok).toBe(true);

      const lessonPut = fetchMock.mock.calls.find(
        (c) =>
          c[1]?.method === "PUT" &&
          (c[0] as string).endsWith("/api/lessons/doc200"),
      );
      expect(lessonPut).toBeDefined();
      const putBody = JSON.parse(lessonPut![1]?.body as string);
      expect(putBody.data.blocks).toHaveLength(1);
      expect(putBody.data).not.toHaveProperty("slug");
      expect(deleteLesson).not.toHaveBeenCalled();
      expect(fetchMock.mock.calls.some((c) => c[1]?.method === "POST")).toBe(
        false,
      );
    },
  );

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
      .mockResolvedValueOnce([draftDroplet])
      .mockResolvedValueOnce([originalDroplet]);

    // enrollments fetch — returns 1 enrollment to migrate
    fetchMock.mockResolvedValueOnce(
      makeFetchResponse({ data: [{ id: "enroll-99" }] }),
    );

    // updateDroplet PUT
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));

    // enrollment PUT
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: {} }));

    // deepDeleteDroplet: getDropletById + DELETE
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, lessons: [] }),
    ]);
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
      .mockResolvedValueOnce([draftDroplet])
      .mockResolvedValueOnce([originalDroplet]);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    // updateDroplet PUT
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));
    // deepDeleteDroplet: getDropletById + DELETE
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, lessons: [] }),
    ]);
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
      .mockResolvedValueOnce([draftDroplet])
      .mockResolvedValueOnce([originalDroplet]);

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

  it("creates a v2 lesson with its blocksV2 in the original droplet, without notes", async () => {
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
      documentId: "docDroplet2",
      slug: "droplet-slug",
      lessons: [],
    });

    getMockedFetchAPI()
      .mockResolvedValueOnce([draftDroplet])
      .mockResolvedValueOnce([originalDroplet]);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));
    // POST lesson
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 66 } }));
    // deepDeleteDroplet
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, lessons: [] }),
    ]);
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
    // The original droplet carries its documentId, so no lookup is needed
    expect(lessonBody.data.droplets).toEqual(["docDroplet2"]);
    // On an update `notes` would detach every student note, so it is never sent
    expect(lessonBody.data).not.toHaveProperty("notes");
  });

  it("includes prerequisites and postrequisites in the update (lines 1046, 1050-1051)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "author@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });

    const prereq = makeDroplet({ id: 10, documentId: "docPre10" });
    const postreq = makeDroplet({ id: 20, documentId: "docPost20" });

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
      .mockResolvedValueOnce([draftDroplet])
      .mockResolvedValueOnce([originalDroplet]);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 2 } }));
    // deepDeleteDroplet
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, lessons: [] }),
    ]);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await publishDraftToOriginal(1, 2);
    expect(result.ok).toBe(true);

    const updateCall = fetchMock.mock.calls.find(
      (c) =>
        c[1]?.method === "PUT" &&
        (c[0] as string).includes("/api/droplets/doc2"),
    );
    const updateBody = JSON.parse(updateCall![1]?.body as string);
    // The fetched draft's entities carry documentIds, so they are sent as is
    expect(updateBody.data.prerequisites).toEqual(["docPre10"]);
    expect(updateBody.data.postrequisites).toEqual(["docPost20"]);
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
    resetAllMocks();
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
            usersFavorited: { data: [{ id: 3, documentId: "docU3" }] },
          },
        },
      }),
    );

    // PUT update
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 5 } }));

    const droplet = makeDroplet({ id: 5, documentId: "forgedDoc" });
    const result = await favoriteDroplet(droplet, true);
    expect(result).toEqual({ success: true });

    const putCall = fetchMock.mock.calls[1];
    const putBody = JSON.parse(putCall[1]?.body as string);
    // Should include both original user (3) and new user (7), as documentIds
    expect(putBody.data.usersFavorited).toContain("docU3");
    expect(putBody.data.usersFavorited).toContain("doc7");
    // The droplet comes from the caller, so both URLs are built from its
    // numeric id; its (possibly forged) documentId is never used.
    expect(putCall[0]).toMatch(/\/api\/droplets\/doc5$/);
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /\/api\/droplets\/doc5\?populate=usersFavorited$/,
    );
    expect(strapiEntryUrl).toHaveBeenCalledWith(
      "droplets",
      5,
      "populate=usersFavorited",
    );
    expect(strapiEntryUrl).toHaveBeenCalledWith("droplets", 5);
  });

  it("does not duplicate user when already in favorites (lines 1313-1315)", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "user@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 7 });
    jest
      .mocked(resolveDocumentIds)
      .mockImplementationOnce(async (_c, refs) =>
        refs.map((r) => `doc${typeof r === "object" ? r.id : r}`),
      );

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
    expect(putBody.data.usersFavorited).toEqual(["doc7"]); // no duplicates
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
    expect(putBody.data.usersFavorited).toEqual(["doc3"]); // 7 removed
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
    resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  it("updates a learning objective successfully", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({
        id: 1,
        learningObjectives: [
          { id: 1, objective: "Old objective" },
          { id: 2, objective: "Keep this" },
        ],
      }),
    ]);

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
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({
        id: 1,
        learningObjectives: [{ id: 1, objective: "Some objective" }],
      }),
    ]);

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
    getMockedFetchAPI().mockResolvedValueOnce([]);

    const result = await updateDropletLearningObjective(1, "Old", "New");
    expect(result).toEqual({ success: false, error: expect.any(Error) });
  });

  it("handles empty learningObjectives gracefully", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, learningObjectives: undefined }),
    ]);

    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    const result = await updateDropletLearningObjective(1, "X", "Y");
    expect(result).toEqual({ success: true });
    const putBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(putBody.data.learningObjectives).toEqual([]);
  });
});

// ─── ODY-601: documentIds in URLs and relation writes ────────────────────────

describe("droplet-coverage — documentIds", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    resetAllMocks();
    fetchMock = mockGlobalFetch();
  });

  const toDoc = async (_c: unknown, refs: any[]) =>
    refs.map((r) => "doc" + (typeof r === "object" ? r.id : r));

  it("deepDeleteDroplet deletes via the fetched droplet's documentId, with no lookup", async () => {
    const droplet = makeDroplet({ id: 1, documentId: "docD1", lessons: [] });
    getMockedFetchAPI().mockResolvedValueOnce([droplet]);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 1 } }));

    await deepDeleteDroplet(1);

    expect(strapiEntryUrl).toHaveBeenCalledWith("droplets", droplet);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/droplets\/docD1$/);
  });

  it("deepDeleteDroplet returns the delete failure when the droplet cannot be resolved", async () => {
    getMockedFetchAPI().mockResolvedValueOnce([
      makeDroplet({ id: 1, lessons: [] }),
    ]);
    jest
      .mocked(strapiEntryUrl)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("missing"));

    const result = await deepDeleteDroplet(1);

    expect(result).toEqual({
      ok: false,
      error: "Failed to delete droplet.",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updateDroplet PUTs to the droplet documentId and sends author, lesson relations as documentIds", async () => {
    jest.mocked(resolveDocumentIds).mockImplementation(toDoc as any);
    jest
      .mocked(strapiEntryUrl)
      .mockResolvedValueOnce("http://strapi/api/droplets/docD7");
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 7 } }));

    await updateDroplet(7, {
      authorized_users: [1, 2],
      lessons: [{ id: 5 }],
    });

    expect(strapiEntryUrl).toHaveBeenCalledWith("droplets", 7);
    expect(fetchMock.mock.calls[0][0]).toBe("http://strapi/api/droplets/docD7");
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data.authorized_users).toEqual(["doc1", "doc2"]);
    expect(body.data.lessons).toEqual(["doc5"]);
  });

  it("updateDroplet resolves lessons and datasets from numeric ids, ignoring client documentIds", async () => {
    jest
      .mocked(strapiEntryUrl)
      .mockResolvedValueOnce("http://strapi/api/droplets/docD7");
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 7 } }));

    await updateDroplet(7, {
      lessons: [{ id: 5, documentId: "forgedLesson" } as any],
      datasets: [{ id: 3, documentId: "forgedDataset" } as any],
    });

    expect(resolveDocumentIds).toHaveBeenCalledWith("lessons", [5]);
    expect(resolveDocumentIds).toHaveBeenCalledWith("datasets", [{ id: 3 }]);
  });

  it("updateDroplet returns the not-found result for a missing droplet or relation", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest
      .mocked(strapiEntryUrl)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("missing"));
    expect(await updateDroplet(7, { name: "X" })).toEqual({
      ok: false,
      error: "Not Found",
      data: null,
    });

    jest
      .mocked(resolveDocumentIds)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("no tag 9"));
    expect(await updateDroplet(7, { tagIds: [9] })).toEqual({
      ok: false,
      error: "no tag 9",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updateDropletAverageRating and updateDropletFunFact use the droplet documentId URL", async () => {
    jest
      .mocked(strapiEntryUrl)
      .mockResolvedValue("http://strapi/api/droplets/docD3");
    fetchMock.mockResolvedValue(makeFetchResponse({ data: {} }));

    await updateDropletAverageRating(4.2, 3);
    await updateDropletFunFact("fact", 3);

    expect(strapiEntryUrl).toHaveBeenCalledWith("droplets", 3);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "http://strapi/api/droplets/docD3",
      "http://strapi/api/droplets/docD3",
    ]);
  });

  it("archiveDroplet PUTs to the fetched enrollment without a lookup and fails cleanly when missing", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "u@test.com" });
    getGetAuthorizedUserByEmail().mockResolvedValue({ id: 1 });
    const enrollment = { id: 9, documentId: "docE9" };
    getGetEnrollmentByUserAndDroplet().mockResolvedValue(enrollment);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: {} }));

    const ok = await archiveDroplet(makeDroplet({ id: 2 }), true);

    expect(ok).toEqual({ success: true });
    expect(strapiEntryUrl).toHaveBeenCalledWith("enrollments", enrollment);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/enrollments\/docE9$/);

    jest.spyOn(console, "error").mockImplementation(() => {});
    jest
      .mocked(strapiEntryUrl)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("missing"));
    const missing = await archiveDroplet(makeDroplet({ id: 2 }), true);
    expect(missing).toEqual({ success: false, error: expect.any(Error) });
  });

  it("createDroplet sends tag and author documentIds", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "u@test.com" });
    const author = { id: 1, documentId: "docA1" };
    getGetAuthorizedUserByEmail().mockResolvedValue(author);
    getMockedFetchAPI().mockResolvedValueOnce([]);
    jest.mocked(resolveDocumentIds).mockImplementation(toDoc as any);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: { id: 3 } }));

    await createDroplet({
      name: "N",
      focusArea: "technical",
      type: "knowledge",
      difficulty: "beginner",
      tagIds: [4, 5],
      learningObjectives: ["a"],
    } as any);

    expect(resolveDocumentId).toHaveBeenCalledWith("authorized-users", author);
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.data.tags).toEqual({ connect: ["doc4", "doc5"] });
    expect(body.data.authorized_users).toEqual({ connect: ["docA1"] });
  });

  it("duplicateDroplet connects fetched entities by documentId and links lessons to the new droplet's documentId", async () => {
    getGetCurrentUser().mockResolvedValue({ email: "u@test.com" });
    const author = { id: 5, documentId: "docA5" };
    getGetAuthorizedUserByEmail().mockResolvedValue(author);
    const original = makeDroplet({
      id: 1,
      name: "O",
      tags: [
        { id: 3, documentId: "docT3", name: "t", slug: "t", droplets: [] },
      ],
      authorized_users: [{ id: 7, documentId: "docA7" }],
      prerequisites: [makeDroplet({ id: 8, documentId: "docP8" })],
      postrequisites: [makeDroplet({ id: 9, documentId: "docP9" })],
      lessons: [makeLesson({ id: 10, name: "L", slug: "l", orderIndex: 0 })],
    });
    getMockedFetchAPI().mockResolvedValueOnce([original]);
    fetchMock
      .mockResolvedValueOnce(makeFetchResponse({ data: [] }))
      .mockResolvedValueOnce(
        makeFetchResponse({ data: { id: 50, documentId: "docNew50" } }),
      )
      .mockResolvedValueOnce(makeFetchResponse({ data: { id: 51 } }));

    const result = await duplicateDroplet(1);

    expect(result.ok).toBe(true);
    const dropletBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(dropletBody.data.tags).toEqual({ connect: ["docT3"] });
    expect(dropletBody.data.authorized_users).toEqual({
      connect: ["docA7", "docA5"],
    });
    expect(dropletBody.data.prerequisites).toEqual({ connect: ["docP8"] });
    expect(dropletBody.data.postrequisites).toEqual({ connect: ["docP9"] });
    const lessonBody = JSON.parse(fetchMock.mock.calls[2][1]?.body as string);
    expect(lessonBody.data.droplets).toEqual(["docNew50"]);
  });

  it("updateDropletLearningObjective PUTs via the fetched droplet's documentId", async () => {
    const droplet = makeDroplet({
      id: 1,
      documentId: "docD1",
      learningObjectives: [{ id: 1, objective: "Old" }],
    });
    getMockedFetchAPI().mockResolvedValueOnce([droplet]);
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: {} }));

    await updateDropletLearningObjective(1, "Old", "New");

    expect(strapiEntryUrl).toHaveBeenCalledWith("droplets", droplet);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/droplets\/docD1$/);
  });
});
