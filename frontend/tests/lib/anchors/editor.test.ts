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
});
