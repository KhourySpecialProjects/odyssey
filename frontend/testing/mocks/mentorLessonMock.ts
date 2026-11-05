import type { Block, CustomBlockNoteBlock } from "@/types";
import type { MentorDroplet, MentorLesson } from "@/lib/mentor/types";

// Lessons for Mentor's tests (ODY-882): every block type, once per format.
// Each correct answer can be overridden, so a test can flip it and check the
// output doesn't change. Answers and a notebook's hidden tests are sentinels
// no output may hold.

export const mentorDroplet: MentorDroplet = {
  name: "Databases 101",
  difficulty: "beginner",
  learningObjectives: ["Write a join", "Choose an index"],
};

type CalloutContent = Extract<
  Block,
  { __component: "droplets.callout" }
>["content"];

const strapiText = (t: string) => ({ type: "text", text: t });
const listItem = (t: string) => ({
  type: "list-item",
  children: [strapiText(t)],
});

/**
 * A Classic lesson. `mc` and `yesNo` are the correct option ids of the
 * first two questions, `multi` the third's.
 */
export const classicLesson = ({
  mc = 411,
  yesNo = 422,
  multi = [431, 432],
  open = "SENTINEL-ANSWER-1",
}: {
  mc?: number;
  yesNo?: number;
  multi?: number[];
  open?: string;
} = {}): MentorLesson => ({
  id: 101,
  name: "Joining tables",
  blocksVersion: "v1",
  blocks: [
    {
      __component: "droplets.generic",
      id: 1,
      content: [
        "<h2>Joins</h2>",
        "<p>A join combines rows from <strong>two</strong> tables.</p>",
        "<p>Keys matter.</p>",
        "<ul><li>Inner join</li><li>Left join</li></ul>",
        '<figure><img src="/er.png" alt="Entity diagram"></figure>',
      ].join("\n"),
    },
    { __component: "droplets.generic", id: 2, content: "<p>Keys matter.</p>" },
    {
      __component: "droplets.generic",
      id: 3,
      content: [
        '<div class="note"><p>Wrapped paragraph.</p></div>',
        "Loose text <em>here</em>.",
        "<pre><code>x = 1\ny = 2</code></pre>",
        "<table><tr><th>Key</th><th>Kind</th></tr><tr><td>id</td><td>primary</td></tr></table>",
      ].join(""),
    },
    {
      __component: "droplets.callout",
      id: 1,
      type: "warning",
      color: "bg-red-300",
      content: [
        { type: "paragraph", children: [strapiText("Watch for:")] },
        {
          type: "list",
          format: "unordered",
          children: [
            listItem("NULL keys"),
            {
              type: "list",
              format: "unordered",
              children: [listItem("In outer joins")],
            },
            listItem("Duplicates"),
          ],
        },
        {
          type: "image",
          image: { url: "/callout.png", alternativeText: "Callout diagram" },
          children: [strapiText("")],
        },
      ] as unknown as CalloutContent,
    },
    {
      __component: "droplets.expandable",
      id: 1,
      title: "Deep dive",
      content: "<p>Hash joins build a table first.</p>",
    },
    {
      __component: "droplets.quiz",
      id: 1,
      questions: [
        {
          id: 41,
          content: "<p>What does a LEFT JOIN keep?</p>",
          answerOptions: [
            { id: 411, content: "All rows from the left table" },
            { id: 412, content: "Only matching rows" },
            { id: 413, content: "<p>Only <em>unmatched</em> rows</p>" },
          ].map((o) => ({ ...o, isCorrect: o.id === mc })),
        },
        {
          id: 42,
          content: "Is every join slow?",
          answerOptions: [
            { id: 421, content: "Yes" },
            { id: 422, content: "No" },
          ].map((o) => ({ ...o, isCorrect: o.id === yesNo })),
        },
        {
          id: 43,
          content: "Which are joins?",
          answerOptions: [
            { id: 431, content: "INNER" },
            { id: 432, content: "OUTER" },
            { id: 433, content: "SIDEWAYS" },
          ].map((o) => ({ ...o, isCorrect: multi.includes(o.id) })),
        },
      ],
    },
    {
      __component: "droplets.open-ended-quiz",
      id: 1,
      questions: [
        // Shares its id with a choice question: they're different tables
        { id: 41, content: "<p>Name a join type.</p>", correctAnswer: open },
        { id: 77, content: "Why index a foreign key?", correctAnswer: open },
      ],
    },
    {
      __component: "droplets.video",
      id: 1,
      url: "https://www.youtube.com/embed/abc",
    },
    {
      __component: "droplets.code-block",
      id: 1,
      language: "sql",
      code: "SELECT *\nFROM a\nLEFT JOIN b ON a.id = b.a_id;",
      editable: false,
      runnable: true,
    },
    {
      __component: "droplets.sandpack-block",
      id: 1,
      template: "react",
      files: '{"/App.js":"export default () => null"}',
      showPreview: true,
      editable: true,
      description: "Try a join in the sandbox.",
    },
  ],
});

