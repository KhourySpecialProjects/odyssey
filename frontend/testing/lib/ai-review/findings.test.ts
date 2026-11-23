/** @jest-environment node */
import { findingTexts, toFindings } from "@/lib/ai-review/findings";
import type { DropletSnapshot } from "@/lib/ai-review/types";
import { aiFindingSchema } from "@/lib/validations/review";
import { mockSnapshot } from "@/testing/mocks/aiReviewMock";

const snapshot: DropletSnapshot = {
  ...mockSnapshot,
  droplet: {
    ...mockSnapshot.droplet,
    description: "Version control from zero.",
    overview: "<p>You will learn <strong>Git</strong> step by step.</p>",
  },
  lessons: [
    {
      id: 11,
      name: "Blocks",
      blocksVersion: "v2",
      blocksV2: [
        {
          id: "b1",
          type: "paragraph",
          content: [{ type: "text", text: "Git keeps history.", styles: {} }],
          children: [],
        },
        {
          id: "b2",
          type: "paragraph",
          content: [
            { type: "text", text: "Commit early and often.", styles: {} },
          ],
          children: [],
        },
      ],
    },
    {
      id: 12,
      name: "Classic",
      blocksVersion: "v1",
      blocks: [
        {
          __component: "droplets.generic",
          content: "<p>Branches are cheap.   They <b>merge</b> well.</p>",
        },
      ],
    },
  ] as DropletSnapshot["lessons"],
};

const texts = findingTexts(snapshot);
let n: number;
const nextId = () => `r1-${++n}`;
const t = (quote: string, extra: object = {}) => ({
  quote,
  reason: "Because.",
  ...extra,
});
const run = (
  list: ReturnType<typeof t>[],
  scope: Parameters<typeof toFindings>[1],
) => toFindings(list, scope, texts, nextId);

beforeEach(() => {
  n = 0;
});

const withBlock = (block: object, id = 30) =>
  findingTexts({
    ...snapshot,
    lessons: [
      { id, name: "L", blocksVersion: "v2", blocksV2: [block] },
    ] as DropletSnapshot["lessons"],
  });
const withText = (text: string) =>
  withBlock({
    id: "e1",
    type: "paragraph",
    content: [{ type: "text", text, styles: {} }],
    children: [],
  });
const keep = (text: string, quote: string, reason = "Because.") =>
  toFindings([t(quote, { reason })], { lessonId: 30 }, withText(text), nextId)
    .findings;
// A lone surrogate is escaped by JSON.stringify; a whole pair is not
const lone = /\\ud[89a-f][0-9a-f]{2}/i;

