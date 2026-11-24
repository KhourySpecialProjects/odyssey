/** @jest-environment node */
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

const source = (over: Record<string, unknown> = {}) =>
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
  jest.spyOn(console, "warn").mockImplementation(() => {});
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
  it("accepts question id 0 and refuses -1", async () => {
    await expect(
      recordQuizAttempt({ ...input, questionId: 0 }),
    ).resolves.toEqual({ ok: true });
    expect(sentBody()).toMatchObject({ questionId: 0 });
    await expect(
      recordQuizAttempt({ ...input, questionId: -1 }),
    ).resolves.toEqual({ ok: false, error: "not_saved" });
  });

  it.each([
    ["hidden", { isHidden: true }],
    ["edit-status", { status: "edit" }],
  ])("still records for a %s droplet (Q6)", async (_name, over) => {
    mockedSource.mockResolvedValue(source(over as never));
    await expect(recordQuizAttempt(input)).resolves.toEqual({ ok: true });
  });

  it("never loads the droplet for an unauthenticated call", async () => {
    mockedRequireRole.mockResolvedValue({
      ok: false,
      error: "unauthenticated",
    } as never);
    await recordQuizAttempt(input);
    expect(mockedSource).not.toHaveBeenCalled();
  });

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
  ])("refuses %s as not_saved and sends nothing", async (_name, body) => {
    await expect(recordQuizAttempt(body)).resolves.toEqual({
      ok: false,
      error: "not_saved",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing droplet", null],
    ["a lesson not in the droplet", source({ lessons: [{ id: 99 }] })],
  ])("returns not_saved for %s", async (_name, found) => {
    mockedSource.mockResolvedValue(found);

    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error: "not_saved",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a choice question that isn't in the lesson", async () => {
    mockedChoice.mockReturnValue(null);

    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error: "not_saved",
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
    ).resolves.toEqual({ ok: false, error: "not_saved" });
  });

  it.each([
    [403, "not_saved"],
    [404, "not_saved"],
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

  it("bounds the lookup and the POST with one 3s signal", async () => {
    const timeout = jest.spyOn(AbortSignal, "timeout");
    await recordQuizAttempt(input);

    expect(timeout).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(3000);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(
      timeout.mock.results[0].value,
    );
  });

  it("returns failed, and posts nothing, when the lookup outlives the deadline", async () => {
    const controller = new AbortController();
    jest.spyOn(AbortSignal, "timeout").mockReturnValueOnce(controller.signal);
    mockedSource.mockReturnValue(new Promise(() => {}));

    const result = recordQuizAttempt(input);
    await Promise.resolve();
    controller.abort(new DOMException("timed out", "TimeoutError"));

    await expect(result).resolves.toEqual({ ok: false, error: "failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns failed, and posts nothing, when loading the droplet throws", async () => {
    mockedSource.mockRejectedValueOnce(new Error("down"));
    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error: "failed",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["an Error", new Error("down")],
    ["a timeout", new DOMException("timed out", "TimeoutError")],
    ["null", null],
  ])(
    "returns failed, without logging the body, when the POST rejects with %s",
    async (_name, reason) => {
      fetchMock.mockRejectedValueOnce(reason);

      await expect(recordQuizAttempt(input)).resolves.toEqual({
        ok: false,
        error: "failed",
      });
      expect(
        JSON.stringify(jest.mocked(console.error).mock.calls),
      ).not.toContain(input.submitId);
    },
  );

  it("returns failed when the body is empty", async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse({}));
    await expect(recordQuizAttempt(input)).resolves.toEqual({
      ok: false,
      error: "failed",
    });
  });
});
