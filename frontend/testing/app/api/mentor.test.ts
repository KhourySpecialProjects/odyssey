/** @jest-environment node */
import { after } from "next/server";
import { POST } from "@/app/api/mentor/route";
import { requireRole } from "@/lib/auth/require-role";
import { blockNoteIdToNumber } from "@/lib/blocknote/convert-blocks";
import { mentorClient } from "@/lib/mentor/client";
import { readMentorEvents, type MentorHttpError } from "@/lib/mentor/events";
import { MENTOR_SETUP } from "@/lib/mentor/prompt";
import { getMentorSource, type MentorSource } from "@/lib/mentor/source";
import { SSE_HEADERS } from "@/lib/mentor/sse";
import type { MentorLesson } from "@/lib/mentor/types";
import {
  checkMentorAllowance,
  recordMentorUsage,
  type MentorAllowance,
} from "@/lib/mentor/usage";
import { fakeClaude } from "@/testing/mocks/claudeStreamMock";
import {
  mentorText,
  readAllMentorEvents,
} from "@/testing/mocks/mentorEventsMock";
import {
  blockNoteLesson,
  classicLesson,
  mentorDroplet,
} from "@/testing/mocks/mentorLessonMock";

jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/mentor/source", () => ({ getMentorSource: jest.fn() }));
jest.mock("@/lib/mentor/client", () => ({ mentorClient: jest.fn() }));
jest.mock("@/lib/mentor/usage", () => ({
  checkMentorAllowance: jest.fn(),
  recordMentorUsage: jest.fn(),
}));

const gate = jest.mocked(requireRole);
const source = jest.mocked(getMentorSource);
const allowance = jest.mocked(checkMentorAllowance);
const record = jest.mocked(recordMentorUsage);

const user = { id: 7, email: "s@example.invalid", roles: [] };
const lesson = classicLesson();
const MC = blockNoteIdToNumber("mc-1");
/** What a forged request adds: lesson text and answers, which are ignored */
const FORGED = {
  lesson: { name: "Forged" },
  blocks: [{ __component: "droplets.generic", content: "INJECTED-LESSON" }],
  isCorrect: true,
  correctAnswer: "SENTINEL-X",
};

const sourceOf = (
  l: MentorLesson = lesson,
  droplet: Partial<MentorSource["droplet"]> = {},
): MentorSource => ({
  droplet: {
    ...mentorDroplet,
    status: "published",
    isHidden: false,
    lessons: [{ id: l.id }],
    ...droplet,
  },
  lesson: l,
});

const ask = (over: Record<string, unknown> = {}) => ({
  kind: "lesson",
  message: "What does an index do?",
  dropletId: 5,
  lessonId: lesson.id,
  ...over,
});
const hint = (questionId: number, pick: number, lessonId = lesson.id) =>
  ask({
    kind: "quiz-hint",
    message: undefined,
    questionId,
    answerIds: [pick],
    lessonId,
  });

/** A request with the few fields the route reads; jest.setup.ts stubs Request */
function post(body: unknown, signal = new AbortController().signal) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return POST({
    headers: new Headers({ "content-length": `${Buffer.byteLength(text)}` }),
    text: async () => text,
    signal,
  } as unknown as Request);
}

let claude: ReturnType<typeof fakeClaude>;
let tasks: (() => Promise<unknown>)[] = [];
/** Runs what the route left for after the response */
const afterResponse = () => Promise.all(tasks.map((task) => task()));

function useClaude(script: Parameters<typeof fakeClaude>[0] = {}) {
  claude = fakeClaude(script);
  jest.mocked(mentorClient).mockReturnValue(claude.client);
}

beforeEach(() => {
  jest.clearAllMocks();
  tasks = [];
  jest.mocked(after).mockImplementation((task) => {
    tasks.push(task as () => Promise<unknown>);
  });
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  gate.mockResolvedValue({ ok: true, user });
  source.mockResolvedValue(sourceOf());
  allowance.mockResolvedValue({ allowed: true });
  record.mockResolvedValue(true);
  useClaude();
});

