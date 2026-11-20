/** @jest-environment node */
import {
  REPLAY_CHUNK_WORDS,
  replayCachedReply,
  replayChunks,
} from "@/lib/mentor/cached-reply";
import { buildLessonContext, citationsFor } from "@/lib/mentor/context";
import { readMentorEvents, type MentorEvent } from "@/lib/mentor/events";
import { SSE_HEADERS } from "@/lib/mentor/sse";
import {
  mentorDone,
  mentorText,
  readAllMentorEvents,
} from "@/testing/mocks/mentorEventsMock";
import { classicLesson, mentorDroplet } from "@/testing/mocks/mentorLessonMock";

const context = buildLessonContext(classicLesson(), mentorDroplet);
const words = (n: number) =>
  Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

/** Reads the response in the background, so a test can look at it mid-replay */
function listen(response: Response) {
  const events: MentorEvent[] = [];
  const reader = readMentorEvents(response.body!);
  const done = (async () => {
    try {
      for (let r = await reader.next(); !r.done; r = await reader.next()) {
        events.push(r.value);
      }
    } catch {
      // A stopped replay closes with no done
    }
  })();
  return { events, done };
}
const texts = (events: MentorEvent[]) =>
  events.filter((e) => e.type === "text");

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("replayChunks", () => {
  it.each([
    ["newlines", "One two three four five\nsix seven\n\neight nine"],
    ["a code fence", "Try:\n```sql\nSELECT 1;\n```\nThen stop now please"],
    ["leading spaces", "   indented words here and more words after"],
    ["refs", "A join combines rows [p1] and keys matter [p2]. Done."],
    ["a single word", "Hello"],
  ])("splits %s so the pieces join back to the text", (_, text) => {
    const chunks = replayChunks(text);
    expect(chunks.join("")).toBe(text);
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.trim().split(/\s+/)).toHaveLength(REPLAY_CHUNK_WORDS);
    }
  });
});

describe("replayCachedReply", () => {
  const replay = (text: string, signal = new AbortController().signal) =>
    replayCachedReply({ text, context, signal });

  it("paces 30 chunks 30 ms apart, the first at once", async () => {
    const { response } = replay(words(120));
    const { events } = listen(response);

    await jest.advanceTimersByTimeAsync(0);
    expect(texts(events)).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(869);
    expect(texts(events)).toHaveLength(29);
    expect(events.some((e) => e.type === "done")).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(texts(events)).toHaveLength(30);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("finishes a 2,000-word text by 2 s", async () => {
    const { response } = replay(words(2000));
    const { events } = listen(response);

    await jest.advanceTimersByTimeAsync(2000);
    expect(texts(events)).toHaveLength(500);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("sends the chunks in order, then one done with the current citations", async () => {
    const text = "An index speeds up reads [p2]. It helps a lot.";
    const answer = replay(text);
    const events = readAllMentorEvents(answer.response.body!);
    await jest.advanceTimersByTimeAsync(2000);

    expect(await events).toEqual([
      ...replayChunks(text).map(mentorText),
      mentorDone({ citations: citationsFor(context, text) }),
    ]);
    expect(Object.fromEntries(answer.response.headers)).toEqual(
      Object.fromEntries(new Headers(SSE_HEADERS)),
    );
    await expect(answer.usage).resolves.toBeNull();
    await expect(answer.completed).resolves.toEqual({
      text,
      citations: citationsFor(context, text),
      stopReason: "end_turn",
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    ["the signal aborts after 3 chunks", 60, 3],
    ["it starts aborted", 0, 0],
  ])("stops with no done when %s", async (_, wait, sent) => {
    const student = new AbortController();
    if (!wait) student.abort();
    const answer = replay(words(120), student.signal);
    const { events, done } = listen(answer.response);

    if (wait) {
      await jest.advanceTimersByTimeAsync(wait);
      expect(texts(events)).toHaveLength(sent);
      student.abort();
    }
    await jest.advanceTimersByTimeAsync(2000);
    await done;

    expect(texts(events)).toHaveLength(sent);
    expect(events.some((e) => e.type === "done")).toBe(false);
    await expect(answer.completed).resolves.toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stops when the body is cancelled", async () => {
    const answer = replay(words(120));
    await jest.advanceTimersByTimeAsync(60);

    await answer.response.body!.cancel();

    await expect(answer.completed).resolves.toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });
});
