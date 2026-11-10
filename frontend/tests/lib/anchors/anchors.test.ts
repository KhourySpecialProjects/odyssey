import {
  Anchor,
  OUTDATED,
  blockNoteContent,
  createAnchor,
  drawAnchor,
  htmlContent,
  pointAnchor,
  removeAnchor,
  resolveAnchor,
} from "@/lib/anchors";
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";
import { CustomBlockNoteBlock } from "@/types";
import DOMPurify from "isomorphic-dompurify";

type Inline = { type: "text"; text: string; styles: Record<string, boolean> };
const text = (value: string, styles = {}): Inline => ({
  type: "text",
  text: value,
  styles,
});
const paragraph = (id: string, ...content: Inline[]) => ({
  id,
  type: "paragraph",
  props: {},
  content,
  children: [],
});

// Three paragraphs in a row, which the lesson view merges into one block
const lesson = [
  paragraph("intro", text("Databases store data in tables.")),
  paragraph(
    "joins",
    text("A join combines rows from two tables. "),
    text("Inner", { bold: true }),
    text(" joins keep matching rows."),
  ),
  paragraph(
    "repeat",
    text("Use a join when you need both tables, and use a join carefully."),
  ),
];

/** Renders blocks the way the lesson view does */
function renderLesson(blocks: unknown[]): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = convertBlockNoteToV1Blocks(blocks as CustomBlockNoteBlock[])
    .map((block) => (block as { content: string }).content)
    .join("");
  document.body.appendChild(root);
  return root;
}

const blockElement = (root: Element, id: string) =>
  root.querySelector(`[data-block-id="${id}"]`)!;

/** A range over the nth copy of `quote` in an element's text */
function rangeOver(element: Element, quote: string, nth = 0): Range {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  const all = nodes.map((node) => node.data).join("");
  let start = -1;
  for (let i = 0; i <= nth; i++) start = all.indexOf(quote, start + 1);
  const end = start + quote.length;

  const range = new Range();
  let offset = 0;
  for (const node of nodes) {
    if (start >= offset && start <= offset + node.length) {
      range.setStart(node, start - offset);
      break;
    }
    offset += node.length;
  }
  offset = 0;
  for (const node of nodes) {
    if (end >= offset && end <= offset + node.length) {
      range.setEnd(node, end - offset);
      break;
    }
    offset += node.length;
  }
  return range;
}

const joinsText =
  "A join combines rows from two tables. Inner joins keep matching rows.";

