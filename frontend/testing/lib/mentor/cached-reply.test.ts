/** @jest-environment node */
import type { MentorCompleted } from "@/lib/mentor/answer";
import type { MentorAsk } from "@/lib/mentor/ask";
import { buildLessonContext } from "@/lib/mentor/context";
import {
  hintReply,
  replyHash,
  storeCachedReplyWhenDone,
  summaryReply,
  unstorableReason,
} from "@/lib/mentor/cached-reply";
import { storeCachedReply } from "@/lib/mentor/cached-reply-store";
import {
  buildMentorRequest,
  MENTOR_NOT_COVERED,
  MENTOR_PROMPT_VERSION,
  MENTOR_SETUP,
} from "@/lib/mentor/prompt";
import type { MentorDroplet, MentorLesson } from "@/lib/mentor/types";
import { mentorCitation } from "@/testing/mocks/mentorEventsMock";
import { classicLesson, mentorDroplet } from "@/testing/mocks/mentorLessonMock";

jest.mock("@/lib/mentor/cached-reply-store", () => ({
  storeCachedReply: jest.fn(),
}));

const lesson = classicLesson();
const ids = { dropletId: 5, lessonId: lesson.id };
const ctx = (l: MentorLesson = lesson, d: MentorDroplet = mentorDroplet) =>
  buildLessonContext(l, d);
const context = ctx();

/** The lesson with one edit, by path into its blocks */
function edited(change: (copy: MentorLesson) => void): MentorLesson {
  const copy = structuredClone(lesson);
  change(copy);
  return copy;
}
const hintAsk = (chosen: number): Extract<MentorAsk, { kind: "quiz-hint" }> => {
  const question = {
    questionId: 41,
    question: "What does a LEFT JOIN keep?",
    options: [
      { id: 411, text: "All rows from the left table" },
      { id: 412, text: "Only matching rows" },
      { id: 413, text: "Only unmatched rows" },
    ],
  };
  return { kind: "quiz-hint", question, chosenOptionId: chosen };
};
const hintOf = (c = context, a = hintAsk(412)) => hintReply(c, a, ids);

