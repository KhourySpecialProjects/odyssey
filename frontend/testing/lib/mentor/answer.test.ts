/** @jest-environment node */
import {
  MENTOR_STREAM_MESSAGES,
  streamMentorAnswer,
} from "@/lib/mentor/answer";
import { resolveMentorAsk } from "@/lib/mentor/ask";
import { buildLessonContext, citationsFor } from "@/lib/mentor/context";
import {
  MentorStreamError,
  readMentorEvents,
  type MentorEvent,
} from "@/lib/mentor/events";
import { buildMentorRequest } from "@/lib/mentor/prompt";
import {
  fakeClaude,
  type ClaudeScript,
} from "@/testing/mocks/claudeStreamMock";
import {
  mentorDone,
  mentorError,
  mentorText,
  readAllMentorEvents,
} from "@/testing/mocks/mentorEventsMock";
import { classicLesson, mentorDroplet } from "@/testing/mocks/mentorLessonMock";

const lesson = classicLesson();
const context = buildLessonContext(lesson, mentorDroplet);
const resolved = resolveMentorAsk(lesson, context, {
  kind: "lesson",
  message: "What does an index do?",
});
if (!resolved.ok) throw new Error(resolved.error);
const params = buildMentorRequest(context, resolved.ask);
const ANSWER = "An index speeds up reads [p2].";

async function answer(
  script: ClaudeScript = {},
  { signal = new AbortController().signal, timeoutMs = 5_000 } = {},
) {
  const claude = fakeClaude(script);
  const result = await streamMentorAnswer({
    client: claude.client,
    params,
    context,
    signal,
    timeoutMs,
  });
  return { claude, result };
}

const failed = (code: "refused" | "failed") =>
  mentorError(code, MENTOR_STREAM_MESSAGES[code]);

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("streamMentorAnswer", () => {
  it("streams each piece, then done with the citations, and never the thinking", async () => {
    expect(citationsFor(context, ANSWER)).not.toEqual([]);
    const { result } = await answer({ thinking: "THINKING-TEXT" });
    expect(await readAllMentorEvents(result!.response.body!)).toEqual([
      mentorText("An index "),
      mentorText("speeds up reads [p2]."),
      mentorDone({ citations: citationsFor(context, ANSWER) }),
    ]);
    await expect(result!.usage).resolves.toEqual({
      input_tokens: 40,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 900,
      output_tokens: 30,
    });
  });

  it.each<[string, ClaudeScript, MentorEvent]>([
    [
      "at the token limit",
      { stopReason: "max_tokens" },
      mentorDone({ citations: citationsFor(context, ANSWER), truncated: true }),
    ],
    ["on a refusal", { stopReason: "refusal" }, failed("refused")],
    ["on an API error midway", { failMidway: true }, failed("failed")],
    ["with no text", { texts: [] }, failed("failed")],
  ])("ends with one last event %s", async (_, script, last) => {
    const { result } = await answer(script);
    const events = await readAllMentorEvents(result!.response.body!);
    expect(events.at(-1)).toEqual(last);
    expect(events.filter((e) => e.type !== "text")).toHaveLength(1);
    await expect(result!.usage).resolves.toMatchObject({ input_tokens: 40 });
  });

  it("gives null, with nothing billed, when Claude fails before answering", async () => {
    const { claude, result } = await answer({ status: 500 });
    expect(result).toBeNull();
    expect(claude.calls).toHaveLength(1);
  });

  it.each(["the request is aborted", "the body is cancelled"])(
    "stops Claude when %s, and counts only what streamed",
    async (how) => {
      const student = new AbortController();
      const { claude, result } = await answer(
        { hang: true },
        { signal: student.signal },
      );
      const events = readMentorEvents(result!.response.body!);
      await events.next();
      await events.next();
      if (how === "the body is cancelled") {
        await events.return(undefined);
      } else {
        student.abort();
        // The stream closes with no done or error
        await expect(events.next()).rejects.toThrow(MentorStreamError);
      }
      // 30 characters streamed, at about 4 a token
      await expect(result!.usage).resolves.toMatchObject({ output_tokens: 8 });
      expect(claude.calls[0].signal.aborted).toBe(true);
    },
  );

  it("ends with failed when the answer takes too long", async () => {
    const { claude, result } = await answer({ hang: true }, { timeoutMs: 50 });
    const events = await readAllMentorEvents(result!.response.body!);
    expect(events.at(-1)).toEqual(failed("failed"));
    expect(claude.calls[0].signal.aborted).toBe(true);
  });
});
