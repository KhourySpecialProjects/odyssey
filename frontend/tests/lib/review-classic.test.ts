import { classicBlockHtml, classicLessonHtml } from "@/lib/review-classic";
import { SLIDE_BREAK_MARKER } from "@/lib/blocknote/slide-break";
import type { Block } from "@/types";

describe("classicBlockHtml", () => {
  it("keeps a text block's HTML", () => {
    expect(
      classicBlockHtml({
        __component: "droplets.generic",
        content: "<p>A loop.</p>",
      }),
    ).toBe("<p>A loop.</p>");
  });

  it("drops a slide break", () => {
    expect(
      classicBlockHtml({
        __component: "droplets.generic",
        content: SLIDE_BREAK_MARKER,
      }),
    ).toBe("");
  });

  it("shows an expandable's title, escaped, above its content", () => {
    expect(
      classicBlockHtml({
        __component: "droplets.expandable",
        title: "Why <b>loops</b>?",
        content: "<p>Repetition.</p>",
      }),
    ).toBe(
      "<p><strong>Why &lt;b&gt;loops&lt;/b&gt;?</strong></p><p>Repetition.</p>",
    );
  });

  it("turns a callout's rich text into HTML", () => {
    const html = classicBlockHtml({
      __component: "droplets.callout",
      color: "bg-sky-100",
      type: "info",
      content: [
        {
          type: "paragraph",
          children: [
            { type: "text", text: "Watch out: " },
            { type: "text", text: "infinite", bold: true } as never,
          ],
        },
        {
          type: "list",
          format: "ordered",
          children: [
            { type: "list-item", children: [{ type: "text", text: "one" }] },
          ],
        } as never,
      ],
    });
    expect(html).toBe(
      '<div class="classic-review-callout"><p>Watch out: <strong>infinite</strong></p><ol><li>one</li></ol></div>',
    );
  });

  it("lists a quiz's question and options, marking the correct one", () => {
    expect(
      classicBlockHtml({
        __component: "droplets.quiz",
        questions: [
          {
            id: 1,
            content: "<p>Which loop runs once?</p>",
            answerOptions: [
              { id: 1, content: "do-while", isCorrect: true },
              { id: 2, content: "for", isCorrect: false },
            ],
          },
        ],
      }),
    ).toBe(
      "<div><p>Which loop runs once?</p></div><ul><li>do-while (correct)</li><li>for</li></ul>",
    );
  });

  it("shows code as escaped preformatted text", () => {
    expect(
      classicBlockHtml({
        __component: "droplets.code-block",
        language: "js",
        code: "if (a < b) {}",
        editable: false,
        runnable: false,
      }),
    ).toBe("<pre><code>if (a &lt; b) {}</code></pre>");
  });
});

describe("classicLessonHtml", () => {
  it("wraps each block with text in a section and skips empty ones", () => {
    const blocks: Block[] = [
      { __component: "droplets.generic", content: "<p>One</p>" },
      { __component: "droplets.generic", content: SLIDE_BREAK_MARKER },
      { __component: "droplets.generic", content: "<p>Two</p>" },
    ];
    expect(classicLessonHtml(blocks)).toBe(
      '<section class="classic-review-block"><p>One</p></section><section class="classic-review-block"><p>Two</p></section>',
    );
  });
});