const completed = (over: Partial<MentorCompleted> = {}): MentorCompleted => ({
  text: "A join combines rows [p2].",
  citations: [mentorCitation()],
  stopReason: "end_turn",
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("summaryReply", () => {
  it("keys the canonical request as lesson:<id>:<hash>, the same every time", () => {
    const reply = summaryReply(context, ids);
    expect(reply.key).toMatch(/^lesson:101:[0-9a-f]{64}$/);
    expect(summaryReply(ctx(), ids).key).toBe(reply.key);
    expect(reply.slot).toBe("lesson:101");
  });

  it.each<[string, () => string]>([
    [
      "a passage's text",
      () =>
        summaryReply(
          ctx(
            edited(
              (l) =>
                ((l.blocks![1] as { content: string }).content =
                  "<p>Keys changed.</p>"),
            ),
          ),
          ids,
        ).key,
    ],
    [
      "the lesson's name",
      () => summaryReply(ctx(edited((l) => (l.name = "Renamed"))), ids).key,
    ],
    [
      "a learning objective",
      () =>
        summaryReply(
          ctx(lesson, {
            ...mentorDroplet,
            learningObjectives: ["Write a join", "Other"],
          }),
          ids,
        ).key,
    ],
    [
      "the droplet's difficulty",
      () =>
        summaryReply(
          ctx(lesson, { ...mentorDroplet, difficulty: "advanced" }),
          ids,
        ).key,
    ],
    [
      "the model",
      () =>
        summaryReply(context, ids, {
          setup: { ...MENTOR_SETUP, model: "claude-sonnet-5-5" },
        }).key,
    ],
    [
      "the effort",
      () =>
        summaryReply(context, ids, {
          setup: { ...MENTOR_SETUP, effort: "high" },
        }).key,
    ],
    [
      "the prompt version",
      () => summaryReply(context, ids, { promptVersion: "other" }).key,
    ],
    [
      "the system prompt",
      () => {
        const { params } = summaryReply(context, ids);
        return `lesson:101:${replyHash({ ...params, system: `${params.system as string}.` })}`;
      },
    ],
  ])("gets a new key when %s changes", (_, keyOf) => {
    expect(keyOf()).not.toBe(summaryReply(context, ids).key);
  });

  it("keeps the slot and changes the key for another droplet's header", () => {
    const other = summaryReply(
      ctx(lesson, { ...mentorDroplet, name: "Other" }),
      ids,
    );
    expect(other.slot).toBe("lesson:101");
    expect(other.key).not.toBe(summaryReply(context, ids).key);
  });

  it("holds no student data", () => {
    const reply = summaryReply(context, ids);
    expect(JSON.stringify(reply.params)).not.toContain("<learner>");
    expect(Object.keys(reply.row).sort()).toEqual([
      "dropletId",
      "key",
      "lessonId",
      "model",
      "promptVersion",
      "scope",
      "slot",
    ]);
    expect(reply.row).toMatchObject({
      scope: "lesson",
      model: MENTOR_SETUP.model,
      promptVersion: MENTOR_PROMPT_VERSION,
    });
  });
});

describe("hintReply", () => {
  it("keys hint:<lesson>:<question>:<answer>:<hash> of the hint request", () => {
    const reply = hintOf();
    expect(reply.key).toMatch(/^hint:101:41:412:[0-9a-f]{64}$/);
    expect(reply.params).toEqual(buildMentorRequest(context, hintAsk(412)));
    expect(reply.row.scope).toBe("hint");
  });

  it("gives another wrong pick its own slot", () => {
    expect(hintOf(context, hintAsk(413)).slot).toBe("hint:101:41:413");
  });

  it.each<[string, (a: ReturnType<typeof hintAsk>) => void]>([
    [
      "the chosen option's text",
      (a) => (a.question.options[1].text = "Edited"),
    ],
    ["another option's text", (a) => (a.question.options[0].text = "Edited")],
    ["the question", (a) => (a.question.question = "Edited?")],
  ])("keeps the slot and changes the key when %s changes", (_, change) => {
    const ask = hintAsk(412);
    change(ask);
    const reply = hintOf(context, ask);
    expect(reply.slot).toBe(hintOf().slot);
    expect(reply.key).not.toBe(hintOf().key);
  });
});

describe("another lesson's context", () => {
  it("makes both builders throw", () => {
    const wrong = { ...ids, lessonId: 999 };
    expect(() => summaryReply(context, wrong)).toThrow();
    expect(() => hintReply(context, hintAsk(412), wrong)).toThrow();
  });
});

describe("unstorableReason", () => {
  it.each<[string, MentorCompleted | null, string | null]>([
    ["a clean answer", completed(), null],
    ["no answer", null, "not finished"],
    [
      "a truncated one",
      completed({ stopReason: "max_tokens" }),
      "stop reason max_tokens",
    ],
    ["no stop reason", completed({ stopReason: null }), "stop reason null"],
    ["no citations", completed({ citations: [] }), "no citations"],
    [
      "not covered",
      completed({ text: `${MENTOR_NOT_COVERED} [p1]` }),
      "not covered",
    ],
    ["a long one", completed({ text: "x".repeat(20001) }), "too long"],
  ])("for %s", (_, input, reason) => {
    expect(unstorableReason(input)).toBe(reason);
  });
});

describe("storeCachedReplyWhenDone", () => {
  const mocked = storeCachedReply as jest.Mock;
  const reply = summaryReply(context, ids);

  it("stores the row plus the text", async () => {
    mocked.mockResolvedValue({ stored: true });
    await storeCachedReplyWhenDone(reply, Promise.resolve(completed()));
    expect(mocked).toHaveBeenCalledWith({
      ...reply.row,
      text: "A join combines rows [p2].",
    });
  });

  it.each([
    ["null", null],
    ["max_tokens", completed({ stopReason: "max_tokens" })],
  ])("stores nothing for a %s completion", async (_, done) => {
    await storeCachedReplyWhenDone(reply, Promise.resolve(done));
    expect(mocked).not.toHaveBeenCalled();
  });

  it("resolves even when the store rejects", async () => {
    mocked.mockRejectedValue(new Error("down"));
    await expect(
      storeCachedReplyWhenDone(reply, Promise.resolve(completed())),
    ).resolves.toBeUndefined();
  });
});
