/** @jest-environment node */
import fs from "fs";
import os from "os";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { appendJsonl, readJsonl } from "@/scripts/mentor/lib/files";
import type {
  ErrorRow,
  ResultRow,
  RunMeta,
} from "@/scripts/mentor/lib/metrics";
import {
  cannedGroups,
  pilotCases,
  planGroups,
  SETUPS,
  type SetupName,
} from "@/scripts/mentor/lib/plan";
import {
  ERRORS,
  pending,
  RESULTS,
  resumeProblems,
  runGroups,
} from "@/scripts/mentor/lib/run";
import {
  caseById,
  EVAL_CASES,
  mentorFixtures,
} from "@/testing/mocks/mentorEvalMock";

const fixtures = mentorFixtures();
const usage = { input_tokens: 150, output_tokens: 300 } as Anthropic.Usage;

/** Mentor's answer, or what the judge says */
const message = (o: Partial<Anthropic.Message> = {}) =>
  ({
    model: "claude-haiku-5-5-20261001",
    stop_reason: "end_turn",
    content: [{ type: "text", text: "Keys matter [p3]. Why might that be?" }],
    usage,
    ...o,
  }) as Anthropic.Message;

/** The judge, answering no to every question it's asked */
const judge = jest.fn(
  async (params: Anthropic.MessageCreateParamsNonStreaming) => {
    const asked = params.output_config!.format!.schema.required as string[];
    return message({
      model: "claude-sonnet-5-5-20261001",
      content: [
        {
          type: "text",
          text: JSON.stringify(
            Object.fromEntries(
              asked.map((q) => [q, { quote: "", answer: "no" }]),
            ),
          ),
          citations: null,
        },
      ],
    });
  },
);

/**
 * Mentor's streams, answering in turn from `answers` (then with a plain
 * reply); "hang" waits for the request to be aborted. Each call logs when it
 * starts and ends, and later calls end sooner, so calls that overlap show.
 */
function client(...answers: (Anthropic.Message | Error | "hang")[]) {
  const events: string[] = [];
  const stream = jest.fn(
    (
      params: Anthropic.MessageCreateParamsNonStreaming,
      { signal }: { signal: AbortSignal },
    ) => {
      const lesson = lessonOf(params);
      const delay = Math.max(0, 20 - 2 * stream.mock.calls.length);
      events.push(`start ${lesson}`);
      const answer = answers.shift() ?? message();
      const onText: (() => void)[] = [];
      const s = {
        on: (event: string, f: () => void) => {
          if (event === "text") onText.push(f);
          return s;
        },
        finalMessage: async () => {
          if (answer === "hang")
            await new Promise((_, reject) =>
              signal.addEventListener("abort", () =>
                reject(new Anthropic.APIUserAbortError()),
              ),
            );
          await new Promise((done) => setTimeout(done, delay));
          events.push(`end ${lesson}`);
          if (answer instanceof Error) throw answer;
          onText.forEach((f) => f());
          return answer as Anthropic.Message;
        },
      };
      return s;
    },
  );
  return {
    stream,
    events,
    fake: { messages: { stream, create: judge } } as unknown as Anthropic,
  };
}

let dir: string;
const rows = () => readJsonl<ResultRow>(path.join(dir, RESULTS));
const errors = () => readJsonl<ErrorRow>(path.join(dir, ERRORS));
const lessonOf = (params: Anthropic.MessageCreateParamsNonStreaming) =>
  JSON.stringify(params.messages[0]).includes("Lesson: Indexes") ? 102 : 101;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "mentor-eval-"));
});
afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("planGroups", () => {
  it("builds every request with one cache breakpoint, on the lesson", () => {
    const setups = Object.keys(SETUPS) as SetupName[];
    const groups = planGroups(EVAL_CASES, fixtures, setups, 2);
    // A group per setup, rep and lesson
    expect(groups).toHaveLength(4 * 2 * 2);
    for (const { params, setup } of groups.flat()) {
      const cached = params!.messages.flatMap((m, i) =>
        typeof m.content === "string"
          ? []
          : m.content.flatMap((b, j) =>
              "cache_control" in b && b.cache_control ? [[i, j]] : [],
            ),
      );
      expect(cached).toEqual([[0, 0]]);
      expect(params).toMatchObject({
        model: SETUPS[setup as SetupName].model,
        output_config: { effort: SETUPS[setup as SetupName].effort },
      });
    }
  });
});

describe("pilotCases", () => {
  it("takes the first case of each kind in each format", () => {
    const again = { ...caseById("covered-01"), id: "covered-01-again" };
    const cases = [
      caseById("covered-01"),
      again,
      caseById("covered-explain-01"),
    ];
    expect(pilotCases(cases).map((c) => c.id)).toEqual([
      "covered-01",
      "covered-explain-01",
    ]);
  });
});

