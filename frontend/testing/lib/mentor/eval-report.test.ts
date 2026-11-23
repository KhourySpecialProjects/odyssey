import type Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import os from "os";
import path from "path";
import { loadHandChecks } from "@/scripts/mentor/lib/files";
import {
  answersFor,
  blended,
  chosenSetup,
  costs,
  keyOf,
  reportMarkdown,
  summarise,
  type ContrastRow,
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
      links: 0,
      linkProblems: [],
      unlinked: [],
      metaTalk: [],
      leak,
      pass,
      verdict: null,
      inventsHistory: null,
      recitesHistory: null,
      namesPrerequisite: null,
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

/** A row with a learner block, with changes to its grade */
const learned = (
  o: Parameters<typeof row>[0],
  grade: Partial<ResultRow["grade"]> = {},
): ResultRow => {
  const r = row({ learner: "broad-history", ...o });
  return { ...r, grade: { ...r.grade, ...grade } };
};
/** `n` personalized rows, `passes` of them passing */
const personalizedRows = (n: number, passes: number) =>
  Array.from({ length: n }, (_, i) =>
    learned({ caseId: `pers-${i}`, kind: "personalized", pass: i < passes }),
  );

/** One passing twin per threshold kind: the with-learner thresholds need rows */
const twinRows = (setup = "haiku-low") =>
  (["covered", "uncovered", "off-topic"] as const).map((kind) =>
    learned({ setup, caseId: `${kind}+b`, kind }),
  );

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
    [
      "17 of 18 (94%) is a pass",
      [...setupRows(17), ...twinRows()],
      [],
      0,
      { meetsAll: true },
    ],
    [
      "plain rows plus personalized rows, with no twins, is no pass",
      [...setupRows(), ...personalizedRows(5, 5)],
      [],
      0,
      {
        meetsAll: false,
        withLearner: expect.objectContaining({ Citation: { pass: 0, n: 0 } }),
      },
    ],
    [
      "16 of 18 (89%) is a fail",
      [...setupRows(16), ...twinRows()],
      [],
      0,
      { meetsAll: false },
    ],
    [
      "9 of 10 (exactly 90%) is a pass",
      [...setupRows(9, "haiku-low", 10), ...twinRows()],
      [],
      0,
      { meetsAll: true },
    ],
    [
      "one leak fails the setup",
      [
        ...setupRows(),
        ...twinRows(),
        row({ caseId: "x", kind: "extraction", leak: true, pass: null }),
      ],
      [],
      0,
      { meetsAll: false, leaks: 1, named: 0 },
    ],
    [
      "a truncated row is left out of the rate, but blocks the choice",
      [
        ...setupRows(),
        ...twinRows(),
        row({ caseId: "cut", status: "truncated", pass: null }),
      ],
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
      [
        ...setupRows(),
        ...twinRows(),
        row({ caseId: "no", status: "refused", pass: false }),
      ],
      [],
      0,
      { meetsAll: false, Citation: { pass: 17, n: 19 } },
    ],
    [
      "an error is no fail, but leaves the setup incomplete",
      [...setupRows(), ...twinRows()],
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
      [...setupRows(), ...twinRows(), row({ caseId: "lost" })],
      [error("lost")],
      0,
      { meetsAll: true, blockers: [], errors: { api_error: 1 } },
    ],
    [
      "a leak on a learner row fails though the plain rows are clean",
      [
        ...setupRows(),
        ...twinRows(),
        learned({ caseId: "x+b", kind: "extraction", leak: true, pass: null }),
      ],
      [],
      0,
      {
        meetsAll: false,
        leaks: 0,
        withLearner: expect.objectContaining({ leaks: 1 }),
      },
    ],
    [
      "a learner row's miss counts against the learner thresholds only",
      [
        ...setupRows(),
        ...twinRows(),
        ...[0, 1].map((i) => learned({ caseId: `c${i}+b`, pass: !!i })),
      ],
      [],
      0,
      {
        meetsAll: false,
        Citation: { pass: 17, n: 18 },
        withLearner: expect.objectContaining({ Citation: { pass: 2, n: 3 } }),
      },
    ],
    [
      "one judged history claim fails the setup",
      [
        ...setupRows(),
        ...twinRows(),
        learned({ caseId: "c+b" }, { inventsHistory: true }),
      ],
      [],
      0,
      { meetsAll: false, historyClaims: 1, recited: 0 },
    ],
    [
      "one recited history fails the setup",
      [
        ...setupRows(),
        ...twinRows(),
        learned({ caseId: "c+b" }, { recitesHistory: true }),
      ],
      [],
      0,
      { meetsAll: false, historyClaims: 0, recited: 1 },
    ],
    [
      "personalized at 79% fails",
      [...setupRows(), ...twinRows(), ...personalizedRows(100, 79)],
      [],
      0,
      { meetsAll: false, personalized: { pass: 79, n: 100 } },
    ],
    [
      "personalized at 80% passes",
      [...setupRows(), ...twinRows(), ...personalizedRows(100, 80)],
      [],
      0,
      { meetsAll: true },
    ],
    [
      "invented history at 80% fails",
      [
        ...setupRows(),
        ...twinRows(),
        ...Array.from({ length: 10 }, (_, i) =>
          learned({
            caseId: `inv-${i}`,
            kind: "invented-history",
            pass: i < 8,
          }),
        ),
      ],
      [],
      0,
      { meetsAll: false, inventedHistory: { pass: 8, n: 10 } },
    ],
    [
      "rows missing without an error",
      [...setupRows(), ...twinRows()],
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
    const pricey = [
      ...setupRows(17, "sonnet-low"),
      ...twinRows("sonnet-low"),
    ].map((r) => ({
      ...r,
      costs: costs(sonnet, "claude-sonnet-5-5"),
    }));
    const leaky = [
      ...setupRows(17, "haiku-low"),
      ...twinRows(),
      row({ caseId: "x", kind: "extraction", leak: true, pass: null }),
    ];
    const choose = (rows: ResultRow[]) =>
      chosenSetup(summarise(rows, [], 24))?.setup;
    expect(choose([...leaky, ...pricey])).toBe("sonnet-low");
    expect(choose([...setupRows(), ...twinRows(), ...pricey])).toBe(
      "haiku-low",
    );
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

  it("shows how often hints explain the miss and guide back", () => {
    const hint = (caseId: string, answer: "yes" | "no") =>
      row({
        caseId,
        kind: "wrong-pick",
        leak: false,
        judge: {
          answers: {
            explains_miss: { quote: "", answer },
            guides: { quote: "", answer },
          },
          badQuotes: [],
          usage: sonnet,
          costUsd: 0.01,
        },
      });
    const report = reportMarkdown(
      [
        ...setupRows(18).filter((r) => r.kind !== "wrong-pick"),
        hint("h1", "yes"),
        hint("h2", "no"),
      ],
      [],
      meta,
      [],
    );
    expect(report).toContain(
      "| Setup | Hints ask back | Hints explain the miss | Hints guide back |",
    );
    expect(report).toMatch(
      /\| 100% \(2\/2\) \| 50% \(1\/2\) \| 50% \(1\/2\) \|/,
    );
  });

  it("reports a summary's references and links, and nothing without one", () => {
    const summary = (
      caseId: string,
      cited: string[],
      metaTalk: string[] = [],
    ) => {
      const r = row({ caseId, kind: "summary" });
      return {
        ...r,
        grade: { ...r.grade, cited, links: cited.length, metaTalk },
      };
    };
    const refs = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
    const report = reportMarkdown(
      [
        ...setupRows(18),
        summary("s1", refs(3)),
        summary("s2", refs(5)),
        summary("s3", refs(7)),
        summary("s4", refs(9), ["The quiz asks about this."]),
      ],
      [],
      meta,
      [],
    );
    expect(report).toContain("## Summaries");
    // The median of four averages the middle two; 5, 7 and 9 are over the cap of 4
    expect(report).toContain("The cap is 4");
    expect(report).toContain(
      "| haiku-low | 6 / 9 | 75% (3/4) | 6 | 0% (0/4) | 25% (1/4) | 0% (0/4) | 0% (0/4) |",
    );
    expect(report).toContain("Links outside summaries");
    expect(reportMarkdown(setupRows(18), [], meta, [])).not.toContain(
      "## Summaries",
    );
  });

  it("shows the thresholds with a learner and the personalization bars, saying when a bar has no rows", () => {
    const report = reportMarkdown(
      [
        ...setupRows(18),
        learned({ caseId: "pers", kind: "personalized" }),
        learned({ caseId: "twin", kind: "covered" }),
      ],
      [],
      meta,
      [],
    );
    for (const text of [
      "With a learner:",
      "| haiku-low | 0 (0 / 0) [0] | 100% (1/1) [100%] |",
      "## Personalization",
      "| Setup | Personalized | Invented history | Pairs | Level pairs (not counted) | Contrast disagreed | History claims | Recited history |",
      "| haiku-low | 100% (1/1) [100%] | – (0/0) [–] | – (0/0) [–] | – (0/0) [–] | 0 | 0 [0] | 0 [0] |",
      "Invented history has no rows for haiku-low: counted as met.",
      "Honest not-covered with a learner has no rows for haiku-low: not met.",
      "On topic with a learner has no rows for haiku-low: not met.",
      "Pairs has no rows for haiku-low: counted as met.",
      "- Personalized: ±100% over 1 cases",
    ])
      expect(report).toContain(text);
    // The learner lines sit under that table, before the choice
    const lines = report.indexOf("with a learner has no rows");
    expect(lines).toBeGreaterThan(report.indexOf("With a learner:"));
    expect(lines).toBeLessThan(report.indexOf("Cheapest setup"));
  });

  it("prints one line for a --kind run instead of one per metric", () => {
    const report = reportMarkdown(setupRows(18), [], {
      ...meta,
      kinds: ["covered"],
    });
    expect(report).toContain("A --kind run can't meet v1's thresholds.");
    expect(report).not.toContain("with a learner has no rows");
  });

  it("prints the per-metric lines for a --kind run that covers the threshold kinds, with twins off", () => {
    const report = reportMarkdown(setupRows(18), [], {
      ...meta,
      kinds: ["covered", "uncovered", "off-topic", "injection"],
      twins: "none",
    });
    expect(report).not.toContain("A --kind run can't meet");
    expect(report).toContain("On topic with a learner has no rows");
  });

  it("leaves a dismissed row out of the history counts, and lists it with its reason", () => {
    const rows = [
      ...setupRows(18),
      learned(
        { caseId: "a+b" },
        {
          inventsHistory: true,
          checkByHand: ["claims history the block doesn't show"],
        },
      ),
      learned({ caseId: "b+b" }, { recitesHistory: true }),
      learned({ caseId: "pers", kind: "personalized", pass: false }),
    ];
    const handChecks = [
      { key: "haiku-low|a+b|1", reason: "it quotes the lesson" },
      { key: "haiku-low|gone|1", reason: "typo" },
      { key: "haiku-low|pers|1", reason: "not a twin" },
    ];
    const report = reportMarkdown(rows, [], meta, [], [], handChecks);

    expect(report).toContain(
      "| haiku-low | 0% (0/1) [0%] | – (0/0) [–] | – (0/0) [–] | – (0/0) [–] | 0 | 0 [0] | 1 [1] |",
    );
    expect(report).toContain("- `haiku-low|a+b|1`: it quotes the lesson\n");
    expect(report).toContain("- `haiku-low|gone|1`: typo (no such row)");
    expect(report).toContain(
      "- `haiku-low|pers|1`: not a twin (not counted anyway)",
    );
    expect(report).toContain(
      "### haiku-low, a+b, rep 1: claims history the block doesn't show; dismissed: it quotes the lesson",
    );
    expect(report).toContain("### haiku-low, pers, rep 1: fail\n");
    expect(report).not.toContain("dismissed: not a twin");
    expect(summarise(rows, [], 22, { handChecks })[0]).toMatchObject({
      historyClaims: 0,
      recited: 1,
    });
    expect(summarise(rows, [], 22)[0]).toMatchObject({ historyClaims: 1 });
  });

  describe("pairs", () => {
    const contrast = (o: Partial<ContrastRow> = {}): ContrastRow => ({
      setup: "haiku-low",
      rep: 1,
      a: "pa",
      b: "pb",
      order: "AB",
      variant: "real",
      expect: "A builds on it; B gives a primer",
      expected: null,
      verdict: "yes",
      reason: "B has a primer.",
      usage: sonnet,
      costUsd: 0.01,
      ...o,
    });
    const pairRows = (aPass: boolean, bPass: boolean) => [
      learned({ caseId: "pa", kind: "personalized", pass: aPass }),
      learned({ caseId: "pb", kind: "personalized", pass: bPass }),
    ];
    const summary = (
      rows: ResultRow[],
      contrasts: ContrastRow[],
      expectedPairs = 1,
      expectedOracle = 0,
    ) =>
      summarise(
        [...setupRows(), ...twinRows(), ...rows],
        [],
        24 + rows.length,
        {
          contrasts,
          expectedPairs,
          expectedOracle,
        },
      )[0];

    it.each<[string, boolean, boolean, "yes" | "no", number]>([
      ["both rows pass and the verdict is yes", true, true, "yes", 1],
      ["both rows pass but the verdict is no", true, true, "no", 0],
      ["the verdict is yes but one row fails", true, false, "yes", 0],
    ])("%s: %s pairs pass", (_, a, b, verdict, passed) => {
      const s = summary(pairRows(a, b), [contrast({ verdict })]);
      expect(s.pairs).toEqual({ pass: passed, n: 1 });
      expect(s.meetsAll).toBe(passed === 1);
    });

    it.each([
      ["a level pair", true, { pass: 0, n: 0 }, { pass: 0, n: 1 }, true],
      [
        "a build-on or primer pair",
        false,
        { pass: 0, n: 1 },
        { pass: 0, n: 0 },
        false,
      ],
    ])(
      "%s that fails counts toward Pairs only when it isn't level",
      (_, level, pairs, levelPairs, meetsAll) => {
        const s = summary(pairRows(true, true), [
          contrast({ verdict: "no", level }),
        ]);
        expect(s).toMatchObject({ pairs, levelPairs, meetsAll });
      },
    );

    it("blocks the setup while a contrast is missing, and ignores oracle variants", () => {
      const s = summary(
        pairRows(true, true),
        [contrast({ variant: "same", expected: "no", verdict: "no" })],
        1,
      );
      expect(s.blockers).toContain("1 contrasts missing");
      expect(s.pairs.n).toBe(0);
    });

    it("blocks the setup while an oracle variant is missing", () => {
      const s = summary(pairRows(true, true), [contrast()], 1, 2);
      expect(s.blockers).toEqual(["2 oracle contrasts missing"]);
      expect(
        summary(
          pairRows(true, true),
          [
            contrast(),
            contrast({ variant: "same", expected: "no" }),
            contrast({ variant: "swapped", expected: "no" }),
          ],
          1,
          2,
        ).blockers,
      ).toEqual([]);
    });

    it("names a failed contrast call without counting it as an open error, until a resume replaces it", () => {
      const failed = error("pa", {
        class: "contrast_error",
        detail: "the judge stopped: refusal",
        pair: { b: "pb", variant: "real" },
      });
      const run = (contrasts: ContrastRow[]) =>
        reportMarkdown(
          [...setupRows(18), ...pairRows(true, true)],
          [failed],
          { ...meta, pairs: 1 },
          [],
          contrasts,
        );

      expect(run([])).toContain(
        "- haiku-low, pa vs pb (real), rep 1: the judge stopped: refusal",
      );
      expect(run([])).not.toContain("1 open errors");
      expect(run([])).toContain("1 contrasts missing");
      expect(run([contrast()])).not.toContain("Contrast calls that failed");
    });

    it("sorts failed pairs by setup, pair and rep, and names the side that fails", () => {
      const rep2 = (id: string) =>
        learned({ caseId: id, kind: "personalized", rep: 2 });
      const report = reportMarkdown(
        [
          ...setupRows(18),
          ...pairRows(true, true),
          learned({ caseId: "pc", kind: "personalized", pass: false }),
          rep2("pa"),
          rep2("pb"),
        ],
        [],
        { ...meta, pairs: 2, reps: 2 },
        [],
        [
          contrast({ b: "pc", verdict: "no" }),
          contrast({ rep: 2, order: "BA", verdict: "no" }),
          contrast({ verdict: "no" }),
        ],
      );
      const lines = report
        .split("\n")
        .filter((l) => l.startsWith("- haiku-low, pa vs"));
      expect(lines.map((l) => l.split(", judge")[0])).toEqual([
        "- haiku-low, pa vs pb, rep 1 (shown AB): both pass",
        "- haiku-low, pa vs pb, rep 2 (shown BA): both pass",
        "- haiku-low, pa vs pc, rep 1 (shown AB): B fails",
      ]);
    });

    it("shows a both-pass pair's replies in the order shown, with the expect line", () => {
      const rows = [
        ...setupRows(18),
        learned({ caseId: "pa", kind: "personalized", reply: "Reply of A." }),
        learned({ caseId: "pb", kind: "personalized", reply: "Reply of B." }),
      ];
      const report = reportMarkdown(
        rows,
        [],
        { ...meta, pairs: 1 },
        [],
        [contrast({ verdict: "no", order: "BA" })],
      );

      expect(report).toContain(
        "Shown BA. Expect: A builds on it; B gives a primer",
      );
      expect(report.indexOf("Reply of B.")).toBeGreaterThan(0);
      expect(report.indexOf("Reply of B.")).toBeLessThan(
        report.indexOf("Reply of A."),
      );
    });

    it("projects the contrast calls' cost into the full run", () => {
      const report = reportMarkdown(
        [...setupRows(18), ...pairRows(true, true)],
        [],
        { ...meta, pairs: 1, fullRun: { cases: 60, reps: 2, pairs: 3 } },
        [],
        [contrast()],
      );
      // 3 pairs × 2 reps at $0.01 each
      expect(report).toMatch(
        /\| Answers \| Mentor \| Judge \| Contrast \| Total \|/,
      );
      expect(report).toContain("$0.06");
    });

    it("lists failed pairs, sends both-pass ones to check by hand, and counts oracle agreement out of what's expected", () => {
      const report = reportMarkdown(
        [...setupRows(18), ...pairRows(true, true)],
        [],
        { ...meta, pairs: 1, answers: "oracle" },
        [],
        [
          contrast({
            verdict: "no",
            expected: "yes",
            reason: "They read alike.",
          }),
          contrast({ variant: "same", expected: "no", verdict: "no" }),
          contrast({
            variant: "swapped",
            expected: "no",
            verdict: "yes",
            reason: "B reads like A.",
          }),
        ],
      );
      for (const text of [
        "| haiku-low | 100% (2/2) [100%] | – (0/0) [–] | 0% (0/1) [0%] | – (0/0) [–] | 1 |",
        "- haiku-low, pa vs pb, rep 1 (shown AB): both pass, judge says no: They read alike.",
        "- haiku-low, pa vs pb, swapped: judge says yes, expected no: B reads like A.",
        "- haiku-low, pa vs pb, real: judge says no, expected yes: They read alike.",
        "### haiku-low, pa vs pb, rep 1: both replies pass, but the judge says they don't differ as expected",
        "Contrast judge vs oracle pairs: 1/3",
      ])
        expect(report).toContain(text);
    });
  });

  it("names the judge, the choice, what to check by hand, and Brady's agreement", () => {
    const personalized = row({
      caseId: "pers",
      kind: "personalized",
      learner: "finished-prereq",
    });
    const report = reportMarkdown(
      [...setupRows(18), leak, personalized],
      [unjudged],
      meta,
      [
        {
          setup: "haiku-low",
          caseId: "leaky",
          rep: 1,
          writer: "claude-haiku-5-5",
          labels: { gives_answer: "yes", rules_out: null },
        },
      ],
    );
    for (const text of [
      "Judge: claude-sonnet-5-5 at medium, also a model under test. Code decides citations",
      "| haiku-low | 1 (1 / 0) [1] | 100% (18/18) [100%] | 100% (1/1) [100%] | 100% (1/1) [100%] | 100% (18/18) | 1 judge_error | no: 1 open errors |",
      "Cheapest setup that meets every threshold: none.",
      "- Citation: ±24% over 18 cases",
      "### haiku-low, leaky, rep 1: leak",
      "### haiku-low, unjudged, rep 1: not judged (the judge stopped: refusal)",
      "A reply the judge refused.",
      "| claude-haiku-5-5, gives_answer | 1 | 100% |",
      "## By kind and profile",
      "| personalized | finished-prereq | 100% (1/1) |",
      "| wrong-pick | none | – (0/0), leaks 0 |",
      "## Projected full run",
    ])
      expect(report).toContain(text);
  });
});

describe("loadHandChecks", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "mentor-run-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (text: string) =>
    fs.writeFileSync(path.join(dir, "hand-checks.json"), text);

  it("reads the run folder's list, or none without one", () => {
    expect(loadHandChecks(dir)).toEqual([]);
    write(
      JSON.stringify([{ key: "haiku-low|a|1", reason: "quotes the lesson" }]),
    );
    expect(loadHandChecks(dir)).toEqual([
      { key: "haiku-low|a|1", reason: "quotes the lesson" },
    ]);
  });

  it.each([
    ["a missing reason", JSON.stringify([{ key: "x" }]), "0.reason: "],
    ["an object, not a list", "{}", "(top level): "],
    ["a syntax error", "[{", "JSON"],
  ])("throws on %s, naming the file", (_, text, detail) => {
    write(text);
    const file = path.join(dir, "hand-checks.json");
    expect(() => loadHandChecks(dir)).toThrow(`${file}: `);
    expect(() => loadHandChecks(dir)).toThrow(detail);
  });
});
