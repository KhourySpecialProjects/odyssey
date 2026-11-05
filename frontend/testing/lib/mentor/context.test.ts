import {
  buildLessonContext,
  citationsFor,
  lessonAnchorContent,
  locateSelection,
} from "@/lib/mentor/context";
import { resolveAnchor } from "@/lib/anchors/resolve";
import type { MentorLesson } from "@/lib/mentor/types";
import {
  blockNoteLesson,
  blockNoteLessonWith,
  bn,
  classicLesson,
  mentorDroplet,
  paragraph,
} from "@/testing/mocks/mentorLessonMock";

const build = (lesson: MentorLesson, maxTokens?: number) =>
  buildLessonContext(lesson, mentorDroplet, { maxTokens });

const header = (lessonName: string) =>
  [
    "Droplet: Databases 101",
    "Difficulty: beginner",
    "Learning objectives:",
    "- Write a join",
    "- Choose an index",
    `Lesson: ${lessonName}`,
  ].join("\n");

const CLASSIC_TEXT = [
  header("Joining tables"),
  "[p1] ## Joins",
  "[p2] A join combines rows from **two** tables.",
  "[p3] Keys matter.",
  "[p4] - Inner join\n- Left join",
  "[Image: Entity diagram]",
  "[p5] Keys matter.",
  "[p6] Wrapped paragraph.",
  "[p7] Loose text *here*.",
  "[p8]\n```\nx = 1\ny = 2\n```",
  "[p9] | Key | Kind |\n| id | primary |",
  "[p10] [Callout, warning] Watch for:\n- NULL keys\n  - In outer joins\n- Duplicates\n[Image: Callout diagram]",
  "[p11] [Expandable section] Deep dive",
  "[p12] Hash joins build a table first.",
  "[p13] [Quiz question] What does a LEFT JOIN keep?\n  - All rows from the left table\n  - Only matching rows\n  - Only *unmatched* rows",
  "[p14] [Quiz question] Is every join slow?\n  - Yes\n  - No",
  "[p15] [Quiz question] Which are joins?\n  - INNER\n  - OUTER\n  - SIDEWAYS",
  "[p16] [Open-ended question] Name a join type.",
  "[p17] [Open-ended question] Why index a foreign key?",
  "[Video: https://www.youtube.com/embed/abc]",
  "[p18] [Code block, sql, runnable]\n```sql\nSELECT *\nFROM a\nLEFT JOIN b ON a.id = b.a_id;\n```",
  "[p19] [Interactive code sandbox, react template]\nTry a join in the sandbox.\nFiles: /App.js",
].join("\n\n");

const BLOCKNOTE_TEXT = [
  header("Indexes"),
  "[p1] ## Indexes",
  "[p2] An index speeds up **reads**.",
  "[p3] It costs writes.",
  "[p4] Parent text.",
  "[p5] Child text.",
  "[p6] - B-tree",
  "[p7]   - Balanced",
  "[p8] - Hash",
  "[p9]   For equality only.",
  "[p10] 1. Create the index",
  "[p11] 2. Run the query",
  "[p12] [Callout, warning] Indexes take space.",
  "[p13] | Index | Speed |\n| --- | --- |\n| B-tree | Fast |",
  "[p14] [Code block, sql, runnable]\n```sql\nCREATE INDEX idx ON users(email);\n```",
  "[Image: Index diagram]",
  "[p15] [Quiz question] Which index suits range queries?\n  - B-tree\n  - Hash\n  - Bitmap",
  "[p16] [Quiz question] Indexes are free.\n  - True\n  - False",
  "[p17] [Open-ended question] Why not index every column?",
  "[p18] $O(\\log n)$",
  "[p19] [Code block, python, editable, runnable]\n```python\ndf.head()\n```",
  "[p20] [Interactive code sandbox, react template]\nEdit the query.\nFiles: /App.js",
].join("\n\n");

// The BlockNote block each ref names, in page order
const BLOCKNOTE_SOURCES = [
  "heading-1",
  "para-1",
  "para-2",
  "para-3",
  "para-3a",
  "bullet-1",
  "bullet-1a",
  "bullet-2",
  "bullet-2p",
  "num-1",
  "num-2",
  "callout-1",
  "table-1",
  "code-1",
  "mc-1",
  "tf-1",
  "oe-1",
  "latex-1",
  "nb-1",
  "sp-1",
];