describe("toFindings", () => {
  it("anchors a BlockNote quote to its block, and the finding passes the schema", () => {
    const { findings, dropped } = run([t("Commit early")], { lessonId: 11 });
    expect(dropped).toBe(0);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: "r1-1",
      lessonId: 11,
      quote: "Commit early",
      anchor: { field: "blocks", blockId: "b2", start: 0, end: 12 },
    });
    expect(aiFindingSchema.safeParse(findings[0]).success).toBe(true);
  });

  it("gives a Classic quote no blockId, recovering Markdown and collapsed whitespace", () => {
    const { findings } = run([t("Branches are cheap. They **merge** well.")], {
      lessonId: 12,
    });
    expect(findings[0].quote).toBe("Branches are cheap.   They merge well.");
    expect(findings[0].anchor).not.toHaveProperty("blockId");
    expect(findings[0].anchor.field).toBe("blocks");
  });

  it("anchors Overall lesson 0 to an Overview field with no lessonId", () => {
    const { findings } = run([t("from zero", { lesson: 0 })], "overall");
    expect(findings[0]).toMatchObject({
      lessonId: null,
      anchor: { field: "description" },
    });
    const overview = run([t("Git step by step", { lesson: 0 })], "overall");
    expect(overview.findings[0].anchor.field).toBe("overview");
  });

  it("anchors an Overall quote to the lesson it names", () => {
    const { findings } = run(
      [t("Branches are cheap", { lesson: 2 })],
      "overall",
    );
    expect(findings[0].lessonId).toBe(12);
  });

  it.each([
    ["an unresolvable quote", t("Nothing like this"), { lessonId: 11 }],
    ["a quote from another lesson", t("Branches are cheap"), { lessonId: 11 }],
    [
      "a quote from a lesson the Overall didn't name",
      t("Branches are cheap", { lesson: 1 }),
      "overall",
    ],
    ["an Overall quote with no lesson", t("Git keeps history"), "overall"],
    [
      "a quote from details with no field",
      t("beginner", { lesson: 0 }),
      "overall",
    ],
    [
      "a quote across two blocks",
      t("history.\nCommit early"),
      { lessonId: 11 },
    ],
    ["a blank quote", t(" "), { lessonId: 11 }],
    ["a quote of punctuation", t("."), { lessonId: 11 }],
    [
      "an Overall lesson past the last",
      t("Git keeps", { lesson: 3 }),
      "overall",
    ],
  ] as const)("drops %s", (_label, item, scope) => {
    expect(run([item], scope)).toEqual({ findings: [], dropped: 1 });
  });

  it("keeps at most 5, a duplicate once, and clips a long reason", () => {
    const words = ["Git", "keeps", "history", "Commit", "early", "often"];
    const list = [
      ...words.map((w) => t(w)),
      t("Git"),
      t("Commit early", { reason: "x".repeat(600) }),
    ];
    const { findings, dropped } = run(list, { lessonId: 11 });
    expect(findings.map((f) => f.quote)).toEqual(words.slice(0, 5));
    expect(dropped).toBe(3);
    const clipped = run([t("Commit early", { reason: "x".repeat(600) })], {
      lessonId: 11,
    });
    expect(clipped.findings[0].reason).toHaveLength(500);
  });

  it("collapses a repeated quote but not a different one at the same start", () => {
    expect(run([t("Git"), t("Git")], { lessonId: 11 })).toMatchObject({
      findings: [{ quote: "Git" }],
      dropped: 1,
    });
    const { findings } = run([t("Commit early and often."), t("Commit")], {
      lessonId: 11,
    });
    expect(findings).toHaveLength(2);
  });

  it("gives ids only to kept findings, in order", () => {
    const { findings, dropped } = run(
      [t("Git keeps"), t("Nothing like this"), t("Commit early")],
      { lessonId: 11 },
    );
    expect(findings.map((f) => f.id)).toEqual(["r1-1", "r1-2"]);
    expect(dropped).toBe(1);
  });

  it("stores a padded quote trimmed", () => {
    const { findings } = run([t("  Commit early  ")], { lessonId: 11 });
    expect(findings[0]).toMatchObject({
      quote: "Commit early",
      anchor: { start: 0, end: 12 },
    });
  });

  it("anchors an Overview objective, a link's text and a quote with regex characters", () => {
    const objective = run([t("Make a commit", { lesson: 0 })], "overall");
    expect(objective.findings[0].anchor.field).toBe("objective");
    const text = "See the docs now: f(x) costs $5?";
    expect(keep(text, "See [the docs](https://x.dev) now")[0].quote).toBe(
      "See the docs now",
    );
    expect(keep(text, "**f(x)** costs $5?")[0].quote).toBe("f(x) costs $5?");
  });

  describe("with an emoji at a cut", () => {
    it.each([
      ["prefix", `😀${"b".repeat(29)}QUOTE`],
      ["suffix", `QUOTE${"c".repeat(29)}😀`],
    ])("cuts the %s before a split pair", (_side, text) => {
      const [finding] = keep(text, "QUOTE");
      expect(finding.quote).toBe("QUOTE");
      expect(JSON.stringify(finding)).not.toMatch(lone);
      expect(aiFindingSchema.safeParse(finding).success).toBe(true);
    });

    it("clips a reason before a pair split at the 500 cut", () => {
      const [finding] = keep("QUOTE", "QUOTE", `${"x".repeat(499)}😀`);
      expect(finding.reason).toHaveLength(499);
      expect(JSON.stringify(finding)).not.toMatch(lone);
    });
  });

  it("drops a finding whose anchor is over the backend's size bound", () => {
    const texts = withBlock({
      id: "x".repeat(3000),
      type: "paragraph",
      content: [{ type: "text", text: "QUOTE", styles: {} }],
      children: [],
    });
    expect(toFindings([t("QUOTE")], { lessonId: 30 }, texts, nextId)).toEqual({
      findings: [],
      dropped: 1,
    });
  });

  it("takes ids from nextId in order, across calls", () => {
    run([t("Git keeps"), t("Commit")], { lessonId: 11 });
    const { findings } = run([t("Branches")], { lessonId: 12 });
    expect(findings[0].id).toBe("r1-3");
  });
});
