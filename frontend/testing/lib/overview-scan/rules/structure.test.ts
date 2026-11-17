import { STRUCTURE_CHECKS } from "@/lib/overview-scan/rules/structure";
import type { FetchUrl } from "@/lib/overview-scan/network";
import type {
  ScanBlock,
  ScanDocument,
  ScanDroplet,
  ScanPart,
} from "@/lib/overview-scan/types";
import {
  lesson,
  sampleScanDocument,
  scanDoc,
} from "@/testing/mocks/overview-scan";

const noFetch: FetchUrl = () => {
  throw new Error("a structure rule fetched a URL");
};

function run(checkId: string, ruleId: string, doc: ScanDocument) {
  const rule = STRUCTURE_CHECKS.find((c) => c.id === checkId)?.rules.find(
    (r) => r.id === ruleId,
  );
  if (!rule) throw new Error(`no rule ${checkId}/${ruleId}`);
  return rule.run(doc, noFetch);
}

const withLessons = (...parts: ScanPart[]) => scanDoc({ lessons: parts });
const h = (id: string, level: number, text = id): ScanBlock => ({
  id,
  type: "heading",
  level,
  text,
});
const p = (id: string, text: string): ScanBlock => ({
  id,
  type: "paragraph",
  text,
});
const nWords = (n: number) => Array(n).fill("word").join(" ");
const warn = (partId: string, blockId: string | null, message: string) => ({
  partId,
  blockId,
  message,
  severity: "warn",
});
const lessons = (n: number) =>
  Array.from({ length: n }, (_, i) => lesson([h("h", 2)], i + 1));

describe("structure: lesson checks", () => {
  it.each([
    [
      "organization",
      "has-heading",
      withLessons(lesson([p("a", "text")])),
      [warn("1", null, "This lesson has no headings.")],
    ],
    [
      "organization",
      "heading-levels",
      withLessons(lesson([h("a", 2), h("b", 4, "Deep")])),
      [warn("1", "b", `"Deep" is an H4 right after an H2.`)],
    ],
    [
      "organization",
      "heading-levels",
      withLessons(lesson([h("a", 3, "Early")])),
      [warn("1", "a", `"Early" is an H3 right after an H1.`)],
    ],
    [
      "organization",
      "no-repeats",
      withLessons(
        lesson([h("h", 2, "H"), p("a", "Same words.")], 1, "One"),
        lesson([h("h", 2, "H")], 2, "Two"),
        lesson([p("b", " same  WORDS. ")], 3, "Three"),
      ),
      [warn("3", "b", "This paragraph also appears in Lesson 1 · One.")],
    ],
    [
      "granularity",
      "block-length",
      withLessons(lesson([p("b", nWords(301))])),
      [warn("1", "b", "A text block has 301 words (limit 300).")],
    ],
    [
      "granularity",
      "block-length",
      withLessons(
        lesson([{ id: "b", type: "list", items: [nWords(150), nWords(151)] }]),
      ),
      [warn("1", "b", "A text block has 301 words (limit 300).")],
    ],
    [
      "granularity",
      "block-length",
      withLessons(lesson([{ id: "b", type: "callout", text: nWords(301) }])),
      [warn("1", "b", "A text block has 301 words (limit 300).")],
    ],
    [
      "granularity",
      "lesson-count",
      withLessons(),
      [warn("droplet", null, "The droplet has 0 lessons (aim for 2 to 8).")],
    ],
    [
      "granularity",
      "lesson-count",
      scanDoc({ lessons: lessons(1) }),
      [warn("droplet", null, "The droplet has 1 lessons (aim for 2 to 8).")],
    ],
    [
      "granularity",
      "lesson-count",
      scanDoc({ lessons: lessons(9) }),
      [warn("droplet", null, "The droplet has 9 lessons (aim for 2 to 8).")],
    ],
  ])("%s/%s flags", (checkId, ruleId, doc, expected) => {
    expect(run(checkId, ruleId, doc as ScanDocument)).toEqual(expected);
  });

  it.each([
    ["organization", "has-heading", withLessons()],
    [
      "organization",
      "heading-levels",
      withLessons(lesson([h("a", 2), h("b", 3), h("c", 2), h("d", 3)])),
    ],
    [
      "organization",
      "no-repeats",
      withLessons(
        lesson([p("a", "Same."), p("b", "Same.")], 1),
        lesson([h("h", 2)], 2),
      ),
    ],
    [
      "organization",
      "no-repeats",
      withLessons(lesson([p("a", " ")], 1), lesson([p("b", "")], 2)),
    ],
    ["granularity", "block-length", withLessons(lesson([p("b", nWords(300))]))],
    ["granularity", "lesson-count", scanDoc({ lessons: lessons(2) })],
    ["granularity", "lesson-count", scanDoc({ lessons: lessons(8) })],
  ])("%s/%s passes", (checkId, ruleId, doc) => {
    expect(run(checkId, ruleId, doc)).toEqual([]);
  });
});

