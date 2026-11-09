import { CONTENT_CHECKS } from "@/lib/overview-scan/rules/content";
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

// The spelling rule's AI double-check doesn't run here; spelling-ai.test.ts covers it
jest.mock("@/lib/overview-scan/spelling", () => ({
  ...jest.requireActual("@/lib/overview-scan/spelling"),
  confirmMisspellings: jest.fn(async () => ({ ok: false, reason: "failed" })),
}));

const noFetch: FetchUrl = () => {
  throw new Error("a content rule fetched a URL");
};

function run(checkId: string, ruleId: string, doc: ScanDocument) {
  const rule = CONTENT_CHECKS.find((c) => c.id === checkId)?.rules.find(
    (r) => r.id === ruleId,
  );
  if (!rule) throw new Error(`no rule ${checkId}/${ruleId}`);
  return rule.run(doc, noFetch);
}

const withLessons = (...parts: ScanPart[]) => scanDoc({ lessons: parts });
const h = (id: string, text: string): ScanBlock => ({
  id,
  type: "heading",
  level: 2,
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
const NOT_KNOWN = "in the dictionary or the tech word list.";

describe("content checks", () => {
  it("has 6 content checks and 12 rules, in prototype order", () => {
    expect(CONTENT_CHECKS.map((c) => c.id)).toEqual([
      "style",
      "quality",
      "spelling",
      "readability",
      "inclusive",
      "lesson-titles",
    ]);
    expect(CONTENT_CHECKS.every((c) => c.group === "content")).toBe(true);
    expect(CONTENT_CHECKS.flatMap((c) => c.rules)).toHaveLength(12);
  });

  it.each([
    [
      "style",
      "sentence-case",
      withLessons(lesson([h("a", "Load The data")])),
      [
        warn(
          "1",
          "a",
          '"Load The data" capitalizes "The". Only the first word should start with a capital.',
        ),
      ],
    ],
    [
      "style",
      "swears",
      withLessons(
        lesson([
          p("a", "What the f*ck is this?"),
          {
            id: "q",
            type: "quiz-mc",
            question: "Pick one",
            options: [{ text: "bullshit", isCorrect: false }],
          },
        ]),
      ),
      [
        warn("1", "a", 'Contains a swear word or slur ("f***").'),
        warn("1", "q", 'Contains a swear word or slur ("b*******").'),
      ],
    ],
    [
      "quality",
      "empty-blocks",
      withLessons(
        lesson([
          h("a", ""),
          { id: "i", type: "image", url: "", caption: "A chart" },
          { id: "q", type: "quiz-tf", question: " ", correctAnswer: true },
          {
            id: "c",
            type: "code",
            variant: "notebook",
            language: "python",
            code: "",
            runnable: true,
          },
        ]),
      ),
      [
        warn("1", "a", "This heading is empty."),
        warn("1", "i", "This image has no URL."),
        warn("1", "q", "This quiz has no question."),
        warn("1", "c", "This notebook block has no code."),
      ],
    ],
    [
      "spelling",
      "dictionary",
      scanDoc({
        droplet: { description: "Wich one?" },
        lessons: [
          lesson([p("a", "We recieve the file untill noon.")], 1, "Teh basics"),
        ],
      }),
      [
        warn("1", null, `"Teh" isn't ${NOT_KNOWN}`),
        warn("1", "a", `"recieve" and "untill" aren't ${NOT_KNOWN}`),
        warn("droplet", "description", `"Wich" isn't ${NOT_KNOWN}`),
        // The AI double-check is mocked as not run here (spelling-ai.test.ts)
        {
          partId: "droplet",
          blockId: null,
          message:
            "The AI double-check didn't run, so these are the dictionary's flags.",
          severity: "unknown",
        },
      ],
    ],
    [
      "spelling",
      "doubled-words",
      withLessons(lesson([p("a", "Read the the file.")])),
      [warn("1", "a", 'Repeats "the the".')],
    ],
    [
      "spelling",
      "unclosed",
      withLessons(lesson([p("a", "Call it (twice."), p("b", "Say “hi.")])),
      [
        warn("1", "a", 'An opening "(" is never closed.'),
        warn("1", "b", 'An opening "“" is never closed.'),
      ],
    ],
    [
      "readability",
      "sentence-length",
      withLessons(lesson([p("a", `${nWords(26)}.`)])),
      [warn("1", null, "Sentences average 26 words (limit 25).")],
    ],
    [
      "readability",
      "paragraph-length",
      withLessons(lesson([p("a", "One. Two. Three. Four. Five. Six.")])),
      [warn("1", "a", "A paragraph has 6 sentences (limit 5).")],
    ],
    [
      "inclusive",
      "terms",
      withLessons(
        lesson([
          p("a", "Add it to the whitelist, guys."),
          p("b", "Whitelisted hosts load."),
        ]),
      ),
      [
        warn("1", "a", 'Uses "whitelist". Try "allowlist".'),
        warn("1", "a", 'Uses "guys". Try "everyone".'),
        warn("1", "b", 'Uses "Whitelisted". Try "allowlist".'),
      ],
    ],
    [
      "lesson-titles",
      "has-name",
      withLessons(lesson([], 1, " ")),
      [warn("1", null, "This lesson has no name.")],
    ],
    [
      "lesson-titles",
      "unique-names",
      withLessons(lesson([], 1, "Load data"), lesson([], 2, "load  DATA")),
      [warn("2", null, "Same name as Lesson 1 · Load data.")],
    ],
    [
      "lesson-titles",
      "name-length",
      withLessons(lesson([], 1, "x".repeat(61))),
      [warn("1", null, "The name is 61 characters (limit 60).")],
    ],
  ])("%s/%s flags", async (checkId, ruleId, doc, expected) => {
    expect(await run(checkId, ruleId, doc as ScanDocument)).toEqual(expected);
  });

  it.each([
    [
      "style",
      "sentence-case",
      withLessons(
        lesson([
          h("a", "Load data with Python and SQL"),
          h("b", "Part 2: Clean the JavaScript output"),
          h("c", "Python's types"),
        ]),
      ),
    ],
    [
      "style",
      "swears",
      withLessons(
        lesson([p("a", "Fly from the cockpit, then add cumin and shiitake.")]),
      ),
    ],
    [
      "quality",
      "empty-blocks",
      withLessons(
        lesson([
          h("a", "A heading"),
          { id: "l", type: "list", items: ["One"] },
          { id: "i", type: "image", url: "/uploads/a.png", caption: "" },
          { id: "v", type: "video", url: "https://youtu.be/abc" },
          { id: "o", type: "quiz-open", question: "Why?", correctAnswer: "" },
          {
            id: "c",
            type: "code",
            variant: "code",
            language: null,
            code: "x = 1",
            runnable: false,
          },
        ]),
      ),
    ],
    [
      "spelling",
      "dictionary",
      withLessons(
        lesson([
          p(
            "a",
            "The API doesn't re-render the DataFrame's 3 rows on iOS, so useState and numpy help.",
          ),
          // Words in inline code aren't spell-checked
          {
            id: "b",
            type: "paragraph",
            text: "Call frobnicate() first.",
            inlineCode: ["frobnicate()"],
          },
        ]),
      ),
    ],
    [
      "spelling",
      "doubled-words",
      withLessons(lesson([p("a", "Read the file. The end.")])),
    ],
    [
      "spelling",
      "unclosed",
      withLessons(lesson([p("a", 'Call it (twice) and say “hi” and "bye".')])),
    ],
    [
      "readability",
      "sentence-length",
      withLessons(lesson([p("a", `${nWords(25)}.`)])),
    ],
    [
      "readability",
      "paragraph-length",
      withLessons(
        lesson([
          p("a", "One. Two. Three. Four. Five."),
          // A list isn't a paragraph, however many items it has
          { id: "l", type: "list", items: ["1", "2", "3", "4", "5", "6"] },
        ]),
      ),
    ],
    [
      "inclusive",
      "terms",
      withLessons(lesson([p("a", "Add it to the allowlist, everyone.")])),
    ],
    ["lesson-titles", "has-name", withLessons(lesson([], 1, "Load data"))],
    [
      "lesson-titles",
      "unique-names",
      withLessons(lesson([], 1, "Load data"), lesson([], 2, "Clean data")),
    ],
    [
      "lesson-titles",
      "name-length",
      withLessons(lesson([], 1, "x".repeat(60))),
    ],
  ])("%s/%s passes", async (checkId, ruleId, doc) => {
    expect(await run(checkId, ruleId, doc)).toEqual([]);
  });

  it("flags only the sample's seven-sentence paragraph", async () => {
    const flags = (
      await Promise.all(
        CONTENT_CHECKS.flatMap((c) => c.rules).map((r) =>
          r.run(sampleScanDocument, noFetch),
        ),
      )
    ).flat();
    expect(flags).toEqual([
      warn("102", "l2-p1", "A paragraph has 7 sentences (limit 5)."),
    ]);
  });
});
