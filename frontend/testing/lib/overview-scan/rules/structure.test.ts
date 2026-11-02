import { STRUCTURE_CHECKS } from "@/lib/overview-scan/rules/structure";
import type { FetchUrl } from "@/lib/overview-scan/network";
import type {
  ScanBlock,
  ScanDocument,
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

  it("passes the shared sample document", () => {
    for (const check of STRUCTURE_CHECKS)
      for (const rule of check.rules)
        expect(rule.run(sampleScanDocument, noFetch)).toEqual([]);
  });
});
