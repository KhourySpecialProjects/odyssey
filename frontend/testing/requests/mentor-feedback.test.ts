import { saveMentorFeedback } from "@/lib/requests/mentor-feedback";
import { requireRole } from "@/lib/auth/require-role";
import { getMentorSource } from "@/lib/mentor/source";
import { findQuizQuestion } from "@/lib/mentor/quiz";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { makeFetchResponse, mockGlobalFetch } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/mentor/source", () => ({ getMentorSource: jest.fn() }));
jest.mock("@/lib/mentor/quiz", () => ({ findQuizQuestion: jest.fn() }));
jest.mock("@/lib/mentor/prompt", () => ({ MENTOR_PROMPT_VERSION: "v-test.1" }));

const mockedRequireRole = jest.mocked(requireRole);
const mockedSource = jest.mocked(getMentorSource);
const mockedQuiz = jest.mocked(findQuizQuestion);
let fetchMock: jest.MockedFunction<typeof fetch>;

const input = {
  answerKey: "7b1f0c2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b",
  kind: "lesson",
  rating: "up",
  dropletId: 3,
  lessonId: 4,
  citations: [{ ref: "p1", blockId: "b1", blockIndex: 2 }],
  shared: false,
};

const source = (
  over: {
    status?: string;
    isHidden?: boolean;
    lessons?: { id: number }[];
  } = {},
) =>
  ({
    droplet: {
      status: "published",
      isHidden: false,
      lessons: [{ id: 4 }],
      ...over,
    },
    lesson: { id: 4 },
  }) as never;

const sentBody = () => JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  fetchMock = mockGlobalFetch();
  mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
  mockedSource.mockResolvedValue(source());
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { id: 1, canShare: true } }),
  );
});

describeServerActionAuth("saveMentorFeedback", {
  requireRole: mockedRequireRole,
  invoke: () => saveMentorFeedback(input),
  mutations: () => [fetchMock],
  denial: { kind: "role", roles: [] },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedSource.mockResolvedValue(source());
      fetchMock.mockResolvedValue(
        makeFetchResponse({ data: { id: 1, canShare: true } }),
      );
    },
    expect: (result) => expect(result).toMatchObject({ ok: true }),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code }),
});

describe("saveMentorFeedback", () => {
  it("posts the gate user's id and the prompt version, and returns canShare", async () => {
    const result = await saveMentorFeedback(input);

    expect(result).toEqual({
      ok: true,
      canShare: true,
      promptVersion: "v-test.1",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/mentor-feedbacks\/record$/);
    expect(init?.method).toBe("POST");
    expect(init?.cache).toBe("no-store");
    expect(init?.headers).toMatchObject({
      "Strapi-Response-Format": "v4",
    });
    expect(sentBody()).toEqual({
      ...input,
      userId: 7,
      promptVersion: "v-test.1",
    });
  });

  it.each([
    ["a client userId", { ...input, userId: 99 }],
    ["a client promptVersion", { ...input, promptVersion: "x" }],
    ["a quiz-hint without questionId", { ...input, kind: "quiz-hint" }],
    ["a questionId on a lesson answer", { ...input, questionId: 5 }],
    ["a bad rating", { ...input, rating: "meh" }],
    [
      "a citation quote",
      { ...input, citations: [{ ref: "p1", blockIndex: 1, quote: "text" }] },
    ],
  ])("refuses %s as invalid and sends nothing", async (_name, body) => {
    await expect(saveMentorFeedback(body)).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing droplet", null],
    ["a lesson not in the droplet", source({ lessons: [{ id: 99 }] })],
    ["an unpublished droplet", source({ status: "draft" })],
    ["a hidden droplet", source({ isHidden: true })],
  ])("returns not_found for %s", async (_name, found) => {
    mockedSource.mockResolvedValue(found);

    await expect(saveMentorFeedback(input)).resolves.toEqual({
      ok: false,
      error: "not_found",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a quiz question that isn't in the lesson", async () => {
    mockedQuiz.mockReturnValue(null);

    await expect(
      saveMentorFeedback({ ...input, kind: "quiz-hint", questionId: 9 }),
    ).resolves.toEqual({ ok: false, error: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a quiz question that is in the lesson", async () => {
    mockedQuiz.mockReturnValue({ questionId: 9 } as never);

    await expect(
      saveMentorFeedback({ ...input, kind: "quiz-hint", questionId: 9 }),
    ).resolves.toMatchObject({ ok: true });
    expect(sentBody()).toMatchObject({ kind: "quiz-hint", questionId: 9 });
  });

  it.each([
    [403, "sharing_off"],
    [429, "limit"],
    [404, "not_found"],
    [400, "failed"],
    [500, "failed"],
  ])("maps a %i from Strapi to %s", async (status, error) => {
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { message: "no" } }, status),
    );

    await expect(saveMentorFeedback(input)).resolves.toEqual({
      ok: false,
      error,
    });
  });

  it("returns failed when the network call throws or the body is empty", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    await expect(saveMentorFeedback(input)).resolves.toEqual({
      ok: false,
      error: "failed",
    });

    fetchMock.mockResolvedValueOnce(makeFetchResponse({}));
    await expect(saveMentorFeedback(input)).resolves.toEqual({
      ok: false,
      error: "failed",
    });
  });

  it("treats a missing canShare as false", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 1 } }));

    await expect(saveMentorFeedback(input)).resolves.toMatchObject({
      ok: true,
      canShare: false,
    });
  });
});
