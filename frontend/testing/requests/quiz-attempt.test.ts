import { recordQuizAttempt } from "@/lib/requests/quiz-attempt";
import { requireRole } from "@/lib/auth/require-role";
import { getMentorSource } from "@/lib/mentor/source";
import { choiceQuestionById, hasOpenEndedQuestion } from "@/lib/mentor/quiz";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { makeFetchResponse, mockGlobalFetch } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/mentor/source", () => ({ getMentorSource: jest.fn() }));
jest.mock("@/lib/mentor/quiz", () => ({
  choiceQuestionById: jest.fn(),
  hasOpenEndedQuestion: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedSource = jest.mocked(getMentorSource);
const mockedChoice = jest.mocked(choiceQuestionById);
const mockedOpen = jest.mocked(hasOpenEndedQuestion);
let fetchMock: jest.MockedFunction<typeof fetch>;

const input = {
  dropletId: 3,
  lessonId: 4,
  quizType: "choice",
  questionId: 9,
  correct: false,
  submitId: "7b1f0c2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b",
};

const source = (over: { lessons?: { id: number }[] } = {}) =>
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
  mockedChoice.mockReturnValue({ id: 9 } as never);
  mockedOpen.mockReturnValue(true);
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { id: 1, attempt: 1 } }),
  );
});

describeServerActionAuth("recordQuizAttempt", {
  requireRole: mockedRequireRole,
  invoke: () => recordQuizAttempt(input),
  mutations: () => [fetchMock],
  denial: { kind: "role", roles: [] },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedSource.mockResolvedValue(source());
      mockedChoice.mockReturnValue({ id: 9 } as never);
      fetchMock.mockResolvedValue(
        makeFetchResponse({ data: { id: 1, attempt: 1 } }),
      );
    },
    expect: (result) => expect(result).toEqual({ ok: true }),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code }),
});

describe("recordQuizAttempt", () => {
  it("posts the gate user's id with the ids and result, and nothing else", async () => {
    await expect(recordQuizAttempt(input)).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/quiz-attempts\/record$/);
    expect(init?.method).toBe("POST");
    expect(init?.cache).toBe("no-store");
    expect(init?.headers).toMatchObject({ "Strapi-Response-Format": "v4" });
    expect(sentBody()).toEqual({ ...input, userId: 7 });
  });

  it.each([
    ["a client userId", { ...input, userId: 99 }],
    ["an answer text", { ...input, answer: "Paris" }],
    ["a bad quizType", { ...input, quizType: "essay" }],
    ["a bad submitId", { ...input, submitId: "abc" }],
    ["a non-boolean correct", { ...input, correct: "yes" }],
    ["no questionId", { ...input, questionId: undefined }],
  ])("refuses %s as invalid and sends nothing", async (_name, body) => {
    await expect(recordQuizAttempt(body)).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing droplet", null],
    ["a lesson not in the droplet", source({ lessons: [{ id: 99 }] })],
  ])("returns not_found for %s", async (_name, found) => {
    mockedSource.mockResolvedValue(found);

    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error: "not_found",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a choice question that isn't in the lesson", async () => {
    mockedChoice.mockReturnValue(null);

    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks open-ended questions with their own lookup", async () => {
    mockedChoice.mockReturnValue(null);
    await expect(
      recordQuizAttempt({ ...input, quizType: "open-ended" }),
    ).resolves.toEqual({ ok: true });
    expect(sentBody()).toMatchObject({ quizType: "open-ended" });

    mockedOpen.mockReturnValue(false);
    await expect(
      recordQuizAttempt({ ...input, quizType: "open-ended" }),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });

  it.each([
    [403, "not_enrolled"],
    [404, "not_found"],
    [429, "limit"],
    [400, "failed"],
    [500, "failed"],
  ])("maps a %i from Strapi to %s", async (status, error) => {
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { message: "no" } }, status),
    );

    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error,
    });
  });

  it("returns failed when the network call throws or the body is empty", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error: "failed",
    });

    fetchMock.mockResolvedValueOnce(makeFetchResponse({}));
    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error: "failed",
    });
  });
});
