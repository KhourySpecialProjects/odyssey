import { act, renderHook, waitFor } from "@testing-library/react";
import { useMentorChat } from "@/hooks/use-mentor-chat";
import {
  mentorCitation,
  mentorDone,
  mentorError,
  mentorHttpErrorResponse,
  mentorSseResponse,
  mentorText,
} from "@/testing/mocks/mentorEventsMock";
import type { MentorMsg } from "@/lib/mentor/chat-types";
import type { MentorEvent, MentorHttpErrorCode } from "@/lib/mentor/events";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const setup = () =>
  renderHook(() => useMentorChat({ dropletId: 3, lessonId: 9 }));
const lastAnswer = (messages: { role: string }[]) =>
  messages[messages.length - 1] as MentorMsg;
const answers = (
  events: MentorEvent[] = [mentorText("Hi [p2]"), mentorDone()],
) => fetchMock.mockImplementation(async () => mentorSseResponse(events));
const bodyOf = (call: number) =>
  JSON.parse(fetchMock.mock.calls[call][1].body as string);
const ask = async (
  result: ReturnType<typeof setup>["result"],
  message: string,
) => {
  act(() => result.current.ask({ kind: "lesson", message }));
  await waitFor(() => expect(result.current.streaming).toBe(false));
};

describe("useMentorChat", () => {
  it("accumulates text and finishes with citations", async () => {
    const citations = [mentorCitation()];
    answers([
      mentorText("A join "),
      mentorText("combines [p2]."),
      mentorDone({ citations, truncated: true }),
    ]);
    const { result } = setup();
    await ask(result, " What is a join? ");

    expect(result.current.messages[0]).toMatchObject({
      role: "student",
      text: "What is a join?",
    });
    expect(lastAnswer(result.current.messages)).toMatchObject({
      status: "done",
      text: "A join combines [p2].",
      citations,
      truncated: true,
    });
    expect(bodyOf(0)).toEqual({
      kind: "lesson",
      dropletId: 3,
      lessonId: 9,
      message: "What is a join?",
      history: [],
    });
  });

  it("stop keeps the text received so far", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      mentorSseResponse([mentorText("One "), mentorText("two"), mentorDone()], {
        delayMs: 100,
        signal: init.signal,
      }),
    );
    const { result } = setup();
    act(() => result.current.ask({ kind: "lesson", message: "Q" }));
    await waitFor(() =>
      expect(lastAnswer(result.current.messages).text).toBe("One "),
    );
    act(() => result.current.stop());
    await waitFor(() => expect(result.current.streaming).toBe(false));

    expect(lastAnswer(result.current.messages)).toMatchObject({
      status: "stopped",
      text: "One ",
    });
  });

  it("shows a broken stream as an error with retry", async () => {
    fetchMock.mockImplementation(async () =>
      mentorSseResponse([mentorText("Par"), mentorDone()], { dropAfter: 1 }),
    );
    const { result } = setup();
    await ask(result, "Q");

    expect(lastAnswer(result.current.messages)).toMatchObject({
      status: "error",
      text: "",
      error: { message: "The answer broke off. Try again.", retry: true },
    });
  });

  it("clears the text on a stream error event", async () => {
    answers([mentorText("Some"), mentorError("failed", "Couldn't finish.")]);
    const { result } = setup();
    await ask(result, "Q");

    expect(lastAnswer(result.current.messages)).toMatchObject({
      status: "error",
      text: "",
      error: { message: "Couldn't finish.", retry: true },
    });
  });

  it.each<[number, MentorHttpErrorCode | "weird", "lock" | boolean]>([
    [429, "daily_limit", "lock"],
    [503, "monthly_cap", "lock"],
    [503, "disabled", "lock"],
    [503, "not_in_pilot", "lock"],
    [403, "forbidden", "lock"],
    [401, "unauthenticated", "lock"],
    [429, "rate_limited", true],
    [503, "unavailable", true],
    [502, "model_unavailable", true],
    [500, "internal", true],
    [400, "cannot_answer", false],
    [413, "too_large", false],
    [404, "not_found", false],
    [418, "weird", false],
    [509, "weird", true],
  ])("maps %i %s", async (status, code, outcome) => {
    fetchMock.mockResolvedValue(
      mentorHttpErrorResponse(status, {
        error: code as MentorHttpErrorCode,
        message: "Server says so",
      }),
    );
    const { result } = setup();
    await ask(result, "Q");

    if (outcome === "lock") {
      expect(result.current.lock).toBe("Server says so");
      expect(result.current.messages).toHaveLength(1);
    } else {
      expect(result.current.lock).toBeNull();
      expect(lastAnswer(result.current.messages)).toMatchObject({
        status: "error",
        error: { message: "Server says so", retry: outcome },
      });
    }
  });

  it("ignores ask and retry once locked", async () => {
    fetchMock.mockResolvedValueOnce(
      mentorHttpErrorResponse(500, { error: "internal", message: "Oops" }),
    );
    const { result } = setup();
    await ask(result, "One");
    const id = lastAnswer(result.current.messages).id;
    fetchMock.mockResolvedValueOnce(
      mentorHttpErrorResponse(429, { error: "daily_limit", message: "Done" }),
    );
    await ask(result, "Two");
    fetchMock.mockClear();

    act(() => result.current.retry(id));
    act(() => result.current.ask({ kind: "lesson", message: "Three" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(3);
  });

  it("falls back when a 502 isn't JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });
    const { result } = setup();
    await ask(result, "Q");

    expect(lastAnswer(result.current.messages).error).toEqual({
      message: "Mentor isn't responding right now. Try again in a minute.",
      retry: true,
    });
  });

  it("sends only finished exchanges as history, at most three, clipped", async () => {
    const long = "x".repeat(2500);
    fetchMock
      .mockImplementationOnce(async () =>
        mentorSseResponse([mentorText(long), mentorDone()]),
      )
      .mockImplementationOnce(async () =>
        mentorSseResponse([mentorError("failed", "No")]),
      );
    const { result } = setup();
    await ask(result, "Q1");
    await ask(result, "Q2 fails");
    for (const q of ["Q3", "Q4", "Q5"]) {
      answers([mentorText(`A ${q} [p1]`), mentorDone()]);
      await ask(result, q);
    }
    answers();
    await ask(result, "Q6");

    expect(bodyOf(2).history).toHaveLength(2);
    expect(bodyOf(2).history[1].text).toHaveLength(2000);
    const history = bodyOf(5).history;
    expect(history.map((t: { role: string }) => t.role)).toEqual([
      "student",
      "mentor",
      "student",
      "mentor",
      "student",
      "mentor",
    ]);
    expect(history.map((t: { text: string }) => t.text)).toEqual([
      "Q3",
      "A Q3",
      "Q4",
      "A Q4",
      "Q5",
      "A Q5",
    ]);
  });

  it("ignores ask while streaming", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      mentorSseResponse([mentorText("a"), mentorDone()], {
        delayMs: 5,
        signal: init.signal,
      }),
    );
    const { result } = setup();
    act(() => result.current.ask({ kind: "lesson", message: "one" }));
    act(() => result.current.ask({ kind: "lesson", message: "two" }));
    await waitFor(() => expect(result.current.streaming).toBe(false));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.messages).toHaveLength(2);
  });

  it("retry re-asks the same question in place", async () => {
    fetchMock.mockResolvedValueOnce(
      mentorHttpErrorResponse(500, { error: "internal", message: "Oops" }),
    );
    const { result } = setup();
    await ask(result, "Why?");
    answers([mentorText("Because"), mentorDone()]);
    const id = lastAnswer(result.current.messages).id;
    act(() => result.current.retry(id));
    await waitFor(() => expect(result.current.streaming).toBe(false));

    expect(result.current.messages).toHaveLength(2);
    expect(lastAnswer(result.current.messages)).toMatchObject({
      id,
      status: "done",
      text: "Because",
    });
    expect(bodyOf(1).message).toBe("Why?");
  });

  it("aborts the request when unmounted", async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(async (_url, init) => {
      signal = init.signal;
      return mentorSseResponse([mentorText("a"), mentorDone()], {
        delayMs: 20,
        signal,
      });
    });
    const { result, unmount } = setup();
    act(() => result.current.ask({ kind: "lesson", message: "Q" }));
    await waitFor(() => expect(signal).toBeDefined());
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