function anchorOn(blockId: string, quote: string, nth = 0): Anchor {
  const root = renderLesson(lesson);
  return createAnchor(rangeOver(blockElement(root, blockId), quote, nth), {
    field: "blocks",
  })!;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createAnchor", () => {
  it("anchors a selection to its block's id and offsets in that block alone", () => {
    const anchor = anchorOn("joins", "Inner joins");

    const start = joinsText.indexOf("Inner joins");
    expect(anchor).toEqual({
      v: 1,
      field: "blocks",
      blockId: "joins",
      start,
      end: start + "Inner joins".length,
      quote: "Inner joins",
      prefix: joinsText.slice(start - 30, start),
      suffix: " keep matching rows.",
    });
  });

  it("leaves out whitespace at either end of the selection", () => {
    expect(anchorOn("joins", " Inner joins ").quote).toBe("Inner joins");
  });

  it("still finds the block after the lesson view sanitises its HTML", () => {
    // GenericBlockRenderer passes each block's HTML through DOMPurify
    const root = document.createElement("div");
    root.innerHTML = DOMPurify.sanitize(renderLesson(lesson).innerHTML);
    document.body.appendChild(root);

    expect(
      createAnchor(rangeOver(blockElement(root, "joins"), "Inner joins"), {
        field: "blocks",
      }),
    ).toMatchObject({ blockId: "joins", quote: "Inner joins" });
  });

  it("anchors a whole block by its id alone", () => {
    expect(createAnchor({ blockId: "intro" }, { field: "blocks" })).toEqual({
      v: 1,
      field: "blocks",
      blockId: "intro",
    });
  });

  it("anchors a selection across blocks from its first block to its last", () => {
    const root = renderLesson(lesson);
    const across = new Range();
    across.setStart(blockElement(root, "intro").firstChild!, 10);
    across.setEnd(blockElement(root, "repeat").firstChild!, 3);

    expect(createAnchor(across, { field: "blocks" })).toEqual({
      v: 1,
      field: "blocks",
      blockId: "intro",
      endBlockId: "repeat",
      start: 10,
      end: 3,
      quote: `store data in tables.\n${joinsText}\nUse`,
      prefix: "Databases ",
      suffix: " a join when you need both tab",
    });
  });

  it("keeps a selection to one block when only whitespace spills over", () => {
    const root = renderLesson(lesson);
    const intro = blockElement(root, "intro").firstChild as Text;
    const spill = new Range();
    spill.setStart(intro, 10);
    spill.setEnd(blockElement(root, "joins").firstChild!, 0);

    expect(createAnchor(spill, { field: "blocks" })).toMatchObject({
      blockId: "intro",
      start: 10,
      end: intro.length,
      quote: "store data in tables.",
    });
    expect(createAnchor(spill, { field: "blocks" })).not.toHaveProperty(
      "endBlockId",
    );
  });

  it("doesn't anchor an empty selection", () => {
    const root = renderLesson(lesson);
    const empty = new Range();
    empty.setStart(blockElement(root, "intro").firstChild!, 2);

    expect(createAnchor(empty, { field: "blocks" })).toBeNull();
  });

  it("counts a list item's own text, not its sub-items'", () => {
    const root = renderLesson([
      {
        id: "outer",
        type: "bulletListItem",
        props: {},
        content: [text("Outer item")],
        children: [
          {
            id: "inner",
            type: "bulletListItem",
            props: {},
            content: [text("Inner item")],
            children: [],
          },
        ],
      },
    ]);

    const anchor = createAnchor(
      rangeOver(blockElement(root, "inner"), "item"),
      { field: "blocks" },
    );

    expect(anchor).toMatchObject({ blockId: "inner", start: 6, end: 10 });
  });

  it("anchors by quote where blocks have no ids, such as the Overview", () => {
    const overview = document.createElement("div");
    overview.innerHTML =
      "<p>Learn <strong>SQL</strong> joins.</p><p>Then practise.</p>";
    document.body.appendChild(overview);

    const anchor = createAnchor(rangeOver(overview, "SQL joins"), {
      field: "overview",
      root: overview,
    });

    expect(anchor).toEqual({
      v: 1,
      field: "overview",
      start: 6,
      end: 15,
      quote: "SQL joins",
      prefix: "Learn ",
      suffix: ".Then practise.",
    });
  });
});

