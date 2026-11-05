import type Anthropic from "@anthropic-ai/sdk";
import {
  answersFor,
  blended,
  chosenSetup,
  costs,
  keyOf,
  reportMarkdown,
  summarise,
  type ErrorRow,
  type ResultRow,
  type RunMeta,
} from "@/scripts/mentor/lib/metrics";

const usage = (input: number, write: number, output: number) =>
  ({
    input_tokens: input,
    cache_creation_input_tokens: write,
    cache_read_input_tokens: 0,
    output_tokens: output,
  }) as Anthropic.Usage;

const sonnet = usage(150, 8000, 300);

/** A row that passed; override what a test needs */
const row = (
  o: Partial<ResultRow> & { pass?: boolean | null; leak?: boolean },
): ResultRow => {
  const { pass = true, leak = null, ...rest } = o;
  return {
    setup: "haiku-low",
    rep: 1,
    caseId: "case",
    kind: "covered",
    mode: "lesson",
    format: "classic",
    fixture: "databases-101",
    lessonId: 101,
    seq: 0,
    model: "claude-haiku-5-5",
    servedModel: "claude-haiku-5-5-20261001",
    stopReason: "end_turn",
    status: "ok",
    reply: "A join combines rows [p2].",
    usage: sonnet,
    costUsd: 0.001,
    costs: costs(sonnet, "claude-haiku-5-5"),
    firstTextMs: 400,
    totalMs: 2000,
    grade: {
      cited: ["p2"],
      invalid: [],
      words: 4,
      goldHit: !!pass,
      notCovered: false,
      canary: false,
      mentionsCorrect: false,
      asksBack: true,
      leak,
      pass,
      checkByHand: [],
    },
    judge: null,
    ...rest,
  };
};

/** `covered` cases with `passes` passing, and one passing case of each other kind */
const setupRows = (passes = 17, setup = "haiku-low", covered = 18) => [
  ...Array.from({ length: covered }, (_, i) =>
    row({ setup, caseId: `covered-${i}`, pass: i < passes }),
  ),
  row({ setup, caseId: "uncovered", kind: "uncovered" }),
  row({ setup, caseId: "off-topic", kind: "off-topic" }),
  row({ setup, caseId: "hint", kind: "wrong-pick", leak: false, pass: null }),
];

const error = (caseId: string, o: Partial<ErrorRow> = {}): ErrorRow => ({
  setup: "haiku-low",
  caseId,
  rep: 1,
  class: "api_error",
  detail: "529 overloaded",
  ...o,
});
/** Each row and error once: the cases × reps the run asked for */
const asked = (rows: ResultRow[], errors: ErrorRow[]) =>
  new Set([...rows, ...errors].map(keyOf)).size;

describe("costs", () => {
  it.each([
    ["a cache write", sonnet, { miss: 0.0233, hit: 0.0049, noCache: 0.0193 }],
    [
      "no prefix to cache",
      usage(8150, 0, 300),
      { miss: 0.0193, hit: 0.0193, noCache: 0.0193 },
    ],
  ])("prices %s three ways", (_, u, expected) => {
    const priced = costs(
      { ...u, cache_read_input_tokens: null },
      "claude-sonnet-5-5",
    );
    for (const [k, v] of Object.entries(expected))
      expect(priced[k as keyof typeof priced]).toBeCloseTo(v, 6);
  });

  it("blends at a hit rate, and divides a cap by it", () => {
    const cost = blended(costs(sonnet, "claude-sonnet-5-5"), 0.5);
    expect(cost).toBeCloseTo(0.0141, 6);
    expect(answersFor(10, cost)).toBe(709);
  });
});

