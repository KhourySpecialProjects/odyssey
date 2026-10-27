// BlockNote's HTML and Markdown converters are ESM-only, and next/jest
// doesn't transform node_modules. The editor doesn't use them to mount or
// edit, so they're stubbed. prosemirror-highlight only colours code blocks.
for (const name of [
  "rehype-parse",
  "rehype-remark",
  "rehype-stringify",
  "remark-gfm",
  "remark-parse",
  "remark-rehype",
  "remark-stringify",
]) {
  jest.doMock(name, () => ({
    __esModule: true,
    default: () => () => undefined,
  }));
}
jest.mock("unified", () => ({ unified: jest.fn() }));
jest.mock("hast-util-from-dom", () => ({ fromDom: jest.fn() }));
jest.mock("unist-util-visit", () => ({ visit: jest.fn() }));
jest.mock("prosemirror-highlight", () => {
  const { Plugin } = jest.requireActual("prosemirror-state");
  return { createHighlightPlugin: () => new Plugin({}) };
});
jest.mock("prosemirror-highlight/shiki", () => ({
  createParser: () => () => [],
}));

import type { BlockNoteEditor as Editor } from "@blocknote/core";
import {
  AnchorRange,
  anchorsPlugin,
  refreshAnchors,
  type DrawnAnchor,
  blockNoteContent,
  createAnchor,
  resolveAnchor,
} from "@/lib/anchors";

const { BlockNoteEditor } = jest.requireActual("@blocknote/core");

const text = (value: string, styles = {}) => ({
  type: "text" as const,
  text: value,
  styles,
});