describe("createAnchor with Odyssey's React blocks (an image, code, a check-in)", () => {
  // As the editor draws them: the block's content is inside a React renderer,
  // and the text it shows isn't saved as its text
  const editor = () => {
    document.body.innerHTML = `
      <div data-node-type="blockContainer" data-id="q-1">
        <div class="bn-block-content"><p class="bn-inline-content">Look at the diagram below.</p></div>
      </div>
      <div data-node-type="blockContainer" data-id="q-2">
        <div class="react-renderer node-image" contenteditable="false">
          <div class="bn-block-content" data-content-type="image"><p>A diagram of a loop</p></div>
        </div>
      </div>
      <div data-node-type="blockContainer" data-id="q-3">
        <div class="bn-block-content"><p class="bn-inline-content">Then try it yourself.</p></div>
      </div>`;
  };
  const text = (id: string) =>
    document.querySelector(`[data-id="${id}"] p`)!.firstChild!;
  const saved = {
    blocks: [
      { id: "q-1", text: "Look at the diagram below." },
      { id: "q-2", text: "" },
      { id: "q-3", text: "Then try it yourself." },
    ],
  };

  afterEach(() => (document.body.innerHTML = ""));

  it("anchors a selection inside one to the whole block", () => {
    editor();
    const range = new Range();
    range.setStart(text("q-2"), 2);
    range.setEnd(text("q-2"), 9);

    expect(createAnchor(range, { field: "blocks" })).toEqual({
      v: 1,
      field: "blocks",
      blockId: "q-2",
    });
  });

  it("counts one as no text in a selection across it, as it's saved", () => {
    editor();
    const range = new Range();
    range.setStart(text("q-1"), 12);
    range.setEnd(text("q-3"), 4);

    const anchor = createAnchor(range, { field: "blocks" })!;

    expect(anchor).toMatchObject({
      blockId: "q-1",
      endBlockId: "q-3",
      quote: "diagram below.\n\nThen",
    });
    expect(resolveAnchor(saved, anchor)).toMatchObject({ exact: true });
  });
});

describe("pointAnchor", () => {
  const base = { field: "blocks", blockId: "joins" };
  const text = "Inner joins keep rows.";

  it("anchors a spot to the rest of its word, before it", () => {
    // "Inner jo|ins"
    expect(pointAnchor(text, 8, "before", base)).toEqual({
      v: 1,
      ...base,
      start: 8,
      end: 11,
      quote: "ins",
      prefix: "Inner jo",
      suffix: " keep rows.",
      point: "before",
    });
  });

  it("anchors a spot to the word that ends at it, after it", () => {
    expect(pointAnchor(text, 5, "after", base)).toMatchObject({
      start: 0,
      end: 5,
      quote: "Inner",
      point: "after",
    });
  });

  it("takes the other side when its own side has no word", () => {
    // At the end of the text, and just before a space
    expect(pointAnchor(text, text.length, "before", base)).toMatchObject({
      quote: "rows.",
      point: "after",
    });
    expect(pointAnchor(text, 5, "before", base)).toMatchObject({
      quote: "Inner",
      point: "after",
    });
  });

  it("stops a word at a break between parts", () => {
    // Two list items read as "onetwo"
    expect(
      pointAnchor("onetwo", 1, "before", base, new Set([3])),
    ).toMatchObject({ quote: "ne" });
    expect(pointAnchor("onetwo", 5, "after", base, new Set([3]))).toMatchObject(
      { quote: "tw" },
    );
  });

  it("returns null with no word either side", () => {
    expect(pointAnchor("   ", 1, "before", base)).toBeNull();
    expect(pointAnchor("", 0, "after", base)).toBeNull();
  });
});