describe("runGroups", () => {
  const one = (id: string) =>
    planGroups([caseById(id)], fixtures, ["haiku-low"], 1);

  it("runs each group's requests one after another, and writes a graded row for each", async () => {
    const { events, fake } = client();
    await runGroups(
      fake,
      planGroups(EVAL_CASES, fixtures, ["haiku-low"], 1),
      dir,
    );
    for (const lesson of [101, 102]) {
      const inFile = EVAL_CASES.filter((c) => c.lessonId === lesson).map(
        (c) => c.id,
      );
      const written = rows().filter((r) => r.lessonId === lesson);
      expect(written.map((r) => [r.caseId, r.seq])).toEqual(
        inFile.map((id, i) => [id, i]),
      );
      expect(events.filter((e) => e.endsWith(` ${lesson}`))).toEqual(
        inFile.flatMap(() => [`start ${lesson}`, `end ${lesson}`]),
      );
    }
    expect(rows().find((r) => r.caseId === "uncovered-01")).toMatchObject({
      status: "ok",
      model: "claude-haiku-5-5",
      grade: expect.objectContaining({ cited: ["p3"], asksBack: true }),
      judge: expect.objectContaining({
        answers: { made_up: { quote: "", answer: "no" } },
      }),
    });
    expect(errors()).toEqual([]);
  });

  it.each<
    [string, Anthropic.Message | Error | "hang", object | null, object | null]
  >([
    [
      "an API error",
      new Anthropic.APIError(529, undefined, "Overloaded", new Headers()),
      { class: "api_error" },
      null,
    ],
    [
      "another SDK error",
      new Anthropic.AnthropicError("stream ended"),
      { class: "api_error" },
      null,
    ],
    ["a timeout", "hang", { class: "timeout" }, null],
    [
      "another model serving it",
      message({ model: "claude-haiku-4-5-20251001" }),
      { class: "model_mismatch", usage },
      null,
    ],
    [
      "a refusal",
      message({ stop_reason: "refusal" }),
      null,
      { status: "refused", grade: expect.objectContaining({ pass: false }) },
    ],
    [
      "a cut-off answer",
      message({ stop_reason: "max_tokens" }),
      null,
      { status: "truncated", grade: expect.objectContaining({ pass: null }) },
    ],
    [
      "no text",
      message({ content: [] }),
      null,
      { status: "empty", judge: null },
    ],
  ])("records %s", async (_, answer, error, row) => {
    await runGroups(client(answer).fake, one("covered-01"), dir, 50);
    expect(errors()).toEqual(error ? [expect.objectContaining(error)] : []);
    expect(rows()).toEqual(row ? [expect.objectContaining(row)] : []);
  });

  it("rethrows an error that isn't the SDK's", async () => {
    await expect(
      runGroups(client(new TypeError("a bug")).fake, one("covered-01"), dir),
    ).rejects.toThrow("a bug");
  });

  it.each([
    [
      "a refusal",
      message({ model: "claude-sonnet-5-5", stop_reason: "refusal" }),
    ],
    ["another model", message({ model: "claude-haiku-5-5" })],
  ])(
    "keeps the reply when the judge gives %s, and judges it again on resume",
    async (_, failure) => {
      judge.mockResolvedValueOnce(failure);
      await runGroups(client().fake, one("uncovered-01"), dir);
      expect(errors()).toEqual([
        expect.objectContaining({
          class: "judge_error",
          reply: "Keys matter [p3]. Why might that be?",
          answer: expect.objectContaining({ status: "ok", usage }),
        }),
      ]);
      expect(rows()).toEqual([]);

      const { stream, fake } = client();
      await runGroups(fake, pending(one("uncovered-01"), dir), dir);
      expect(stream).not.toHaveBeenCalled();
      expect(rows()).toEqual([
        expect.objectContaining({
          reply: "Keys matter [p3]. Why might that be?",
          usage,
          model: "claude-haiku-5-5",
        }),
      ]);
    },
  );

  it("skips the rows a resumed run already wrote", async () => {
    const groups = planGroups(EVAL_CASES, fixtures, ["haiku-low"], 1);
    appendJsonl(path.join(dir, RESULTS), {
      setup: "haiku-low",
      caseId: "covered-01",
      rep: 1,
    });
    const { stream, fake } = client();
    await runGroups(fake, pending(groups, dir), dir);
    expect(stream).toHaveBeenCalledTimes(EVAL_CASES.length - 1);
    expect(rows().filter((r) => r.caseId === "covered-01")).toHaveLength(1);
  });

  it("sends canned replies to the judge alone, and only where it has questions", async () => {
    const { stream, fake } = client();
    await runGroups(fake, cannedGroups(EVAL_CASES, fixtures, "oracle"), dir);
    expect(stream).not.toHaveBeenCalled();
    expect(judge).toHaveBeenCalledTimes(
      EVAL_CASES.filter((c) => c.kind !== "covered").length,
    );
    expect(rows().every((r) => r.setup === "answers-oracle" && !r.model)).toBe(
      true,
    );
  });
});

describe("resumeProblems", () => {
  const then = {
    casesSha: "abc",
    learnersSha: null as string | null,
    promptVersion: "p1",
    judgeVersion: "j1",
    fixtures: [{ slug: "databases-101", takenAt: "2026-11-05" }],
  };
  it.each<[string, Partial<typeof then>, string[]]>([
    ["nothing", {}, []],
    ["the cases", { casesSha: "def" }, ["cases.jsonl"]],
    ["the learner profiles", { learnersSha: "x" }, ["the learner profiles"]],
    ["the prompt", { promptVersion: "p2" }, ["MENTOR_PROMPT_VERSION"]],
    ["the judge", { judgeVersion: "j2" }, ["JUDGE_VERSION"]],
    [
      "a fixture retaken",
      { fixtures: [{ slug: "databases-101", takenAt: "2026-11-06" }] },
      ["the fixtures"],
    ],
  ])("finds %s changed", (_, change, expected) => {
    expect(resumeProblems(then as RunMeta, { ...then, ...change })).toEqual(
      expected,
    );
  });
});
