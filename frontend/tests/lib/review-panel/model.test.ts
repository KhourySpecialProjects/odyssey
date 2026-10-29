import {
  aiBarState,
  bandOf,
  cardStatus,
  circleLabel,
  confirmedCount,
  effective,
  issuesText,
  lessonDots,
  overallConfirmed,
  visibleFindings,
  type PanelScore,
} from "@/lib/review-panel/model";
import type { AiFinding } from "@/types";

const score = (over: Partial<PanelScore> = {}): PanelScore => ({
  lessonId: 1,
  criterionId: 10,
  value: null,
  aiValue: null,
  ...over,
});

const finding = (id: string): AiFinding => ({
  id,
  quote: id,
  reason: "r",
  lessonId: 1,
  anchor: { v: 1, field: "blocks", quote: id, prefix: "", suffix: "" },
});

describe("bandOf and effective", () => {
  it("maps scores to bands", () => {
    expect([5, 4, 3, 2, 1, null].map(bandOf)).toEqual([
      "good",
      "good",
      "ok",
      "needs_work",
      "needs_work",
      "unscored",
    ]);
  });

  it("prefers value over aiValue", () => {
    expect(effective(score({ value: 2, aiValue: 4 }))).toBe(2);
    expect(effective(score({ aiValue: 4 }))).toBe(4);
    expect(effective(score())).toBeNull();
  });
});

describe("cardStatus", () => {
  const criteria = [
    { id: 10, active: true },
    { id: 11, active: true },
    { id: 12, active: false },
  ];

  it("is not_scored with neither value nor aiValue", () => {
    expect(cardStatus(criteria, [])).toBe("not_scored");
    expect(cardStatus(criteria, [score()])).toBe("not_scored");
  });

  it("is to_confirm until every active criterion has a value", () => {
    const scores = [
      score({ criterionId: 10, value: 3, aiValue: 3 }),
      score({ criterionId: 11, aiValue: 2 }),
    ];
    expect(cardStatus(criteria, scores)).toBe("to_confirm");
  });

  it("is confirmed once all active criteria have a value, ignoring inactive", () => {
    const scores = [
      score({ criterionId: 10, value: 3 }),
      score({ criterionId: 11, value: 4 }),
    ];
    expect(cardStatus(criteria, scores)).toBe("confirmed");
  });
});

describe("overallConfirmed", () => {
  it("is true with no active criteria", () => {
    expect(overallConfirmed([], [])).toBe(true);
    expect(overallConfirmed([{ id: 1, active: false }], [])).toBe(true);
  });

  it("needs a value on every active Overall score", () => {
    const criteria = [{ id: 10 }, { id: 11 }];
    const one = score({ lessonId: null, criterionId: 10, value: 3 });
    expect(overallConfirmed(criteria, [one])).toBe(false);
    const two = score({ lessonId: null, criterionId: 11, aiValue: 3 });
    expect(overallConfirmed(criteria, [one, two])).toBe(false);
    expect(overallConfirmed(criteria, [one, { ...two, value: 3 }])).toBe(true);
  });

  it("ignores lesson scores", () => {
    const lesson = score({ lessonId: 5, criterionId: 10, value: 3 });
    expect(overallConfirmed([{ id: 10 }], [lesson])).toBe(false);
  });
});

describe("lessonDots", () => {
  it("shows the lowest effective score per lesson", () => {
    const dots = lessonDots(
      [
        score({ lessonId: 1, criterionId: 1, aiValue: 5 }),
        score({ lessonId: 1, criterionId: 2, value: 2, aiValue: 5 }),
        score({ lessonId: 2, criterionId: 1, aiValue: 3 }),
        score({ lessonId: 3, criterionId: 1, aiValue: 4 }),
        score({ lessonId: 4, criterionId: 1 }),
        score({ lessonId: null, criterionId: 1, value: 1 }),
      ],
      [{ id: 1 }, { id: 2 }],
    );
    expect(dots).toEqual({ 1: "needs_work", 2: "ok" });
  });

  it("ignores retired and inactive criteria", () => {
    const dots = lessonDots(
      [
        score({ lessonId: 1, criterionId: 1, aiValue: 5 }),
        score({ lessonId: 1, criterionId: 9, aiValue: 1 }),
        score({ lessonId: 2, criterionId: 3, aiValue: 1 }),
      ],
      [{ id: 1 }, { id: 3, active: false }],
    );
    expect(dots).toEqual({});
  });
});

