import {
  buildScanDocument,
  type ScanSourceDroplet,
  type ScanSourceLesson,
} from "@/lib/overview-scan/snapshot";
import type { Block, CustomBlockNoteBlock } from "@/types";

const droplet = (
  overrides: Partial<ScanSourceDroplet> = {},
): ScanSourceDroplet => ({ id: 7, name: "Cleaning Data", ...overrides });

const bn = (
  id: string,
  type: string,
  props: Record<string, unknown> = {},
  content?: unknown[],
  children: CustomBlockNoteBlock[] = [],
): CustomBlockNoteBlock => ({ id, type, props, content, children });

const text = (t: string) => ({ type: "text", text: t, styles: {} });
const link = (href: string, t: string) => ({
  type: "link",
  href,
  content: [text(t)],
});

/** The blocks of a doc with this one lesson. */
const blocksOf = (lesson: Omit<ScanSourceLesson, "id" | "name">) =>
  buildScanDocument(droplet(), [{ id: 1, name: "A lesson", ...lesson }])
    .parts[1].blocks;

describe("buildScanDocument", () => {
  it("reads the droplet page's fields, with the Overview as plain-text blocks", () => {
    const doc = buildScanDocument(
      droplet({
        originalDropletId: 5,
        overview:
          '<p>Learn to <a href=" https://pandas.pydata.org ">clean</a>\n data.</p><p>Fish &amp; chips.</p><img src="/uploads/chart.png" alt="A chart">',
        description: "  A short   description ",
        difficulty: "beginner",
        learningObjectives: [{ objective: "Load a CSV" }],
        tags: [{ name: "pandas" }],
        prerequisites: [
          { id: 3, name: "Intro", status: "published", isHidden: false },
        ],
        funFact: "Pandas eat bamboo.",
        nextSteps: [{ url: " https://example.org " }],
        datasets: [
          { name: "loans.csv", fileUrl: "https://cdn.test/loans.csv" },
        ],
      }),
      [],
    );

    expect(doc.droplet).toEqual({
      id: 7,
      originalDropletId: 5,
      name: "Cleaning Data",
      overview: "Learn to clean data. Fish & chips.",
      description: "A short description",
      learningObjectives: ["Load a CSV"],
      difficulty: "beginner",
      tags: ["pandas"],
      prerequisites: [
        { id: 3, name: "Intro", status: "published", isHidden: false },
      ],
      postrequisites: [],
      funFact: "Pandas eat bamboo.",
      nextSteps: [{ label: "", url: "https://example.org" }],
      datasets: [
        {
          name: "loans.csv",
          fileUrl: "https://cdn.test/loans.csv",
          rowCount: null,
        },
      ],
    });
    expect(doc.parts).toEqual([
      {
        id: "droplet",
        kind: "droplet",
        name: "",
        title: "Droplet page",
        blocks: [
          {
            id: "overview",
            type: "paragraph",
            text: "Learn to clean data.",
            links: [{ text: "clean", url: "https://pandas.pydata.org" }],
          },
          { id: "overview", type: "paragraph", text: "Fish & chips." },
          {
            id: "overview",
            type: "image",
            url: "/uploads/chart.png",
            caption: "A chart",
          },
        ],
      },
    ]);
  });

  it("gives a droplet with no lessons and no details only an empty droplet page", () => {
    expect(buildScanDocument(droplet(), [])).toEqual({
      droplet: {
        id: 7,
        originalDropletId: null,
        name: "Cleaning Data",
        overview: "",
        description: "",
        learningObjectives: [],
        difficulty: null,
        tags: [],
        prerequisites: [],
        postrequisites: [],
        funFact: "",
        nextSteps: [],
        datasets: [],
      },
      parts: [
        {
          id: "droplet",
          kind: "droplet",
          name: "",
          title: "Droplet page",
          blocks: [],
        },
      ],
    });
  });

  it("makes each lesson a part, in the order given", () => {
    const doc = buildScanDocument(droplet(), [
      { id: 12, name: "Load the data", blocksVersion: "v2", blocksV2: [] },
      { id: 4, name: "Clean it", blocks: [] },
    ]);

    expect(doc.parts.slice(1)).toEqual([
      {
        id: "12",
        kind: "lesson",
        name: "Load the data",
        title: "Lesson 1 · Load the data",
        blocks: [],
      },
      {
        id: "4",
        kind: "lesson",
        name: "Clean it",
        title: "Lesson 2 · Clean it",
        blocks: [],
      },
    ]);
  });

  it("reads a BlockNote lesson's blocks", () => {
    const blocks = blocksOf({
      blocksVersion: "v2",
      blocks: [{ __component: "droplets.video", url: "ignored" }],
      blocksV2: [
        bn("h", "heading", { level: 2 }, [text("Load  the data")]),
        bn("p", "paragraph", {}, [
          text("Read the "),
          link(" https://pandas.pydata.org ", "docs"),
          text(", then run "),
          { type: "text", text: "df.isna()", styles: { code: true } },
          text("."),
        ]),
        bn("empty", "paragraph", {}, []),
        bn("eh", "heading", { level: 3 }, []),
        bn(
          "l1",
          "bulletListItem",
          {},
          [text("One")],
          [bn("l2", "numberedListItem", {}, [text("Two")])],
        ),
        bn("l3", "bulletListItem", {}, [text("Three")]),
        bn("c", "callout", { calloutType: "warning" }, [text("Careful.")]),
        bn("ec", "callout", {}, []),
        bn("img", "image", { url: "/uploads/a.png", caption: " A chart " }),
        bn("v", "video", { url: "https://youtu.be/abc" }),
        bn("mc", "quiz-multiple-choice", {
          question: "Which?",
          options:
            '[{"id":"1","text":"A","isCorrect":true},{"id":"2","text":"B"}]',
        }),
        bn("mc2", "quiz-multiple-choice", {
          question: "Which again?",
          options: [{ text: "C", isCorrect: true }],
        }),
        bn("tf", "quiz-true-false", {
          question: "True?",
          correctAnswer: false,
        }),
        bn("open", "quiz-open-ended", {
          question: "Why?",
          correctAnswer: "So.",
        }),
        bn("code", "code-block", {
          language: "python",
          code: "x = 1\n  y = 2",
          runnable: true,
        }),
        bn("nb", "notebook-code", { language: "python", code: "df.head()" }),
        bn("sp", "sandpack-block", {
          template: "react",
          files: '{"/App.js":"export default 1"}',
        }),
        bn("tex", "latex", { content: "x^2" }),
        bn("br", "slide-break"),
      ],
    });
    // A table's content isn't a list of inline content, so it's set apart
    const table = bn("t2", "table");
    table.content = {
      type: "tableContent",
      columnWidths: [null, null],
      rows: [
        { cells: [[text("Name")], [text("Link")]] },
        {
          cells: [
            { type: "tableCell", content: [text("pandas")] },
            {
              type: "tableCell",
              content: [link("https://pandas.org", "site")],
            },
          ],
        },
      ],
    };

    expect(blocks).toEqual([
      { id: "h", type: "heading", level: 2, text: "Load the data" },
      {
        id: "p",
        type: "paragraph",
        text: "Read the docs, then run df.isna().",
        links: [{ text: "docs", url: "https://pandas.pydata.org" }],
        inlineCode: ["df.isna()"],
      },
      { id: "eh", type: "heading", level: 3, text: "" },
      { id: "l1", type: "list", items: ["One", "Two", "Three"] },
      { id: "c", type: "callout", text: "Careful." },
      { id: "ec", type: "callout", text: "" },
      { id: "img", type: "image", url: "/uploads/a.png", caption: "A chart" },
      { id: "v", type: "video", url: "https://youtu.be/abc" },
      {
        id: "mc",
        type: "quiz-mc",
        question: "Which?",
        options: [
          { text: "A", isCorrect: true },
          { text: "B", isCorrect: false },
        ],
      },
      {
        id: "mc2",
        type: "quiz-mc",
        question: "Which again?",
        options: [{ text: "C", isCorrect: true }],
      },
      { id: "tf", type: "quiz-tf", question: "True?", correctAnswer: false },
      { id: "open", type: "quiz-open", question: "Why?", correctAnswer: "So." },
      {
        id: "code",
        type: "code",
        variant: "code",
        language: "python",
        code: "x = 1\n  y = 2",
        runnable: true,
      },
      {
        id: "nb",
        type: "code",
        variant: "notebook",
        language: "python",
        code: "df.head()",
        runnable: true,
      },
      {
        id: "sp",
        type: "sandpack",
        template: "react",
        files: { "/App.js": "export default 1" },
      },
    ]);
    expect(blocksOf({ blocksVersion: "v2", blocksV2: [table] })).toEqual([
      {
        id: "t2",
        type: "table",
        rows: [
          ["Name", "Link"],
          ["pandas", "site"],
        ],
        links: [{ text: "site", url: "https://pandas.org" }],
      },
    ]);
  });

  it("reads a legacy lesson's blocks", () => {
    const html = [
      "<h2>Load the data</h2><h3></h3>",
      '<p>Fish &amp; chips<br>with <a href="https://pandas.pydata.org">pandas</a>.</p>',
      "<p>Call <code>df.isna()</code> now.</p>",
      '<p><img src="/uploads/b.png" alt="A table"></p>',
      "<ul><li>One<ol><li>Two</li></ol></li><li>Three</li></ul>",
      '<figure class="image"><img src="/uploads/a.png" alt="A chart"><figcaption>Seen</figcaption></figure>',
      '<pre><code class="language-python">if a &lt; b:\n    print(a)</code></pre>',
      '<figure class="media"><oembed url="https://youtu.be/abc"></oembed></figure>',
      "<table><tr><th>Name</th></tr><tr><td>pandas</td></tr></table>",
      "Loose <b>text</b>",
    ].join("");
    const blocks: Block[] = [
      { __component: "droplets.generic", id: 1, content: html },
      { __component: "droplets.video", id: 2, url: " https://vimeo.com/1 " },
      {
        __component: "droplets.quiz",
        id: 3,
        questions: [
          {
            id: 1,
            content: "<p>Which?</p>",
            answerOptions: [
              { id: 1, content: "True", isCorrect: true },
              { id: 2, content: "False", isCorrect: false },
            ],
          },
        ],
      },
      {
        __component: "droplets.open-ended-quiz",
        id: 4,
        questions: [{ id: 1, content: "<p>Why?</p>", correctAnswer: "So." }],
      },
      {
        __component: "droplets.callout",
        id: 5,
        type: "info",
        color: "",
        content: [
          {
            type: "paragraph",
            children: [
              { type: "text", text: "See " },
              {
                type: "link",
                url: "https://x.org",
                children: [{ type: "text", text: "this" }],
              } as unknown as { type: string; text: string },
            ],
          },
        ],
      },
      {
        __component: "droplets.expandable",
        id: 6,
        title: "More",
        content: "<p>Hidden.</p>",
      },
    ];

    expect(blocksOf({ blocks })).toEqual([
      { id: "1", type: "heading", level: 2, text: "Load the data" },
      { id: "1", type: "heading", level: 3, text: "" },
      {
        id: "1",
        type: "paragraph",
        text: "Fish & chips with pandas.",
        links: [{ text: "pandas", url: "https://pandas.pydata.org" }],
      },
      {
        id: "1",
        type: "paragraph",
        text: "Call df.isna() now.",
        inlineCode: ["df.isna()"],
      },
      { id: "1", type: "image", url: "/uploads/b.png", caption: "A table" },
      { id: "1", type: "list", items: ["One", "Two", "Three"] },
      { id: "1", type: "image", url: "/uploads/a.png", caption: "A chart" },
      {
        id: "1",
        type: "code",
        variant: "code",
        language: "python",
        code: "if a < b:\n    print(a)",
        runnable: false,
      },
      { id: "1", type: "video", url: "https://youtu.be/abc" },
      { id: "1", type: "table", rows: [["Name"], ["pandas"]] },
      { id: "1", type: "paragraph", text: "Loose text" },
      { id: "2", type: "video", url: "https://vimeo.com/1" },
      {
        id: "3",
        type: "quiz-mc",
        question: "Which?",
        options: [
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false },
        ],
      },
      { id: "4", type: "quiz-open", question: "Why?", correctAnswer: "So." },
      {
        id: "5",
        type: "callout",
        text: "See this",
        links: [{ text: "this", url: "https://x.org" }],
      },
      { id: "6", type: "paragraph", text: "More" },
      { id: "6", type: "paragraph", text: "Hidden." },
    ]);
  });
});
