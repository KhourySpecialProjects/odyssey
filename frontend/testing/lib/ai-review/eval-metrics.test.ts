import {
  agreementTable,
  biggestGaps,
  pairScores,
  runToRunPairs,
  totals,
} from "@/scripts/ai-review/lib/metrics";
import { blankScores, type ClientScores } from "@/scripts/ai-review/lib/files";
import type { RequestResult } from "@/scripts/ai-review/lib/run";
import { mockCriteria } from "@/testing/mocks/aiReviewMock";

function result(
  run: number,
  kind: "lesson" | "overall",
  lessonId: number | null,
  scores: [number, number] | null,
  extra: Partial<RequestResult> = {},
): RequestResult {
  const id = kind === "overall" ? "overall" : `l${lessonId}`;
  return {
    run,
    dropletId: 7,
    dropletName: "Intro to Git",
    request: {
      customId: `r${run}-d7-${id}`,
      kind,
      lessonId,
      lessonName: lessonId ? `Lesson ${lessonId}` : null,
    },
    parsed: scores
      ? {
          ok: true,
          scores: [
            { criterionId: 1, score: scores[0], rationale: "tone reason" },
            {
              criterionId: 2,
              score: scores[1],
              rationale: "scaffolding reason",
            },
          ],
        }
      : { ok: false, reason: "refusal" },
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 20,
      cache_creation_input_tokens: 5,
    } as never,
    costUsd: 0.01,
    ...extra,
  };
}

const client: ClientScores = {
  scorer: "client",
  split: "tune",
  rubricVersion: "v1",
  lessons: [
    {
      lessonId: 11,
      lessonName: "Lesson 11",
      scores: { Tone: 4, Scaffolding: 2 },
    },
    {
      lessonId: 12,
      lessonName: "Lesson 12",
      scores: { Tone: 3, Scaffolding: null },
    },
  ],
  overall: { Tone: 4, Scaffolding: 3 },
};
const clientMap = new Map([[7, client]]);

describe("pairScores", () => {
  it("lines AI scores up with the client's, skipping failures and blanks", () => {
    const pairs = pairScores(
      [
        result(1, "lesson", 11, [4, 4]),
        result(1, "lesson", 12, [5, 1]),
        result(1, "overall", null, null),
      ],
      clientMap,
      mockCriteria,
    );
    expect(
      pairs.map((p) => [p.lessonName, p.criterion, p.ai, p.client]),
    ).toEqual([
      ["Lesson 11", "Tone", 4, 4],
      ["Lesson 11", "Scaffolding", 4, 2],
      ["Lesson 12", "Tone", 5, 3],
      // Lesson 12 Scaffolding is blank for the client; Overall was refused.
    ]);
  });
});

describe("agreementTable", () => {
  it("reports exact, within-one and the signed average per criterion, plus All", () => {
    const rows = agreementTable(
      [
        { criterion: "Tone", ai: 4, client: 4 },
        { criterion: "Tone", ai: 5, client: 4 },
        { criterion: "Tone", ai: 5, client: 2 },
        { criterion: "Scaffolding", ai: 1, client: 3 },
      ],
      mockCriteria,
    );
    expect(rows[0]).toEqual({
      criterion: "Tone",
      n: 3,
      exact: 1 / 3,
      withinOne: 2 / 3,
      meanDiff: 4 / 3,
    });
    expect(rows[1]).toEqual({
      criterion: "Scaffolding",
      n: 1,
      exact: 0,
      withinOne: 0,
      meanDiff: -2,
    });
    expect(rows[2]).toMatchObject({
      criterion: "All",
      n: 4,
      exact: 0.25,
      withinOne: 0.5,
    });
  });

  it("leaves a criterion with no pairs empty rather than 0%", () => {
    expect(agreementTable([], mockCriteria)[0]).toMatchObject({
      n: 0,
      exact: NaN,
    });
  });
});

describe("biggestGaps", () => {
  it("lists the largest disagreements first and leaves out agreements", () => {
    const pairs = pairScores(
      [result(1, "lesson", 11, [4, 5]), result(1, "lesson", 12, [1, 3])],
      clientMap,
      mockCriteria,
    );
    expect(
      biggestGaps(pairs).map((p) => [
        p.lessonName,
        p.criterion,
        p.ai - p.client,
      ]),
    ).toEqual([
      ["Lesson 11", "Scaffolding", 3],
      ["Lesson 12", "Tone", -2],
    ]);
  });
});

describe("runToRunPairs", () => {
  it("compares the same request across two runs", () => {
    const pairs = runToRunPairs(
      [
        result(1, "lesson", 11, [4, 2]),
        result(2, "lesson", 11, [3, 2]),
        result(2, "lesson", 12, [5, 5]),
      ],
      mockCriteria,
    );
    expect(pairs).toEqual([
      { criterion: "Tone", ai: 3, client: 4 },
      { criterion: "Scaffolding", ai: 2, client: 2 },
    ]);
  });
});

describe("totals", () => {
  it("adds up tokens and cost, and lists failures", () => {
    const t = totals([
      result(1, "lesson", 11, [4, 2]),
      result(1, "overall", null, null),
    ]);
    expect(t).toMatchObject({
      requests: 2,
      inputTokens: 200,
      cacheReadTokens: 40,
      cacheWriteTokens: 10,
      outputTokens: 100,
      failed: [{ customId: "r1-d7-overall", reason: "refusal" }],
    });
    expect(t.costUsd).toBeCloseTo(0.02);
  });
});

describe("blankScores", () => {
  it("names every score still to fill in", () => {
    expect(blankScores(client, mockCriteria)).toEqual([
      "Lesson 12 / Scaffolding",
    ]);
  });
});