describe("aiBarState", () => {
  const lessons = [
    { id: 1, name: "Intro" },
    { id: 2, name: "Loops" },
  ];

  it("is none without a run", () => {
    expect(aiBarState(null, lessons)).toEqual({ kind: "none" });
  });

  it("reports progress while running", () => {
    const run = {
      runState: "running" as const,
      progress: { done: [1], current: 2 },
    };
    expect(aiBarState(run, lessons)).toEqual({
      kind: "scoring",
      currentName: "Loops",
      done: 1,
      total: 3,
    });
  });

  it("names the Overall Score and handles a queued run with no progress", () => {
    const overall = {
      runState: "running" as const,
      progress: { done: [1, 2], current: "overall" as const },
    };
    expect(aiBarState(overall, lessons)).toMatchObject({
      currentName: "Overall Score",
      done: 2,
    });
    expect(aiBarState({ runState: "queued" }, lessons)).toEqual({
      kind: "scoring",
      currentName: null,
      done: 0,
      total: 3,
    });
  });

  it("is scored when done", () => {
    expect(aiBarState({ runState: "done" }, lessons)).toEqual({
      kind: "scored",
    });
  });

  it("names failed sections for partial and failed", () => {
    const failedLessons = [2, "overall" as const, 99];
    expect(aiBarState({ runState: "partial", failedLessons }, lessons)).toEqual(
      { kind: "partial", failedNames: ["Loops", "Overall Score"] },
    );
    expect(aiBarState({ runState: "failed" }, lessons)).toEqual({
      kind: "failed",
      failedNames: [],
    });
  });
});

describe("confirmedCount", () => {
  it("counts confirmed sections out of lessons + Overall", () => {
    const criteria = [{ id: 10 }];
    const scores = [
      score({ lessonId: 1, value: 3 }),
      score({ lessonId: 2, aiValue: 3 }),
      score({ lessonId: null, value: 4 }),
    ];
    expect(confirmedCount([1, 2], criteria, scores)).toEqual({
      confirmed: 2,
      total: 3,
    });
  });
});

describe("visibleFindings", () => {
  it("numbers undismissed findings 1..n in reading order", () => {
    const s = score({ aiFindings: [finding("a"), finding("b"), finding("c")] });
    const positions = {
      fa: { order: [3, 0] as [number, number] },
      fb: { order: [1, 0] as [number, number] },
      fc: { order: [2, 0] as [number, number] },
    };
    const out = visibleFindings(s, new Set(["c"]), positions);
    expect(out.map((v) => [v.number, v.finding.id])).toEqual([
      [1, "b"],
      [2, "a"],
    ]);
  });

  it("returns an empty list with no findings", () => {
    expect(visibleFindings(score(), new Set())).toEqual([]);
  });
});

describe("circleLabel and issuesText", () => {
  it("builds the accessible names", () => {
    expect(circleLabel("Style", 2, 2)).toBe(
      "Style, 2 out of 5, Needs work, 2 issues",
    );
    expect(circleLabel("Style", 3, 1)).toBe("Style, 3 out of 5, OK, 1 issue");
    expect(circleLabel("Style", 5, 0)).toBe(
      "Style, 5 out of 5, Good, no issues",
    );
    expect(circleLabel("Style", null, 0)).toBe("Style, not scored");
    expect(circleLabel("Style", 2, 1, true)).toBe(
      "Style, 2 out of 5, Needs work, 1 issue, suggested by AI",
    );
  });

  it("builds the visible issue text", () => {
    expect([0, 1, 2].map(issuesText)).toEqual([
      "No issues",
      "1 issue",
      "2 issues",
    ]);
  });
});