const noSpace = (s: string) => s.replace(/\s/g, "");

describe("buildLessonContext", () => {
  it.each([
    ["Classic", classicLesson(), "classic", CLASSIC_TEXT],
    ["BlockNote", blockNoteLesson(), "blocknote", BLOCKNOTE_TEXT],
  ])(
    "%s: the prompt text, every passage once, in page order",
    (_, lesson, format, text) => {
      const ctx = build(lesson);
      expect(ctx).toMatchObject({
        lessonId: lesson.id,
        format,
        text,
        omitted: 0,
        trimmed: false,
      });
      expect(ctx.tokens).toBe(Math.ceil(text.length / 4));
      expect(ctx.passages.every((p) => p.inPrompt)).toBe(true);
    },
  );

  it.each([
    ["Classic", classicLesson(), 19],
    ["BlockNote", blockNoteLesson(), 20],
  ])("%s: every ref resolves to the passage it names", (_, lesson, refs) => {
    const { passages } = build(lesson);
    const content = lessonAnchorContent(lesson);
    const cited = passages.filter((p) => p.ref);
    expect(cited.map((p) => p.ref)).toEqual(
      Array.from({ length: refs }, (_, i) => `p${i + 1}`),
    );
    for (const { ref, anchor, plain } of cited) {
      const range = resolveAnchor(content, anchor!);
      if (range === "outdated") throw new Error(`${ref} is outdated`);
      expect(range.exact).toBe(true);
      expect(range.blockId).toBe(anchor!.blockId);
      if (!anchor!.quote) continue;
      const block = content.blocks.find((b) => b.id === anchor!.blockId)!;
      expect(block.text.slice(range.start, range.end)).toBe(anchor!.quote);
      // What the sidebar looks for on the page, whitespace aside
      expect(noSpace(plain)).toContain(noSpace(anchor!.quote));
    }
    // Images and videos are in the prompt, but can't be cited
    for (const p of passages.filter((p) => !p.ref)) {
      expect(p).toMatchObject({ anchor: null, plain: "" });
      expect(p.markdown).toMatch(/^\[(Image|Video): /);
    }
  });

  it("names each BlockNote block's own id, merged paragraphs and nested items included", () => {
    const { passages } = build(blockNoteLesson());
    expect(passages.flatMap((p) => p.anchor?.blockId ?? [])).toEqual(
      BLOCKNOTE_SOURCES,
    );
  });

  it.each([
    [
      "Classic",
      classicLesson(),
      [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 4, 4, 5, 5, 5, 6, 6, 7, 8, 9],
    ],
    [
      "BlockNote",
      blockNoteLesson(),
      [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    ],
  ])(
    "%s: each passage has its block's index in the blocks the page draws",
    (_, lesson, indexes) => {
      expect(build(lesson).passages.map((p) => p.blockIndex)).toEqual(indexes);
    },
  );

  it("tells a repeated Classic sentence's copies apart", () => {
    const copies = build(classicLesson()).passages.filter(
      (p) => p.anchor?.quote === "Keys matter.",
    );
    expect(copies.map((p) => p.ref)).toEqual(["p3", "p5"]);
    expect(copies[0].anchor!.start).toBeLessThan(copies[1].anchor!.start!);
  });

  it("gives no ref to blocks that share an id, which could point at either", () => {
    const ctx = build(
      blockNoteLessonWith([
        paragraph("dup", "Alpha"),
        paragraph("dup", "Beta"),
        paragraph("own", "Gamma"),
      ]),
    );
    expect(ctx.passages.map((p) => [p.plain, p.ref])).toEqual([
      ["Alpha", null],
      ["Beta", null],
      ["Gamma", "p1"],
    ]);
  });

  it("fences code that holds a fence of its own, keeping its blank lines", () => {
    const ctx = build(
      blockNoteLessonWith([
        bn("code", "code-block", { language: "md", code: "a\n```\n\nb" }),
        paragraph("after", "After."),
      ]),
    );
    expect(ctx.passages.map((p) => p.markdown)).toEqual([
      "[Code block, md]\n````md\na\n```\n\nb\n````",
      "After.",
    ]);
  });

  // Each way a lesson stores an answer, flipped: nothing may change
  it.each([
    [
      "Classic multiple choice",
      classicLesson(),
      classicLesson({ mc: 413, yesNo: 421, multi: [432, 433] }),
    ],
    [
      "BlockNote multiple choice",
      blockNoteLesson(),
      blockNoteLesson({ mc: 2 }),
    ],
    [
      "BlockNote true/false",
      blockNoteLesson(),
      blockNoteLesson({ trueFalse: true }),
    ],
    [
      "Classic open-ended",
      classicLesson(),
      classicLesson({ open: "SENTINEL-NEW" }),
    ],
    [
      "BlockNote open-ended",
      blockNoteLesson(),
      blockNoteLesson({ open: "SENTINEL-NEW" }),
    ],
  ])(
    "%s: no answer in the output, and it doesn't depend on the answer",
    (_, lesson, flipped) => {
      const ctx = build(lesson);
      expect(build(flipped)).toEqual(ctx);
      expect(lessonAnchorContent(flipped)).toEqual(lessonAnchorContent(lesson));
      // SENTINEL also catches a notebook's hidden tests
      const output = JSON.stringify([ctx, lessonAnchorContent(lesson)]);
      for (const leak of [
        "isCorrect",
        "correctAnswer",
        "(correct)",
        "Expected answer",
        "SENTINEL",
      ]) {
        expect(output).not.toContain(leak);
      }
    },
  );
});

describe("the size budget", () => {
  const paragraphs = (...lengths: number[]) =>
    blockNoteLessonWith(
      lengths.map((length, i) =>
        paragraph(`long-${i}`, `${i}:`.padEnd(length, "x")),
      ),
    );
  const last = "the last passage of this lesson is left out";
  const rest = "the rest of this passage is left out";

  it("leaves whole passages out from the end, with a note", () => {
    const ctx = build(paragraphs(...Array<number>(120).fill(400)));
    const left = ctx.passages.filter((p) => !p.inPrompt);
    expect(ctx.tokens).toBeLessThanOrEqual(8000);
    expect(ctx).toMatchObject({ omitted: left.length, trimmed: true });
    expect(left.length).toBeGreaterThan(0);
    // Only the end is left out, and refs stay as they were
    expect(ctx.passages.slice(-left.length)).toEqual(left);
    expect(left[0].ref).toBe(`p${121 - left.length}`);
    expect(ctx.text).toMatch(
      new RegExp(
        `\\n\\n\\[Trimmed: the last ${left.length} passages of this lesson are left out for length\\.\\]$`,
      ),
    );
    expect(
      citationsFor(ctx, `[${left[0].ref}] [p1]`).map((c) => c.ref),
    ).toEqual(["p1"]);
  });

  it.each([
    [
      "cuts the passage that crosses the budget",
      [30, 9000, 30],
      [true, true, false],
      `[p2] 1:x+…\\n\\n\\[Trimmed: ${last}`,
    ],
    [
      "cuts a first passage too long to fit",
      [9000, 30],
      [true, false],
      `[p1] 0:x+…\\n\\n\\[Trimmed: ${last}`,
    ],
    [
      "cuts a last passage, and says so",
      [30, 9000],
      [true, true],
      `[p2] 1:x+…\\n\\n\\[Trimmed: ${rest}`,
    ],
    [
      "cuts a lesson's only passage, and says so",
      [9000],
      [true],
      `[p1] 0:x+…\\n\\n\\[Trimmed: ${rest}`,
    ],
    [
      "leaves out a passage when too little of it fits",
      [3700, 1000],
      [true, false],
      `[p1] 0:x+\\n\\n\\[Trimmed: ${last}`,
    ],
  ])("%s", (_, lengths, inPrompt, ending) => {
    const ctx = build(paragraphs(...lengths), 1000);
    expect(ctx.passages.map((p) => p.inPrompt)).toEqual(inPrompt);
    expect(ctx.text).toMatch(new RegExp(`\\${ending} for length\\.\\]$`));
    expect(ctx).toMatchObject({
      trimmed: true,
      omitted: inPrompt.filter((x) => !x).length,
    });
    expect(ctx.tokens).toBeLessThanOrEqual(1000);
  });

  it("closes a code fence that a cut leaves open", () => {
    const code = (id: string, lines: number) =>
      bn(id, "code-block", {
        language: "sql",
        code: "SELECT 1;\n".repeat(lines),
      });
    const ctx = build(
      blockNoteLessonWith([code("a", 2000), code("b", 1)]),
      1000,
    );
    expect(ctx.text).toMatch(/…\n```\n\n\[Trimmed: the last passage/);
    expect(ctx.tokens).toBeLessThanOrEqual(1000);
  });
});

describe("citationsFor", () => {
  it("gives the cited passages in the order cited, and skips unknown refs", () => {
    const ctx = build(blockNoteLesson());
    const [heading, para] = ctx.passages;
    expect(citationsFor(ctx, "See [p2] and [p1, p2], [p99]")).toEqual([
      {
        ref: "p2",
        anchor: para.anchor,
        blockIndex: 1,
        label: "An index speeds up reads.",
      },
      { ref: "p1", anchor: heading.anchor, blockIndex: 0, label: "Indexes" },
    ]);
  });

  const blockNote = build(blockNoteLesson());
  const classic = build(classicLesson());
  it.each([
    ["a list", classic, "p4", "Inner join Left join"],
    [
      "a callout",
      classic,
      "p10",
      "Watch for: NULL keys In outer joins Duplicates",
    ],
    ["a table", classic, "p9", "Key Kind id primary"],
    ["code", classic, "p18", "SELECT * FROM a LEFT JOIN b ON a.id = b.a_id;"],
    [
      "a quiz question, cut at a word",
      classic,
      "p13",
      "What does a LEFT JOIN keep? All rows from the left table Only matching rows…",
    ],
    ["an expandable's title", classic, "p11", "Deep dive"],
    ["a BlockNote table", blockNote, "p13", "Index Speed B-tree Fast"],
    ["a list item's paragraph", blockNote, "p9", "For equality only."],
    ["a formula", blockNote, "p18", "$O(\\log n)$"],
    ["a sandbox", blockNote, "p20", "Edit the query. Files: /App.js"],
  ])("labels %s with its words", (_, ctx, ref, label) => {
    expect(citationsFor(ctx, `[${ref}]`)[0].label).toBe(label);
  });
});

describe("locateSelection", () => {
  const blockNote = build(blockNoteLesson());
  const classic = build(classicLesson());

  it.each([
    ["a BlockNote paragraph", blockNote, "speeds up reads", ["p2"]],
    [
      "two paragraphs, as a browser copies them",
      blockNote,
      "It costs writes.\n\nParent text.",
      ["p3", "p4"],
    ],
    ["a list item's paragraph", blockNote, "For equality", ["p9"]],
    ["a code block", blockNote, "INDEX idx ON", ["p14"]],
    ["a quiz option", blockNote, "Bitmap", ["p15"]],
    ["a table, across cells", blockNote, "Index\tSpeed\nB-tree", ["p13"]],
    ["a callout's nested list", classic, "NULL keys\nIn outer joins", ["p10"]],
    ["an expandable's content", classic, "build a table", ["p12"]],
    ["every copy of repeated text", classic, "Keys matter.", ["p3", "p5"]],
    ["text that isn't in the lesson", classic, "Not in the lesson", null],
    ["an open-ended answer", classic, "SENTINEL-ANSWER-1", null],
    ["an image's alt text", blockNote, "Index diagram", null],
    ["only whitespace", classic, " \n ", null],
  ])("%s", (_, ctx, selection, refs) => {
    expect(locateSelection(ctx, selection)).toEqual(refs);
  });

  it("finds text the budget left out of the prompt", () => {
    const lesson = blockNoteLessonWith([
      paragraph("a", "x".repeat(5000)),
      paragraph("b", "The very end."),
    ]);
    const ctx = build(lesson, 500);
    expect(ctx.passages[1].inPrompt).toBe(false);
    expect(locateSelection(ctx, "very end")).toEqual(["p2"]);
  });

  it("gives no refs for text it finds in a passage that can't be cited", () => {
    const ctx = build(blockNoteLessonWith([paragraph("", "No id here.")]));
    expect(locateSelection(ctx, "No id")).toEqual([]);
  });
});