describe("anchors in the BlockNote editor", () => {
  let editor: Editor;
  let root: HTMLElement;

  beforeEach(() => {
    editor = BlockNoteEditor.create({
      initialContent: [
        { id: "intro", type: "paragraph", content: "Databases store data." },
        {
          id: "joins",
          type: "paragraph",
          content: [
            text("A join combines rows. "),
            text("Inner", { bold: true }),
            text(" joins keep matches.\nA second line."),
          ],
        },
      ],
    });
    root = document.createElement("div");
    document.body.appendChild(root);
    editor.mount(root);
  });

  afterEach(() => {
    editor.unmount();
    root.remove();
  });

  it("anchors a selection, finds it after edits and draws it without changing the text", () => {
    // Select "Inner joins", across the bold text
    const inline = root.querySelector('[data-id="joins"] .bn-inline-content')!;
    const bold = inline.querySelector("strong")!.firstChild!;
    const after = bold.parentElement!.nextSibling!;
    const range = new Range();
    range.setStart(bold, 0);
    range.setEnd(after, " joins".length);

    const anchor = createAnchor(range, { field: "blocks" })!;
    expect(anchor).toMatchObject({
      blockId: "joins",
      start: 22,
      end: 33,
      quote: "Inner joins",
    });

    // The creator adds a paragraph above and rewords the start of this one
    editor.insertBlocks(
      [{ type: "paragraph", content: "A new first paragraph." }],
      "intro",
      "before",
    );
    editor.updateBlock("joins", {
      content: [
        text("A SQL join combines rows. "),
        text("Inner", { bold: true }),
        text(" joins keep matches.\nA second line."),
      ],
    });

    const found = resolveAnchor(
      { blocks: blockNoteContent(editor.document) },
      anchor,
    ) as AnchorRange;
    expect(found).toEqual({
      field: "blocks",
      blockId: "joins",
      start: 26,
      end: 37,
      exact: true,
    });

    const before = JSON.stringify(editor.document);
    editor._tiptapEditor.registerPlugin(
      anchorsPlugin(() => [{ id: "c1", range: found }]),
    );

    const drawn = Array.from(root.querySelectorAll('[data-anchor-id="c1"]'));
    expect(drawn.map((span) => span.textContent).join("")).toBe("Inner joins");
    expect(JSON.stringify(editor.document)).toBe(before);
  });

  it("counts a line break in the editor as one character, like the saved text", () => {
    const inline = root.querySelector('[data-id="joins"] .bn-inline-content')!;
    const secondLine = Array.from(inline.childNodes).pop()!;
    const range = new Range();
    range.setStart(secondLine, 2);
    range.setEnd(secondLine, "A second".length);

    const anchor = createAnchor(range, { field: "blocks" })!;
    const saved = blockNoteContent(editor.document).find(
      (block) => block.id === "joins",
    )!;

    expect(anchor.quote).toBe("second");
    expect(saved.text.slice(anchor.start, anchor.end)).toBe("second");
  });

  describe("review comment marks (ODY-806)", () => {
    const whole = (id: string): DrawnAnchor => ({
      id,
      range: {
        field: "blocks",
        blockId: "intro",
        start: 0,
        end: 21,
        exact: true,
      },
      className: "review-mark review-mark--pending",
    });

    it("gives each span the mark's class", () => {
      editor._tiptapEditor.registerPlugin(anchorsPlugin(() => [whole("c2")]));

      const span = root.querySelector('[data-anchor-id="c2"]')!;
      expect(span.textContent).toBe("Databases store data.");
      expect(span).toHaveClass("review-mark", "review-mark--pending");
    });

    it("keeps a mark through an edit to another block", () => {
      editor._tiptapEditor.registerPlugin(anchorsPlugin(() => [whole("c3")]));

      editor.updateBlock("joins", { content: "Rewritten." });

      expect(root.querySelector('[data-anchor-id="c3"]')?.textContent).toBe(
        "Databases store data.",
      );
    });

    it("keeps both ids where two anchors overlap", () => {
      const words: DrawnAnchor = {
        id: "c7",
        range: {
          field: "blocks",
          blockId: "intro",
          start: 0,
          end: 9,
          exact: true,
        },
      };
      editor._tiptapEditor.registerPlugin(
        anchorsPlugin(() => [whole("c8"), words]),
      );

      const outer = root.querySelector('[data-anchor-id="c8"]');
      const inner = root.querySelector('[data-anchor-id="c7"]');
      expect(inner?.textContent).toBe("Databases");
      expect(
        Array.from(root.querySelectorAll('[data-anchor-id="c8"]'))
          .map((span) => span.textContent)
          .join(""),
      ).toBe("Databases store data.");
      expect(outer).not.toBeNull();
    });

    it("anchors and draws a selection across blocks (Round 2)", () => {
      const intro = root.querySelector(
        '[data-id="intro"] .bn-inline-content',
      )!.firstChild!;
      const joins = root.querySelector(
        '[data-id="joins"] .bn-inline-content',
      )!.firstChild!;
      const range = new Range();
      range.setStart(intro, "Databases ".length);
      range.setEnd(joins, "A join".length);

      const anchor = createAnchor(range, { field: "blocks" })!;
      expect(anchor).toMatchObject({
        blockId: "intro",
        endBlockId: "joins",
        start: 10,
        end: 6,
        quote: "store data.\nA join",
      });

      const found = resolveAnchor(
        { blocks: blockNoteContent(editor.document) },
        anchor,
      ) as AnchorRange;
      editor._tiptapEditor.registerPlugin(
        anchorsPlugin(() => [{ id: "c9", range: found }]),
      );

      const spans = Array.from(root.querySelectorAll('[data-anchor-id="c9"]'));
      expect(spans.map((span) => span.textContent).join("|")).toBe(
        "store data.|A join",
      );
    });

    it("draws a caret at a spot comment, beside its letters", () => {
      const spot = (point: "before" | "after"): DrawnAnchor => ({
        id: `spot-${point}`,
        range: {
          field: "blocks",
          blockId: "intro",
          start: 10,
          end: 15,
          exact: true,
        },
        className: "review-mark",
        point,
      });
      editor._tiptapEditor.registerPlugin(
        anchorsPlugin(() => [spot("before"), spot("after")]),
      );

      const before = root.querySelector(
        '.anchor-caret[data-anchor-id="spot-before"]',
      )!;
      const after = root.querySelector(
        '.anchor-caret[data-anchor-id="spot-after"]',
      )!;
      expect(before).toHaveClass("review-mark");
      expect(before.nextElementSibling).toHaveTextContent("store");
      expect(after.previousElementSibling).toHaveTextContent("store");
      // The carets are drawn, not text
      expect(blockNoteContent(editor.document)[0].text).toBe(
        "Databases store data.",
      );
    });

    it("redraws when the anchors change and refreshAnchors is called", () => {
      let anchors: DrawnAnchor[] = [whole("c4")];
      editor._tiptapEditor.registerPlugin(anchorsPlugin(() => anchors));

      anchors = [];
      refreshAnchors(editor.prosemirrorView!);
      expect(root.querySelector('[data-anchor-id="c4"]')).toBeNull();

      anchors = [whole("c5")];
      refreshAnchors(editor.prosemirrorView!);
      expect(root.querySelector('[data-anchor-id="c5"]')).not.toBeNull();
    });
  });
});