describe("summarise", () => {
  it.each<[string, ResultRow[], ErrorRow[], number, object]>([
    ["17 of 18 (94%) is a pass", setupRows(17), [], 0, { meetsAll: true }],
    ["16 of 18 (89%) is a fail", setupRows(16), [], 0, { meetsAll: false }],
    [
      "9 of 10 (exactly 90%) is a pass",
      setupRows(9, "haiku-low", 10),
      [],
      0,
      { meetsAll: true },
    ],
    [
      "one leak fails the setup",
      [
        ...setupRows(),
        row({ caseId: "x", kind: "extraction", leak: true, pass: null }),
      ],
      [],
      0,
      { meetsAll: false, leaks: 1, named: 0 },
    ],
    [
      "a truncated row is left out of the rate, but blocks the choice",
      [...setupRows(), row({ caseId: "cut", status: "truncated", pass: null })],
      [],
      0,
      {
        meetsAll: false,
        blockers: ["1 truncated"],
        Citation: { pass: 17, n: 18 },
      },
    ],
    [
      "a refused row is a fail",
      [...setupRows(), row({ caseId: "no", status: "refused", pass: false })],
      [],
      0,
      { meetsAll: false, Citation: { pass: 17, n: 19 } },
    ],
    [
      "an error is no fail, but leaves the setup incomplete",
      setupRows(),
      [error("lost")],
      0,
      {
        meetsAll: false,
        blockers: ["1 open errors"],
        errors: { api_error: 1 },
        Citation: { pass: 17, n: 18 },
      },
    ],
    [
      "an error a resumed row replaced still shows, but blocks nothing",
      [...setupRows(), row({ caseId: "lost" })],
      [error("lost")],
      0,
      { meetsAll: true, blockers: [], errors: { api_error: 1 } },
    ],
    [
      "rows missing without an error",
      setupRows(),
      [],
      2,
      { meetsAll: false, blockers: ["2 rows missing"] },
    ],
  ])("%s", (_, rows, errors, missing, expected) => {
    expect(summarise(rows, errors, asked(rows, errors) + missing)).toEqual([
      expect.objectContaining(expected),
    ]);
  });

  it("chooses the cheapest setup that meets every threshold", () => {
    const pricey = setupRows(17, "sonnet-low").map((r) => ({
      ...r,
      costs: costs(sonnet, "claude-sonnet-5-5"),
    }));
    const leaky = [
      ...setupRows(17, "haiku-low"),
      row({ caseId: "x", kind: "extraction", leak: true, pass: null }),
    ];
    const choose = (rows: ResultRow[]) =>
      chosenSetup(summarise(rows, [], 21))?.setup;
    expect(choose([...leaky, ...pricey])).toBe("sonnet-low");
    expect(choose([...setupRows(), ...pricey])).toBe("haiku-low");
  });
});

describe("reportMarkdown", () => {
  const meta: RunMeta = {
    promptVersion: "2026-11-05.1",
    judgeVersion: "2026-11-05.1",
    judge: { model: "claude-sonnet-5-5", effort: "medium" },
    casesSha: "abc123",
    fixtures: [{ slug: "databases-101", takenAt: "2026-11-05T00:00:00Z" }],
    setups: ["haiku-low"],
    reps: 1,
    pilot: true,
    answers: null,
    cases: 23,
    fullRun: { cases: 60, reps: 2 },
    startedAt: "2026-11-05T12:00:00Z",
  };
  const leak = row({
    caseId: "leaky",
    kind: "extraction",
    leak: true,
    pass: null,
    reply: "It's the left table's rows.",
    judge: {
      answers: {
        gives_answer: { quote: "It's the left table's rows.", answer: "yes" },
      },
      badQuotes: [],
      usage: sonnet,
      costUsd: 0.01,
    },
  });
  const unjudged = error("unjudged", {
    class: "judge_error",
    detail: "the judge stopped: refusal",
    reply: "A reply the judge refused.",
  });

  it("names the judge, the choice, what to check by hand, and Brady's agreement", () => {
    const report = reportMarkdown([...setupRows(18), leak], [unjudged], meta, [
      {
        setup: "haiku-low",
        caseId: "leaky",
        rep: 1,
        writer: "claude-haiku-5-5",
        labels: { gives_answer: "yes", rules_out: null },
      },
    ]);
    for (const text of [
      "Judge: claude-sonnet-5-5 at medium, also a model under test. Code decides citations",
      "| haiku-low | 1 (1 / 0) [1] | 100% (18/18) [100%] | 100% (1/1) [100%] | 100% (1/1) [100%] | 100% (18/18) | 1 judge_error | no: 1 open errors |",
      "Cheapest setup that meets every threshold: none.",
      "- Citation: ±24% over 18 cases",
      "### haiku-low, leaky, rep 1: leak",
      "### haiku-low, unjudged, rep 1: not judged (the judge stopped: refusal)",
      "A reply the judge refused.",
      "| claude-haiku-5-5, gives_answer | 1 | 100% |",
      "## Projected full run",
    ])
      expect(report).toContain(text);
  });
});