export const text = (t: string, styles: Record<string, boolean> = {}) => ({
  type: "text",
  text: t,
  styles,
});

/** A BlockNote block */
export const bn = (
  id: string,
  type: string,
  props: Record<string, unknown> = {},
  content?: unknown[],
  children: CustomBlockNoteBlock[] = [],
): CustomBlockNoteBlock => ({ id, type, props, content, children });

export const paragraph = (id: string, t: string) =>
  bn(id, "paragraph", {}, [text(t)]);

const cell = (t: string) => ({
  type: "tableCell",
  props: {},
  content: [text(t)],
});

/**
 * A BlockNote lesson. `mc` is the index of the correct option, `trueFalse`
 * the true/false answer. The multiple-choice quiz is at index 13 and the
 * true/false at 14, which their option ids are made from.
 */
export const blockNoteLesson = ({
  mc = 0,
  trueFalse = false,
  open = "SENTINEL-ANSWER-2",
}: { mc?: number; trueFalse?: boolean; open?: string } = {}): MentorLesson => ({
  id: 102,
  name: "Indexes",
  blocksVersion: "v2",
  blocks: [],
  blocksV2: [
    bn("heading-1", "heading", { level: 2 }, [text("Indexes")]),
    bn("para-1", "paragraph", {}, [
      text("An index speeds up "),
      text("reads", { bold: true }),
      text("."),
    ]),
    paragraph("para-2", "It costs writes."),
    bn(
      "para-3",
      "paragraph",
      {},
      [text("Parent text.")],
      [paragraph("para-3a", "Child text.")],
    ),
    bn(
      "bullet-1",
      "bulletListItem",
      {},
      [text("B-tree")],
      [bn("bullet-1a", "bulletListItem", {}, [text("Balanced")])],
    ),
    bn(
      "bullet-2",
      "bulletListItem",
      {},
      [text("Hash")],
      [paragraph("bullet-2p", "For equality only.")],
    ),
    bn("num-1", "numberedListItem", {}, [text("Create the index")]),
    bn("num-2", "numberedListItem", {}, [text("Run the query")]),
    bn("empty-1", "paragraph", {}, []),
    bn("callout-1", "callout", { calloutType: "warning" }, [
      text("Indexes take space."),
    ]),
    {
      ...bn("table-1", "table"),
      content: {
        type: "tableContent",
        columnWidths: [null, null],
        rows: [
          { cells: [cell("Index"), cell("Speed")] },
          { cells: [cell("B-tree"), cell("Fast")] },
        ],
      },
    },
    bn("code-1", "code-block", {
      language: "sql",
      code: "CREATE INDEX idx ON users(email);",
      runnable: true,
    }),
    bn("image-1", "image", { url: "/idx.png", name: "Index diagram" }),
    bn("mc-1", "quiz-multiple-choice", {
      question: "Which index suits range queries?",
      options: JSON.stringify(
        ["B-tree", "Hash", "Bitmap"].map((t, i) => ({
          id: String(i + 1),
          text: t,
          isCorrect: i === mc,
        })),
      ),
    }),
    bn("tf-1", "quiz-true-false", {
      question: "Indexes are free.",
      correctAnswer: trueFalse,
    }),
    bn("oe-1", "quiz-open-ended", {
      question: "Why not index every column?",
      correctAnswer: open,
    }),
    bn("latex-1", "latex", { content: "O(\\log n)", displayMode: true }),
    // Converted with their index as their id, not their BlockNote id
    bn("nb-1", "notebook-code", {
      language: "python",
      code: "df.head()",
      editable: "true",
      testCode: "assert SENTINEL_TEST",
    }),
    bn("sp-1", "sandpack-block", {
      template: "react",
      files: '{"/App.js":"export default () => null"}',
      description: "Edit the query.",
    }),
    bn("divider-1", "divider"),
  ],
});

/** The BlockNote lesson with other blocks */
export const blockNoteLessonWith = (
  blocksV2: CustomBlockNoteBlock[],
): MentorLesson => ({ ...blockNoteLesson(), blocksV2 });