const withDroplet = (overrides: Partial<ScanDroplet>) =>
  scanDoc({ droplet: overrides });
const link = (id: number, name = "Linked", extra = {}) => ({
  id,
  name,
  status: "published" as const,
  isHidden: false,
  ...extra,
});
const page = (section: string, message: string) =>
  warn("droplet", section, message);
const step = (label: string, url: string) => ({ label, url });
const chars = (n: number) => "x".repeat(n);
const SAME = nWords(40);
const NOT_ON_LIST = (o: string, first: string) =>
  `"${o}" starts with "${first}", which isn't on the action-verb list. Try a verb such as "Explain".`;

describe("structure: droplet page checks", () => {
  it("has 8 structure checks and 18 rules, in prototype order", () => {
    expect(STRUCTURE_CHECKS.map((c) => c.id)).toEqual([
      "organization",
      "granularity",
      "overview",
      "objectives",
      "prerequisites",
      "next-steps",
      "description",
      "tags",
    ]);
    expect(STRUCTURE_CHECKS.every((c) => c.group === "structure")).toBe(true);
    expect(STRUCTURE_CHECKS.flatMap((c) => c.rules)).toHaveLength(18);
  });

  it("flags only the sample's last objective", async () => {
    const flags = (
      await Promise.all(
        STRUCTURE_CHECKS.flatMap((c) => c.rules).map((r) =>
          r.run(sampleScanDocument, noFetch),
        ),
      )
    ).flat();
    expect(flags).toEqual([
      page(
        "objectives",
        NOT_ON_LIST(
          "Understanding how pandas stores data types",
          "Understanding",
        ),
      ),
    ]);
  });

  it.each([
    ["overview", "not-empty", { overview: "" }, "The Overview is empty."],
    ["overview", "not-empty", { overview: "  " }, "The Overview is empty."],
    [
      "overview",
      "length",
      { overview: nWords(29) },
      "The Overview is 29 words (aim for 30 to 150).",
    ],
    [
      "overview",
      "length",
      { overview: nWords(151) },
      "The Overview is 151 words (aim for 30 to 150).",
    ],
    [
      "overview",
      "not-description",
      { overview: SAME, description: ` ${SAME.toUpperCase()} ` },
      "The Overview repeats the description word for word.",
    ],
    [
      "objectives",
      "count",
      { learningObjectives: ["Load a", "Find b"] },
      "There are 2 learning objectives (at least 3).",
    ],
    [
      "objectives",
      "count",
      { learningObjectives: ["Load a", "Find b", " "] },
      "There are 2 learning objectives (at least 3).",
    ],
    [
      "objectives",
      "no-blanks",
      { learningObjectives: ["Load x", "  ", "Find y"] },
      "One learning objective is blank.",
    ],
    [
      "objectives",
      "no-blanks",
      { learningObjectives: ["Load x", "load  X", "Find y"] },
      "Two learning objectives are the same.",
    ],
    [
      "objectives",
      "action-verb",
      { learningObjectives: ["Understanding x"] },
      NOT_ON_LIST("Understanding x", "Understanding"),
    ],
    [
      "objectives",
      "action-verb",
      { learningObjectives: ["—"] },
      `"—" doesn't start with a word. Try a verb such as "Explain".`,
    ],
    [
      "prerequisites",
      "published",
      { prerequisites: [link(2, "Draft", { status: "draft" })] },
      `"Draft" is not published.`,
    ],
    [
      "prerequisites",
      "published",
      { prerequisites: [link(2, "Edit", { status: "edit" })] },
      `"Edit" is not published.`,
    ],
    [
      "prerequisites",
      "published",
      {
        prerequisites: [link(2, "Both", { status: "draft", isHidden: true })],
      },
      `"Both" is hidden.`,
    ],
    [
      "prerequisites",
      "published",
      { postrequisites: [link(3, "Post", { isHidden: true })] },
      `"Post" is hidden.`,
    ],
    [
      "prerequisites",
      "no-loops",
      { prerequisites: [link(1)] },
      "The droplet is listed as its own prerequisite.",
    ],
    [
      "prerequisites",
      "no-loops",
      { id: 5, originalDropletId: 1, prerequisites: [link(1)] },
      "The droplet is listed as its own prerequisite.",
    ],
    [
      "prerequisites",
      "no-loops",
      { postrequisites: [link(1)] },
      "The droplet is listed as its own postrequisite.",
    ],
    [
      "prerequisites",
      "no-loops",
      { prerequisites: [link(9)], postrequisites: [link(9)] },
      "A droplet is listed as both a prerequisite and a postrequisite.",
    ],
    [
      "next-steps",
      "at-least-one",
      { nextSteps: [] },
      "There are no next steps.",
    ],
    [
      "next-steps",
      "label-and-https",
      { nextSteps: [step("Guide", "http://a.test")] },
      `Next step "Guide" needs a label and an https:// URL.`,
    ],
    [
      "next-steps",
      "label-and-https",
      { nextSteps: [step("Guide", "HTTPS://a.test")] },
      `Next step "Guide" needs a label and an https:// URL.`,
    ],
    [
      "next-steps",
      "label-and-https",
      { nextSteps: [step("", "https://a.test")] },
      `Next step "https://a.test" needs a label and an https:// URL.`,
    ],
    [
      "description",
      "length",
      { description: "" },
      "The description is 0 characters (aim for 50 to 500).",
    ],
    [
      "description",
      "length",
      { description: chars(49) },
      "The description is 49 characters (aim for 50 to 500).",
    ],
    [
      "description",
      "length",
      { description: chars(501) },
      "The description is 501 characters (aim for 50 to 500).",
    ],
    [
      "description",
      "length",
      { description: `  ${chars(10)}  ` },
      "The description is 10 characters (aim for 50 to 500).",
    ],
    ["tags", "difficulty", { difficulty: null }, "Difficulty isn't set."],
    ["tags", "has-tag", { tags: [] }, "The droplet has no tags."],
  ] as [string, string, Partial<ScanDroplet>, string][])(
    "%s/%s flags",
    (checkId, ruleId, overrides, message) => {
      // Each check's id is also its droplet-page section id
      expect(run(checkId, ruleId, withDroplet(overrides))).toEqual([
        page(checkId, message),
      ]);
    },
  );

  it.each([
    [
      "objectives",
      "no-blanks",
      { learningObjectives: ["Load x", " ", "load  X"] },
      [
        "One learning objective is blank.",
        "Two learning objectives are the same.",
      ],
    ],
    [
      "objectives",
      "count",
      { learningObjectives: ["Load x", "  "] },
      ["There are 1 learning objectives (at least 3)."],
    ],
    [
      "objectives",
      "no-blanks",
      { learningObjectives: ["Load x", "  "] },
      ["One learning objective is blank."],
    ],
    [
      "prerequisites",
      "no-loops",
      { prerequisites: [link(1), link(9)], postrequisites: [link(1), link(9)] },
      [
        "The droplet is listed as its own prerequisite.",
        "A droplet is listed as both a prerequisite and a postrequisite.",
        "The droplet is listed as its own postrequisite.",
      ],
    ],
    [
      "objectives",
      "action-verb",
      { learningObjectives: ["Understanding x", "Knowing y"] },
      [
        NOT_ON_LIST("Understanding x", "Understanding"),
        NOT_ON_LIST("Knowing y", "Knowing"),
      ],
    ],
    [
      "next-steps",
      "label-and-https",
      { nextSteps: [step("A", "http://a.test"), step("", "https://b.test")] },
      [
        `Next step "A" needs a label and an https:// URL.`,
        `Next step "https://b.test" needs a label and an https:// URL.`,
      ],
    ],
    [
      "prerequisites",
      "published",
      {
        prerequisites: [link(2, "Pre", { status: "draft" })],
        postrequisites: [link(3, "Post", { isHidden: true })],
      },
      [`"Pre" is not published.`, `"Post" is hidden.`],
    ],
  ] as [string, string, Partial<ScanDroplet>, string[]][])(
    "%s/%s raises every flag, in order",
    (checkId, ruleId, overrides, messages) => {
      expect(run(checkId, ruleId, withDroplet(overrides))).toEqual(
        messages.map((m) => page(checkId, m)),
      );
    },
  );

  it.each([
    ["overview", "not-empty", { overview: "word" }],
    ["overview", "length", { overview: "" }],
    ["overview", "length", { overview: nWords(30) }],
    ["overview", "length", { overview: nWords(150) }],
    ["overview", "not-description", { overview: "", description: "" }],
    [
      "objectives",
      "no-blanks",
      { learningObjectives: ["Load a", "Find b", "Fix c"] },
    ],
    [
      "objectives",
      "action-verb",
      { learningObjectives: ["explain x", "Use y", " "] },
    ],
    ["prerequisites", "published", {}],
    ["prerequisites", "no-loops", { originalDropletId: 7 }],
    [
      "next-steps",
      "label-and-https",
      { nextSteps: [step("Guide", "https://a.test")] },
    ],
    ["description", "length", { description: chars(50) }],
    ["description", "length", { description: chars(500) }],
  ] as [string, string, Partial<ScanDroplet>][])(
    "%s/%s passes",
    (checkId, ruleId, overrides) => {
      expect(run(checkId, ruleId, withDroplet(overrides))).toEqual([]);
    },
  );
});