describe("POST /api/mentor", () => {
  it.each<[string, () => void, unknown, number, string]>([
    [
      "signed out",
      () => gate.mockResolvedValue({ ok: false, error: "unauthenticated" }),
      ask(),
      401,
      "unauthenticated",
    ],
    [
      "a body over 64 KB",
      () => {},
      ask({ message: "x".repeat(70_000) }),
      413,
      "too_large",
    ],
    ["a body that isn't JSON", () => {}, "{nope", 400, "invalid_request"],
    [
      "7 history turns",
      () => {},
      ask({
        history: Array.from({ length: 7 }, (_, i) => ({
          role: i % 2 ? "mentor" : "student",
          text: "turn",
        })),
      }),
      400,
      "invalid_request",
    ],
    [
      "a documentId",
      () => {},
      ask({ dropletId: "abc123" }),
      400,
      "invalid_request",
    ],
    [
      "an unknown droplet",
      () => source.mockResolvedValue(null),
      ask(),
      404,
      "not_found",
    ],
    [
      "a lesson not in the droplet",
      () =>
        source.mockResolvedValue({
          ...sourceOf(lesson, { lessons: [] }),
          lesson: null,
        }),
      ask(),
      404,
      "not_found",
    ],
    [
      "a draft",
      () => source.mockResolvedValue(sourceOf(lesson, { status: "draft" })),
      ask(),
      403,
      "forbidden",
    ],
    [
      "a droplet in edit",
      () => source.mockResolvedValue(sourceOf(lesson, { status: "edit" })),
      ask(),
      403,
      "forbidden",
    ],
    [
      "a hidden droplet",
      () => source.mockResolvedValue(sourceOf(lesson, { isHidden: true })),
      ask(),
      403,
      "forbidden",
    ],
    ["a yes/no hint", () => {}, hint(42, 421), 400, "cannot_answer"],
    ["a hint on the right pick", () => {}, hint(41, 411), 400, "cannot_answer"],
    [
      "a hint on a question with two right answers",
      () => {},
      hint(43, 433),
      400,
      "cannot_answer",
    ],
    [
      "a selection that isn't in the lesson",
      () => {},
      ask({
        kind: "explain",
        message: undefined,
        selection: "NOT-IN-THE-LESSON",
      }),
      400,
      "cannot_answer",
    ],
    [
      "a Strapi failure",
      () => source.mockRejectedValue(new Error("down")),
      ask(),
      500,
      "internal",
    ],
  ])(
    "refuses %s before any check or model call",
    async (_, arrange, body, status, error) => {
      arrange();
      const response = await post(body);
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ error });
      expect(allowance).not.toHaveBeenCalled();
      expect(claude.calls).toHaveLength(0);
      expect(after).not.toHaveBeenCalled();
    },
  );

  type Reason = Exclude<MentorAllowance, { allowed: true }>["reason"];
  it.each<[Reason, 429 | 503, boolean]>([
    ["daily_limit", 429, true],
    ["rate_limited", 429, true],
    ["monthly_cap", 503, true],
    ["disabled", 503, false],
    ["not_in_pilot", 503, false],
    ["unavailable", 503, false],
  ])(
    "passes on ODY-884's %s without calling Claude",
    async (reason, status, retries) => {
      const retryAt = retries
        ? new Date(Date.now() + 90_500).toISOString()
        : null;
      const message = `ODY-884 says ${reason}.`;
      allowance.mockResolvedValue({
        allowed: false,
        reason,
        status,
        message,
        retryAt,
      });
      const response = await post(ask());
      expect(response.status).toBe(status);
      expect(response.headers.get("Retry-After")).toBe(retries ? "91" : null);
      expect(await response.json()).toEqual({
        error: reason,
        message,
        retryAt,
      } satisfies MentorHttpError);
      expect(allowance).toHaveBeenCalledWith(user);
      expect(claude.calls).toHaveLength(0);
    },
  );

  it("gives a 502, with no usage row, when Claude fails before answering", async () => {
    useClaude({ status: 500 });
    const response = await post(ask());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: "model_unavailable" });
    expect(after).not.toHaveBeenCalled();
  });

  it("streams the answer, then records what it used", async () => {
    const response = await post({ ...ask(), ...FORGED });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      SSE_HEADERS["Content-Type"],
    );
    expect(await readAllMentorEvents(response.body!)).toEqual([
      mentorText("An index "),
      mentorText("speeds up reads [p2]."),
      expect.objectContaining({ type: "done" }),
    ]);
    // Lesson text sent by the browser never reaches Claude
    expect(claude.calls[0].body).not.toContain("INJECTED-LESSON");
    await afterResponse();
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith({
      user,
      kind: "lesson",
      model: MENTOR_SETUP.model,
      usage: {
        input_tokens: 40,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 900,
        output_tokens: 30,
      },
    });
  });

  it.each([
    ["Classic", lesson, classicLesson({ mc: 412 }), 41, 413],
    ["BlockNote", blockNoteLesson(), blockNoteLesson({ mc: 1 }), MC, 1302],
  ])(
    "%s: a hint sends Claude no answer, whichever option is right",
    async (_, original, flipped, questionId, pick) => {
      const sent = async (l: MentorLesson) => {
        source.mockResolvedValue(sourceOf(l));
        useClaude();
        const response = await post({
          ...hint(questionId, pick, l.id),
          ...FORGED,
        });
        expect(response.status).toBe(200);
        await readAllMentorEvents(response.body!);
        return claude.calls[0].body;
      };
      const body = await sent(original);
      expect(body).not.toMatch(
        /isCorrect|correctAnswer|\(correct\)|SENTINEL|INJECTED/,
      );
      expect(await sent(flipped)).toBe(body);
    },
  );

  it("stops Claude when the student does, and records only what streamed", async () => {
    useClaude({ hang: true });
    const student = new AbortController();
    const response = await post(ask(), student.signal);
    const events = readMentorEvents(response.body!);
    await events.next();
    await events.next();
    student.abort();
    await afterResponse();
    expect(claude.calls[0].signal.aborted).toBe(true);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        usage: expect.objectContaining({ output_tokens: 8 }),
      }),
    );
  });
});
