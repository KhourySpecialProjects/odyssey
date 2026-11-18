import { AnchorBlock } from "./types";
import { textOf, textParts } from "./dom";

// A BlockNote block as saved in a lesson's blocksV2, or editor.document
type BlockNoteBlockLike = {
  id?: string;
  content?: unknown;
  children?: BlockNoteBlockLike[];
};

type InlineItem = { type?: string; text?: string; content?: unknown };

// Text and links, which is all the lesson schema's inline content is. A
// table's text is its cells' text in order, as the page shows it.
function inlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (content as InlineItem[])
      .map((item) =>
        item.type === "link" ? inlineText(item.content) : item.text ?? "",
      )
      .join("");
  }
  const rows = (content as { rows?: { cells?: unknown[] }[] } | null)?.rows;
  if (Array.isArray(rows)) {
    return rows
      .flatMap((row) => row.cells ?? [])
      .map((cell) =>
        inlineText(Array.isArray(cell) ? cell : (cell as InlineItem)?.content),
      )
      .join("");
  }
  return "";
}

/**
 * Each BlockNote block's own text, in document order with children after
 * their parent: the content to resolve a lesson's anchors against.
 */
export function blockNoteContent(blocks: BlockNoteBlockLike[]): AnchorBlock[] {
  const content: AnchorBlock[] = [];
  const add = (block: BlockNoteBlockLike) => {
    content.push({ id: block.id, text: inlineText(block.content) });
    block.children?.forEach(add);
  };
  blocks.forEach(add);
  return content;
}

/**
 * HTML's text as the page shows it, as one block with no id: for the
 * Overview, or a Classic-editor lesson's components joined in order. Needs a
 * browser DOM.
 */
export function htmlContent(html: string): AnchorBlock[] {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  return [{ text: textOf(textParts(body, false)) }];
}