describe("resolveAnchor", () => {
  const resolve = (blocks: unknown[], anchor: Anchor) =>
    resolveAnchor(
      { blocks: blockNoteContent(blocks as CustomBlockNoteBlock[]) },
      anchor,
    );

  it("finds it again after a paragraph is inserted above", () => {
    const anchor = anchorOn("joins", "Inner joins");
    const edited = [
      paragraph("new", text("A new first paragraph, merged with the rest.")),
      ...lesson,
    ];

    const found = resolve(edited, anchor);

    expect(found).toEqual({
      field: "blocks",
      blockId: "joins",
      start: anchor.start,
      end: anchor.end,
      exact: true,
    });
    // The lesson view still marks the same words, though the new paragraph
    // is merged into the same rendered block
    const spans = drawAnchor(renderLesson(edited), found as never, "c1");
    expect(spans.map((span) => span.textContent).join("")).toBe("Inner joins");
  });

  it("finds it again by its quote after a word before it changes", () => {
    const anchor = anchorOn("joins", "Inner joins");
    const edited = [
      lesson[0],
      paragraph(
        "joins",
        text("A SQL join combines rows from two tables. "),
        text("Inner", { bold: true }),
        text(" joins keep matching rows."),
      ),
    ];

    expect(resolve(edited, anchor)).toEqual({
      field: "blocks",
      blockId: "joins",
      start: anchor.start! + 4,
      end: anchor.end! + 4,
      exact: true,
    });
  });

  it("follows a word changed inside it, by the text either side", () => {
    const anchor = anchorOn("joins", "Inner joins");
    const edited = [
      paragraph(
        "joins",
        text(
          "A join combines rows from two tables. Inner join keep matching rows.",
        ),
      ),
    ];

    const found = resolve(edited, anchor);

    expect(found).toMatchObject({ blockId: "joins", exact: false });
    const { start, end } = found as { start: number; end: number };
    expect(blockNoteContent(edited as never)[0].text.slice(start, end)).toBe(
      "Inner join",
    );
  });

  it("tells two identical phrases apart by the text around them", () => {
    const anchor = anchorOn("repeat", "a join", 1);
    const edited = [
      paragraph(
        "repeat",
        text(
          "Always use a join when you need both tables, and use a join carefully.",
        ),
      ),
    ];

    const found = resolve(edited, anchor) as { start: number };

    const editedText =
      "Always use a join when you need both tables, and use a join carefully.";
    expect(found.start).toBe(editedText.lastIndexOf("a join"));
  });

  it("says outdated, rather than dropping it, when the text is deleted", () => {
    const anchor = anchorOn("joins", "Inner joins");

    expect(
      resolve(
        [lesson[0], paragraph("joins", text("Joins are covered later."))],
        anchor,
      ),
    ).toBe(OUTDATED);
    expect(resolve([lesson[0]], anchor)).toBe(OUTDATED);
  });

  it("finds a whole-block anchor while its block exists", () => {
    const anchor = createAnchor({ blockId: "intro" }, { field: "blocks" })!;

    expect(resolve(lesson, anchor)).toEqual({
      field: "blocks",
      blockId: "intro",
      start: 0,
      end: "Databases store data in tables.".length,
      exact: true,
    });
    expect(resolve(lesson.slice(1), anchor)).toBe(OUTDATED);
  });

  describe("across blocks", () => {
    const across: Anchor = {
      v: 1,
      field: "blocks",
      blockId: "intro",
      endBlockId: "joins",
      start: 10,
      end: 6,
      quote: "store data in tables.\nA join",
      prefix: "Databases ",
      suffix: " combines rows from two tables",
    };

    it("finds it from its first block to its last", () => {
      expect(resolve(lesson, across)).toEqual({
        field: "blocks",
        blockId: "intro",
        endBlockId: "joins",
        start: 10,
        end: 6,
        exact: true,
      });
    });

    it("finds the quote again after a paragraph is inserted above", () => {
      const edited = [paragraph("new", text("First.")), ...lesson];

      expect(resolve(edited, across)).toMatchObject({
        blockId: "intro",
        endBlockId: "joins",
        start: 10,
        end: 6,
      });
    });

    it("follows the quote when its blocks get new ids", () => {
      const edited = [
        paragraph("a", text("Databases store data in tables.")),
        paragraph("b", text("A join combines rows from two tables.")),
      ];

      expect(resolve(edited, across)).toEqual({
        field: "blocks",
        blockId: "a",
        endBlockId: "b",
        start: 10,
        end: 6,
        exact: true,
      });
    });

    it("says outdated when the text between is edited away", () => {
      const edited = [
        lesson[0],
        paragraph("joins", text("Joins are covered later.")),
      ];

      expect(resolve(edited, across)).toBe(OUTDATED);
    });
  });

  it("finds a quote in the Overview's text after it's edited", () => {
    const overview = document.createElement("div");
    overview.innerHTML = "<p>Learn <strong>SQL</strong> joins.</p>";
    document.body.appendChild(overview);
    const anchor = createAnchor(rangeOver(overview, "SQL joins"), {
      field: "overview",
      root: overview,
    })!;

    const found = resolveAnchor(
      { overview: htmlContent("<p>First, learn <em>SQL</em> joins.</p>") },
      anchor,
    );

    expect(found).toEqual({
      field: "overview",
      start: 13,
      end: 22,
      exact: true,
    });
  });
});

