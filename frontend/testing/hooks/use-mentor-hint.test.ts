import { act, renderHook, waitFor } from "@testing-library/react";
import { useMentorHint } from "@/hooks/use-mentor-hint";
import {
  mentorCitation,
  mentorDone,
  mentorError,
  mentorHttpErrorResponse,
  mentorSseResponse,
  mentorText,
} from "@/testing/mocks/mentorEventsMock";
import type { MentorEvent } from "@/lib/mentor/events";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const setup = () =>
  renderHook(() => useMentorHint({ dropletId: 3, lessonId: 9 }));
const answers = (
  events: MentorEvent[] = [mentorText("Look at the join. [p2]"), mentorDone()],
) => fetchMock.mockImplementation(async () => mentorSseResponse(events));
const settled = (result: ReturnType<typeof setup>["result"]) =>
  waitFor(() => expect(result.current.hint?.status).not.toBe("streaming"));

describe("useMentorHint", () => {
  it("streams text, then finishes with citations", async () => {
    const citations = [mentorCitation()];
    answers([
      mentorText("Look at "),
      mentorText("the join. [p2]"),
      mentorDone({ citations, truncated: true }),
    ]);
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    expect(result.current.hint).toMatchObject({
      status: "streaming",
      text: "",
    });
    await settled(result);
    expect(result.current.hint).toMatchObject({
      status: "done",
      text: "Look at the join. [p2]",
      citations,
      truncated: true,
    });
  });

  it("posts exactly the five keys", async () => {
    answers();
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    await settled(result);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/mentor");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      kind: "quiz-hint",
      dropletId: 3,
      lessonId: 9,
      questionId: 41,
      answerIds: [412],
    });
  });

  it("ignores a second explain while streaming", async () => {
    answers();
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
      void result.current.explain(41, [411]);
    });
    await settled(result);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives a no-retry error for a daily limit", async () => {
    fetchMock.mockResolvedValue(
      mentorHttpErrorResponse(429, {
        error: "daily_limit",
        message: "You're out of Mentor questions today.",
      }),
    );
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    await settled(result);
    expect(result.current.hint).toMatchObject({
      status: "error",
      error: { message: "You're out of Mentor questions today.", retry: false },
    });
  });

  it("offers a retry for a 500", async () => {
    fetchMock.mockResolvedValue(
      mentorHttpErrorResponse(500, {
        error: "failed",
        message: "Mentor hit a snag.",
      } as never),
    );
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    await settled(result);
    expect(result.current.hint?.error).toEqual({
      message: "Mentor hit a snag.",
      retry: true,
    });
  });

  it("discards text when the stream sends an error event", async () => {
    answers([mentorText("Partial"), mentorError()]);
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    await settled(result);
    expect(result.current.hint).toMatchObject({
      status: "error",
      text: "",
      error: { retry: true },
    });
  });

  it("shows a broke-off error when the connection drops", async () => {
    fetchMock.mockImplementation(async () =>
      mentorSseResponse([mentorText("a"), mentorDone()], { dropAfter: 1 }),
    );
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    await settled(result);
    expect(result.current.hint?.error).toEqual({
      message: "The answer broke off. Try again.",
      retry: true,
    });
  });

  it("clear aborts a stream in flight and empties the hint", async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(async (_url, init) => {
      signal = init.signal;
      return mentorSseResponse([mentorText("a"), mentorDone()], {
        delayMs: 20,
        signal,
      });
    });
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    act(() => result.current.clear());
    expect(signal?.aborted).toBe(true);
    expect(result.current.hint).toBeNull();
    await new Promise((r) => setTimeout(r, 60));
    expect(result.current.hint).toBeNull();
  });

  it("gives each explain a different id", async () => {
    answers();
    const { result } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    await settled(result);
    const first = result.current.hint!.id;
    act(() => result.current.clear());
    act(() => {
      void result.current.explain(41, [412]);
    });
    await settled(result);
    expect(result.current.hint!.id).not.toBe(first);
  });

  it("aborts on unmount", async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(async (_url, init) => {
      signal = init.signal;
      return mentorSseResponse([mentorText("a"), mentorDone()], {
        delayMs: 20,
        signal,
      });
    });
    const { result, unmount } = setup();
    act(() => {
      void result.current.explain(41, [412]);
    });
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
