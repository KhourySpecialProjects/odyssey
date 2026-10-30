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

    describe("while the creator types (ODY-807)", () => {
      // "Inner joins" in the second block
      const words: DrawnAnchor = {
        id: "c8",
        range: {
          field: "blocks",
          blockId: "joins",
          start: 22,
          end: 33,
          exact: true,
        },
      };
      const marked = (id: string) =>
        Array.from(root.querySelectorAll(`[data-anchor-id="${id}"]`))
          .map((span) => span.textContent)
          .join("");
      const typeAt = (offset: number, value: string) => {
        const view = editor.prosemirrorView!;
        let pos = -1;
        view.state.doc.descendants((node, at) => {
          if (node.attrs.id === "joins") pos = at + 2 + offset;
          return pos < 0;
        });
        view.dispatch(view.state.tr.insertText(value, pos));
      };

      it("keeps a mark on its words when text is typed before them", () => {
        editor._tiptapEditor.registerPlugin(anchorsPlugin(() => [words]));

        typeAt(2, "SQL ");

        expect(marked("c8")).toBe("Inner joins");
      });

      it("keeps a spot's caret beside its letters", () => {
        const spot: DrawnAnchor = {
          id: "c9",
          range: { ...words.range, start: 22, end: 27 },
          point: "before",
        };
        editor._tiptapEditor.registerPlugin(anchorsPlugin(() => [spot]));

        typeAt(0, "So, ");

        const caret = root.querySelector('[data-anchor-id="c9"]')!;
        const block = root.querySelector(
          '[data-id="joins"] .bn-inline-content',
        )!;
        const before = block.textContent!.slice(
          0,
          block.textContent!.indexOf("Inner"),
        );
        expect(before).toBe("So, A join combines rows. ");
        expect(caret.nextSibling?.textContent).toMatch(/^Inner/);
      });

      it("drops a mark whose words are deleted", () => {
        editor._tiptapEditor.registerPlugin(anchorsPlugin(() => [words]));
        const view = editor.prosemirrorView!;
        const from = view.state.doc.textBetween(0, view.state.doc.content.size);
        expect(from).toContain("Inner joins");

        let start = -1;
        view.state.doc.descendants((node, at) => {
          if (node.attrs.id === "joins") start = at + 2;
          return start < 0;
        });
        view.dispatch(view.state.tr.delete(start + 22, start + 33));

        expect(root.querySelector('[data-anchor-id="c8"]')).toBeNull();
      });

      it("ignores anchors found in an older copy of the text", () => {
        let anchors: DrawnAnchor[] = [words];
        editor._tiptapEditor.registerPlugin(anchorsPlugin(() => anchors));
        const view = editor.prosemirrorView!;
        const older = view.state.doc;

        typeAt(2, "SQL ");
        // Offsets found before "SQL " was typed, which would now be 4 short
        anchors = [{ ...words, id: "c10" }];
        refreshAnchors(view, older);
        expect(marked("c8")).toBe("Inner joins");
        expect(root.querySelector('[data-anchor-id="c10"]')).toBeNull();

        // Found in the text as it is now
        anchors = [
          {
            ...words,
            id: "c10",
            range: { ...words.range, start: 26, end: 37 },
          },
        ];
        refreshAnchors(view, view.state.doc);
        expect(marked("c10")).toBe("Inner joins");
      });
    });

    it.each([
      ["a single block", { blockId: "intro", start: 10, end: 15 }],
      [
        "a range across blocks",
        { blockId: "intro", endBlockId: "joins", start: 10, end: 6 },
      ],
    ])("draws one empty badge for %s", (_name, range) => {
      const anchor: DrawnAnchor = {
        id: "finding-1",
        range: { field: "blocks", exact: true, ...range },
        badge: 2,
      };
      editor._tiptapEditor.registerPlugin(anchorsPlugin(() => [anchor]));

      const badges = root.querySelectorAll(".anchor-badge");
      expect(badges).toHaveLength(1);
      expect(badges[0]).toHaveAttribute("data-badge", "2");
      expect(badges[0]).toHaveAttribute("aria-hidden", "true");
      expect(badges[0].childNodes).toHaveLength(0);
      expect(badges[0].nextElementSibling).toHaveTextContent("store");
    });

    it("draws no badge without one", () => {
      editor._tiptapEditor.registerPlugin(anchorsPlugin(() => [whole("c6")]));
      expect(root.querySelector(".anchor-badge")).toBeNull();
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

  describe("a block without text of its own (an image)", () => {
    let withImage: Editor;
    let host: HTMLElement;

    beforeEach(() => {
      withImage = BlockNoteEditor.create({
        initialContent: [
          { id: "before", type: "paragraph", content: "Look at this." },
          {
            id: "pic",
            type: "image",
            props: { url: "diagram.png", caption: "A diagram" },
          },
          { id: "after", type: "paragraph", content: "Then this." },
        ],
      });
      host = document.createElement("div");
      document.body.appendChild(host);
      withImage.mount(host);
    });

    afterEach(() => {
      withImage.unmount();
      host.remove();
    });

    const textIn = (id: string, selector: string) =>
      host.querySelector(`[data-id="${id}"] ${selector}`)!.firstChild!;

    it("anchors a selection in it to the whole block: its text isn't saved", () => {
      const caption = textIn("pic", ".bn-file-caption");
      const range = new Range();
      range.setStart(caption, 2);
      range.setEnd(caption, 9);

      expect(createAnchor(range, { field: "blocks" })).toEqual({
        v: 1,
        field: "blocks",
        blockId: "pic",
      });
    });

    it("anchors a selection across it so it's found where it was", () => {
      const range = new Range();
      range.setStart(textIn("before", ".bn-inline-content"), 8);
      range.setEnd(textIn("after", ".bn-inline-content"), 4);

      const anchor = createAnchor(range, { field: "blocks" })!;
      expect(anchor).toMatchObject({
        blockId: "before",
        endBlockId: "after",
        quote: "this.\n\nThen",
      });
      expect(
        resolveAnchor({ blocks: blockNoteContent(withImage.document) }, anchor),
      ).toMatchObject({ blockId: "before", endBlockId: "after", exact: true });
    });
  });
});