describe("blockNoteContent", () => {
  it("reads each block's own text, children after their parent", () => {
    expect(
      blockNoteContent([
        {
          id: "a",
          content: [
            text("See "),
            {
              type: "link",
              href: "https://example.com",
              content: [text("the docs")],
            },
            text("\nnext line"),
          ],
          children: [{ id: "b", content: "Child", children: [] }],
        },
        { id: "c", content: [], children: [] },
      ] as never),
    ).toEqual([
      { id: "a", text: "See the docs\nnext line" },
      { id: "b", text: "Child" },
      { id: "c", text: "" },
    ]);
  });
});

describe("drawAnchor", () => {
  it("wraps the text in tagged spans, one per text node, and takes them out again", () => {
    const root = renderLesson(lesson);
    const anchor = anchorOn("joins", "two tables. Inner");
    const found = resolveAnchor(
      { blocks: blockNoteContent(lesson as never) },
      anchor,
    );

    const spans = drawAnchor(root, found as never, "c1");

    expect(spans.map((span) => span.textContent)).toEqual([
      "two tables. ",
      "Inner",
    ]);
    expect(spans.every((span) => span.dataset.anchorId === "c1")).toBe(true);
    expect(blockElement(root, "joins")).toHaveTextContent(joinsText);

    removeAnchor(root, "c1");
    expect(root.querySelector("[data-anchor-id]")).toBeNull();
    expect(blockElement(root, "joins")).toHaveTextContent(joinsText);
  });

  it("draws across blocks, with the class it's given", () => {
    const root = renderLesson(lesson);

    const spans = drawAnchor(
      root,
      {
        field: "blocks",
        blockId: "intro",
        endBlockId: "repeat",
        start: 10,
        end: 3,
        exact: true,
      },
      "c2",
      { className: "mark" },
    );

    expect(spans.map((span) => span.textContent).join("|")).toBe(
      `store data in tables.|A join combines rows from two tables. |Inner| joins keep matching rows.|Use`,
    );
    expect(spans.every((span) => span.className === "mark")).toBe(true);
  });

  it("puts one empty badge before the first span, even across a link", () => {
    const overview = document.createElement("div");
    overview.innerHTML = '<p>Learn <a href="#">SQL</a> joins.</p>';
    document.body.appendChild(overview);

    drawAnchor(
      overview,
      { field: "overview", start: 2, end: 12, exact: true },
      "finding-1",
      { badge: 1 },
    );

    const badges = overview.querySelectorAll(".anchor-badge");
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveAttribute("data-badge", "1");
    expect(badges[0].childNodes).toHaveLength(0);
    expect(badges[0].nextElementSibling).toHaveTextContent("arn");
    expect(overview).toHaveTextContent("Learn SQL joins.");
  });

  it("puts a caret at a spot comment's end, and takes it out again", () => {
    const overview = document.createElement("div");
    overview.innerHTML = "<p>Learn SQL joins.</p>";
    document.body.appendChild(overview);

    drawAnchor(
      overview,
      { field: "overview", start: 6, end: 9, exact: true },
      "c3",
      { className: "mark", point: "after" },
    );

    const caret = overview.querySelector(".anchor-caret")!;
    expect(caret).toHaveAttribute("data-anchor-id", "c3");
    expect(caret).toHaveClass("mark");
    expect(caret.previousSibling).toHaveTextContent("SQL");
    expect(overview).toHaveTextContent("Learn SQL joins.");

    removeAnchor(overview, "c3");
    expect(overview.innerHTML).toBe("<p>Learn SQL joins.</p>");
  });
});
