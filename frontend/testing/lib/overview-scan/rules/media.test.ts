import type { FetchUrl } from "@/lib/overview-scan/network";
import { MEDIA_CHECKS } from "@/lib/overview-scan/rules/media";
import type { ScanBlock, ScanDocument } from "@/lib/overview-scan/types";
import {
  lesson,
  sampleScanDocument,
  scanDoc,
} from "@/testing/mocks/overview-scan";

// The offline rules must never fetch
const noFetch: FetchUrl = () => {
  throw new Error("an offline rule fetched a URL");
};

function run(checkId: string, ruleId: string, doc: ScanDocument) {
  const rule = MEDIA_CHECKS.find((c) => c.id === checkId)?.rules.find(
    (r) => r.id === ruleId,
  );
  if (!rule) throw new Error(`no rule ${checkId}/${ruleId}`);
  return rule.run(doc, noFetch);
}

const withBlock = (block: ScanBlock) => scanDoc({ lessons: [lesson([block])] });

// Expected flags on the one block (id "b") of lesson 1
const on = (...messages: string[]) =>
  messages.map((message) => ({
    partId: "1",
    blockId: "b",
    message,
    severity: "warn",
  }));

const image = (caption: string): ScanBlock => ({
  id: "b",
  type: "image",
  url: "https://cdn.odyssey.test/a.png",
  caption,
});
const linked = (
  text: string,
  url = "https://pandas.pydata.org/",
): ScanBlock => ({
  id: "b",
  type: "paragraph",
  text,
  links: [{ text, url }],
});
const heading = (n: number): ScanBlock => ({
  id: "b",
  type: "heading",
  level: 2,
  text: Array.from({ length: n }, (_, i) => `word${i}`).join(" "),
});
const mc = (
  question: string,
  options: [string, boolean][] = [
    ["A DataFrame", true],
    ["A list", false],
  ],
): ScanBlock => ({
  id: "b",
  type: "quiz-mc",
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
});
const tf = (question: string): ScanBlock => ({
  id: "b",
  type: "quiz-tf",
  question,
  correctAnswer: true,
});
const open = (question: string, correctAnswer: string): ScanBlock => ({
  id: "b",
  type: "quiz-open",
  question,
  correctAnswer,
});
const codeBlock = (
  over: Partial<Extract<ScanBlock, { type: "code" }>> = {},
): ScanBlock => ({
  id: "b",
  type: "code",
  variant: "code",
  language: "python",
  code: "print(1)",
  runnable: true,
  ...over,
});
const sandpack = (
  template: string,
  files: Record<string, string>,
): ScanBlock => ({
  id: "b",
  type: "sandpack",
  template,
  files,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the offline media rules", () => {
  it.each<[string, string, string, ScanBlock, string[]]>([
    ["accessibility", "image-captions", "a caption", image("A chart"), []],
    [
      "accessibility",
      "image-captions",
      "no caption",
      image(""),
      ['This image has no caption, so screen readers only hear "Image".'],
    ],
    [
      "accessibility",
      "image-captions",
      "a blank caption",
      image("  "),
      ['This image has no caption, so screen readers only hear "Image".'],
    ],
    [
      "accessibility",
      "link-text",
      "descriptive text",
      linked("pandas guide"),
      [],
    ],
    ...["Click here", "read more", "https://x.org", "www.x.org"].map(
      (text): [string, string, string, ScanBlock, string[]] => [
        "accessibility",
        "link-text",
        `"${text}"`,
        linked(text),
        [`The link text "${text}" doesn't say where it goes.`],
      ],
    ),
    [
      "accessibility",
      "link-text",
      "a mailto link reading here",
      linked("here", "mailto:a@example.com"),
      ['The link text "here" doesn\'t say where it goes.'],
    ],
    ["accessibility", "heading-length", "12 words", heading(12), []],
    [
      "accessibility",
      "heading-length",
      "13 words",
      heading(13),
      [
        "This heading is 13 words (limit 12). A sentence made into a heading confuses screen-reader navigation.",
      ],
    ],
    [
      "quizzes",
      "question-text",
      "a multiple-choice question",
      mc("Pick one"),
      [],
    ],
    ["quizzes", "question-text", "a true/false question", tf("True?"), []],
    [
      "quizzes",
      "question-text",
      "a blank multiple-choice question",
      mc(" "),
      ["This question has no text."],
    ],
    [
      "quizzes",
      "question-text",
      "a blank true/false question",
      tf(""),
      ["This question has no text."],
    ],
    ["quizzes", "options", "a valid question", mc("Pick one"), []],
    [
      "quizzes",
      "options",
      "one option",
      mc("Pick one", [["Only", true]]),
      ["This question has fewer than 2 options."],
    ],
    [
      "quizzes",
      "options",
      "a blank option",
      mc("Pick one", [
        ["A", true],
        [" ", false],
      ]),
      ["This question has a blank option."],
    ],
    [
      "quizzes",
      "options",
      "a repeated option",
      mc("Pick one", [
        ["A", true],
        [" a ", false],
      ]),
      ["This question repeats an option."],
    ],
    [
      "quizzes",
      "options",
      "none correct",
      mc("Pick one", [
        ["A", false],
        ["B", false],
      ]),
      ["No option is marked correct."],
    ],
    [
      "quizzes",
      "options",
      "every problem at once",
      mc("Pick one", [["", false]]),
      [
        "This question has fewer than 2 options.",
        "This question has a blank option.",
        "No option is marked correct.",
      ],
    ],
    ["quizzes", "options", "a true/false question", tf("True?"), []],
    ["open-ended", "question-text", "a question", open("Why?", "Because."), []],
    [
      "open-ended",
      "question-text",
      "a blank question",
      open("", "Because."),
      ["This question has no text."],
    ],
    [
      "open-ended",
      "model-answer",
      "a model answer",
      open("Why?", "Because."),
      [],
    ],
    [
      "open-ended",
      "model-answer",
      "no model answer",
      open("Why?", " "),
      ["This question has no model answer to grade against."],
    ],
    ["code", "has-code", "code", codeBlock(), []],
    ["code", "has-code", "a notebook", codeBlock({ variant: "notebook" }), []],
    [
      "code",
      "has-code",
      "a Sandpack file",
      sandpack("react", { "/App.js": "x" }),
      [],
    ],
    [
      "code",
      "has-code",
      "blank code",
      codeBlock({ code: " \n" }),
      ["This code block is empty."],
    ],
    [
      "code",
      "has-code",
      "a blank notebook",
      codeBlock({ variant: "notebook", code: "" }),
      ["This notebook block is empty."],
    ],
    ...([{}, { "/a.js": " " }] as Record<string, string>[]).map(
      (files): [string, string, string, ScanBlock, string[]] => [
        "code",
        "has-code",
        `Sandpack files ${JSON.stringify(files)}`,
        sandpack("react", files),
        ["This Sandpack block has no files with code."],
      ],
    ),
    ["code", "language", "runnable python", codeBlock(), []],
    ["code", "language", "runnable c++", codeBlock({ language: "c++" }), []],
    [
      "code",
      "language",
      "runnable sql",
      codeBlock({ language: "sql" }),
      ['The code runner doesn\'t support "sql".'],
    ],
    [
      "code",
      "language",
      "runnable, no language",
      codeBlock({ language: null }),
      ["This code block has no language set."],
    ],
    [
      "code",
      "language",
      "display-only json",
      codeBlock({ language: "json", runnable: false }),
      [],
    ],
    [
      "code",
      "language",
      "display-only, no language",
      codeBlock({ language: null, runnable: false }),
      [],
    ],
    [
      "code",
      "language",
      "a notebook saying r",
      codeBlock({ variant: "notebook", language: "r" }),
      [],
    ],
    [
      "code",
      "language",
      "Sandpack react-ts",
      sandpack("react-ts", { "/App.tsx": "x" }),
      [],
    ],
    [
      "code",
      "language",
      "Sandpack angular",
      sandpack("angular", { "/app.ts": "x" }),
      ['Sandpack doesn\'t support the "angular" template.'],
    ],
  ])("%s / %s: %s", async (checkId, ruleId, _label, block, messages) => {
    expect(await run(checkId, ruleId, withBlock(block))).toEqual(
      on(...messages),
    );
  });

  it.each([
    ["A fact.", []],
    [
      " ",
      [
        {
          partId: "droplet",
          blockId: "fun-fact",
          message: "There's no fun fact.",
          severity: "warn",
        },
      ],
    ],
  ])("fun-fact / not-empty: %p", async (funFact, expected) => {
    expect(
      await run("fun-fact", "not-empty", scanDoc({ droplet: { funFact } })),
    ).toEqual(expected);
  });
});

describe("MEDIA_CHECKS", () => {
  it("lists the offline checks in the prototype's order", () => {
    expect(MEDIA_CHECKS.map((c) => [c.id, c.group])).toEqual([
      ["accessibility", "media"],
      ["quizzes", "media"],
      ["open-ended", "media"],
      ["code", "media"],
      ["fun-fact", "media"],
    ]);
  });

  it("flags only the sample droplet's missing caption and its vague link", async () => {
    const flags = [];
    for (const check of MEDIA_CHECKS)
      for (const rule of check.rules)
        flags.push(...(await rule.run(sampleScanDocument, noFetch)));

    expect(flags).toEqual([
      {
        partId: "102",
        blockId: "l2-img",
        message:
          'This image has no caption, so screen readers only hear "Image".',
        severity: "warn",
      },
      {
        partId: "104",
        blockId: "l4-p4",
        message: 'The link text "click here" doesn\'t say where it goes.',
        severity: "warn",
      },
    ]);
  });
});
