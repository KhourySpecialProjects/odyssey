import DOMPurify from "isomorphic-dompurify";
import { htmlTextContent } from "@/lib/anchors/html-text";
import { htmlContent } from "@/lib/anchors/content";
import { textOf, textParts } from "@/lib/anchors/dom";
import { classicLessonHtml } from "@/lib/review-classic";
import { overviewFieldHtml } from "@/lib/review-overview";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";
import type { Block } from "@/types";

// What ReviewTextView draws: sanitized HTML, read back from the DOM
const pageText = (html: string) => {
  const root = document.createElement("div");
  root.innerHTML = DOMPurify.sanitize(html);
  return textOf(textParts(root, false));
};

const classic: Block[] = [
  { __component: "droplets.generic", content: "<p>One &amp; two</p>" },
  { __component: "droplets.generic", content: SLIDE_BREAK_MARKER },
  {
    __component: "droplets.expandable",
    title: "Why <b>loops</b>?",
    content: "<p>Repetition.</p>",
  },
  {
    __component: "droplets.callout",
    color: "bg-sky-100",
    type: "info",
    content: [
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Watch: " },
          { type: "text", text: "bold", bold: true },
        ],
      },
      {
        type: "list",
        format: "ordered",
        children: [
          { type: "list-item", children: [{ type: "text", text: "one" }] },
        ],
      },
    ],
  } as never,
  {
    __component: "droplets.quiz",
    questions: [
      {
        id: 1,
        content: "<p>Which runs once?</p>",
        answerOptions: [
          { id: 1, content: "do-while", isCorrect: true },
          { id: 2, content: "for", isCorrect: false },
        ],
      },
    ],
  },
  {
    __component: "droplets.code-block",
    language: "js",
    code: "if (a < b) {\r\n  go();\r\n}",
    editable: false,
    runnable: false,
  },
  { __component: "droplets.video", url: "https://youtu.be/x?a=1&b=2" },
  {
    __component: "droplets.open-ended-quiz",
    questions: [
      {
        id: 1,
        content: "<p>Why <em>loops</em>?</p>",
        correctAnswer: "To repeat",
      },
    ],
  },
  {
    __component: "droplets.sandpack-block",
    description: "A <live> sandbox & more",
  },
] as Block[];

const overviewHtml = `<p>Tom&nbsp;&amp; Jerry&#39;s<br>line two <em>em</em> <a href="/x">link</a></p>
<ul><li>a<ul><li>nested</li></ul></li><li>b</li></ul><pre><code>x = 1
y = 2</code></pre><script>alert(1)</script><p>end<br class="ProseMirror-trailingBreak"></p>`;

const edgeCases: [string, string][] = [
  ["a newline right after <pre>", "<pre>\nx\ny</pre>"],
  ["CRLF and a lone CR", "<p>a\r\nb\rc</p><pre>1\r\n2</pre>"],
  [
    "style, which DOMPurify keeps",
    "<p>a</p><style>.x{color:red}</style><p>b</p>",
  ],
  [
    "an iframe, which DOMPurify removes",
    "<p>a</p><iframe>fallback</iframe><p>b</p>",
  ],
  [
    "noscript and template",
    "<p>a</p><noscript>n</noscript><template>t</template>",
  ],
];

const cases: [string, string][] = [
  ...edgeCases,
  ["Classic lesson", classicLessonHtml(classic)],
  ["Overview body", overviewHtml],
  ...Object.entries(
    overviewFieldHtml({
      name: "A & B",
      description: "<p>Desc <b>bold</b></p>",
      overview: overviewHtml,
      objectives: ["One", "Two <x>"],
    }),
  ),
];

describe("htmlTextContent", () => {
  it.each(cases)("matches what the page shows: %s", (_name, html) => {
    const [block] = htmlTextContent(html);
    expect(block.text).toBe(pageText(html));
    expect(block.text.length).toBeGreaterThan(0);
  });

  it.each(cases)(
    "matches htmlContent of the sanitized HTML: %s",
    (_name, html) => {
      expect(htmlTextContent(html)).toEqual(
        htmlContent(DOMPurify.sanitize(html)),
      );
    },
  );
});
