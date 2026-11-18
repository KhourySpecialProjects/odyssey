// Reading anchor text from the page. Offsets must count the same characters
// as content.ts reads from saved blocks, so both treat a line break as "\n".

/**
 * An element holding one block's text: a paragraph, heading or list item in
 * the lesson view (data-block-id, added by convert-blocks), or a block in the
 * BlockNote editor (data-id on its container)
 */
export const BLOCK_SELECTOR =
  '[data-block-id], [data-node-type="blockContainer"]';

type TextPart = Text | HTMLBRElement;

const isText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;

const partText = (part: TextPart) => (isText(part) ? part.data : "\n");

/**
 * A BlockNote block's own content element: a child of the block, or, for a
 * block drawn by React (Odyssey's images, code, check-ins), inside its
 * renderer
 */
export const blockContentOf = (block: Element) =>
  block.querySelector(
    ":scope > .bn-block-content, :scope > .react-renderer > .bn-block-content",
  );

/**
 * Whether a BlockNote block's content holds text that's saved as its text:
 * inline content, or a table's cells. A block with none (an image, code, a
 * check-in, a formula) shows text it makes itself, which content.ts reads as
 * "", so it takes only whole-block anchors.
 */
export const hasSavedText = (content: Element) =>
  content.querySelector(".bn-inline-content, table") !== null;

/**
 * The block a node is in: its id, the element holding its own text, and, in
 * the editor, whether that text is saved (see hasSavedText)
 */
export function blockAt(
  node: Node,
): { blockId: string; element: Element; noText?: true } | null {
  const start = isText(node) ? node.parentElement : (node as Element);
  const block = start?.closest(BLOCK_SELECTOR);
  if (!block) return null;

  const blockId = block.getAttribute("data-block-id");
  if (blockId !== null) return { blockId, element: block };

  // In the editor a block's own text is in its content, apart from its children
  const content = blockContentOf(block);
  const editorId = block.getAttribute("data-id");
  if (!content || !editorId) return null;
  return hasSavedText(content)
    ? { blockId: editorId, element: content }
    : { blockId: editorId, element: content, noText: true };
}

/**
 * The text nodes and line breaks that make up an element's text, in order.
 * With `ownTextOnly`, blocks nested inside it (a list item's sub-items) are
 * left out. ProseMirror's placeholder line break isn't text.
 */
export function textParts(root: Element, ownTextOnly: boolean): TextPart[] {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (isText(node)) return NodeFilter.FILTER_ACCEPT;
        const element = node as Element;
        if (ownTextOnly && element.matches(BLOCK_SELECTOR)) {
          return NodeFilter.FILTER_REJECT;
        }
        return element.tagName === "BR" &&
          !element.classList.contains("ProseMirror-trailingBreak")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    },
  );
  const parts: TextPart[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode as TextPart);
  return parts;
}

export const textOf = (parts: TextPart[]) => parts.map(partText).join("");

/** The character offset of a boundary point (a selection's start or end) */
export function offsetOf(parts: TextPart[], node: Node, offset: number) {
  const point = document.createRange();
  point.setStart(node, offset);
  let total = 0;
  for (const part of parts) {
    if (part === node) return total + offset;
    if (point.comparePoint(part, 0) >= 0) break;
    total += partText(part).length;
  }
  return total;
}

/**
 * Wraps the text between two offsets in spans, one per text node, and
 * returns them
 */
export function wrapRange(
  parts: TextPart[],
  start: number,
  end: number,
  makeSpan: () => HTMLElement,
): HTMLElement[] {
  const pieces: { node: Text; from: number; to: number }[] = [];
  let offset = 0;
  for (const part of parts) {
    const length = partText(part).length;
    if (isText(part)) {
      const from = Math.max(start - offset, 0);
      const to = Math.min(end - offset, length);
      if (from < to) pieces.push({ node: part, from, to });
    }
    offset += length;
    if (offset >= end) break;
  }

  return pieces.map(({ node, from, to }) => {
    const text = from > 0 ? node.splitText(from) : node;
    if (to - from < text.length) text.splitText(to - from);
    const span = makeSpan();
    text.replaceWith(span);
    span.appendChild(text);
    return span;
  });
}

/**
 * The caret drawn at a spot comment: an empty span, tagged like the mark and
 * classed `anchor-caret`
 */
export function caretElement(id: string, className?: string): HTMLElement {
  const caret = document.createElement("span");
  caret.dataset.anchorId = id;
  caret.className = className ? `anchor-caret ${className}` : "anchor-caret";
  caret.setAttribute("aria-hidden", "true");
  return caret;
}

/**
 * A finding's number badge: an empty span with no text node, so it can't
 * shift offsets. CSS draws the digit from `data-badge`.
 */
export function badgeElement(
  id: string,
  number: number,
  className?: string,
): HTMLElement {
  const badge = document.createElement("span");
  badge.dataset.anchorId = id;
  badge.dataset.badge = String(number);
  badge.className = className ? `anchor-badge ${className}` : "anchor-badge";
  badge.setAttribute("aria-hidden", "true");
  return badge;
}
