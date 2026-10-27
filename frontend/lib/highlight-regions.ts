import type { EditorView } from "@codemirror/view";
import { Highlight } from "@/types";

/**
 * Highlights are drawn in regions: the elements holding a block's text, each
 * marked with REGION_ATTR. Its value is the block ids whose highlights the
 * region shows; new highlights are saved under the first. A highlight's
 * position is a character offset in its region's text.
 */
export const REGION_ATTR = "data-highlight-region";

/** Class on every drawn piece of a highlight; data-highlight-id names it */
export const HIGHLIGHT_CLASS = "lesson-highlight";

export type SavedHighlight = Highlight & { id: number };

// A new highlight has a negative id until its save returns
export const isSaved = (highlight: Highlight): highlight is SavedHighlight =>
  (highlight.id ?? 0) > 0;

/** Outer highlights first, so one inside another is drawn on top of it */
export const byDrawOrder = (a: Highlight, b: Highlight) =>
  (a.position?.start ?? 0) - (b.position?.start ?? 0) ||
  (b.position?.end ?? 0) - (a.position?.end ?? 0);

/** A range without the whitespace at either end, which isn't drawn */
export function trimmed(text: string, start: number, end: number) {
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return { start, end };
}

/** Makes an element the region for these block ids */
export const regionProps = (ids: number[]) => ({
  [REGION_ATTR]: ids.join(" "),
});

export const regionIds = (region: Element): number[] =>
  (region.getAttribute(REGION_ATTR) ?? "")
    .split(" ")
    .filter(Boolean)
    .map(Number);

/** Character offsets and text in a region */
export interface RegionReader {
  offsetOf(node: Node, offset: number): number;
  text(): string;
  /** The text between two offsets, as a reader would read it */
  slice(start: number, end: number): string;
}

const readers = new WeakMap<Element, RegionReader>();

/** For a region whose DOM isn't simply its text, such as a code editor */
export function setRegionReader(region: Element, reader: RegionReader) {
  readers.set(region, reader);
}

export function regionReader(region: Element): RegionReader {
  return (
    readers.get(region) ?? {
      offsetOf: (node, offset) => offsetIn(region, node, offset),
      text: () => region.textContent ?? "",
      slice: (start, end) => readableText(region, start, end),
    }
  );
}

/**
 * Reads a CodeMirror editor's document rather than its DOM, which has line
 * numbers and only the lines in view. A point in the line numbers counts as
 * the start or end of the code, whichever side of it the point is.
 */
export function codeEditorReader(view: EditorView): RegionReader {
  return {
    offsetOf(node, offset) {
      if (view.contentDOM.contains(node)) return view.posAtDOM(node, offset);
      return view.contentDOM.compareDocumentPosition(node) &
        Node.DOCUMENT_POSITION_PRECEDING
        ? 0
        : view.state.doc.length;
    },
    text: () => view.state.doc.toString(),
    slice: (start, end) => view.state.doc.sliceString(start, end),
  };
}

/**
 * The region's text nodes, in order. Highlight positions are character
 * offsets across all of them (line numbers and LaTeX markup included).
 */
function textNodes(region: Node): Text[] {
  const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

// Elements whose text is read apart from the text around them
const SEPARATE = /^(P|LI|TD|TH|H[1-6]|PRE|BLOCKQUOTE|DIV)$/;

const separateParent = (node: Node, region: Node) => {
  let element = node.parentElement;
  while (element && element !== region && !SEPARATE.test(element.tagName)) {
    element = element.parentElement;
  }
  return element;
};

/**
 * The region's text between two offsets, with a space where it goes from one
 * paragraph, list item or table cell to the next (in the DOM, nothing
 * separates them)
 */
function readableText(region: Node, start: number, end: number): string {
  let text = "";
  let offset = 0;
  let previous: Element | null = null;
  for (const node of textNodes(region)) {
    const from = Math.max(start - offset, 0);
    const to = Math.min(end - offset, node.length);
    if (from < to) {
      const parent = separateParent(node, region);
      if (previous && parent !== previous && /\S$/.test(text)) text += " ";
      text += node.data.slice(from, to);
      previous = parent;
    }
    offset += node.length;
    if (offset >= end) break;
  }
  return text.trim();
}

/** The character offset of a boundary point, counted from the region's start */
function offsetIn(region: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(region);
  range.setEnd(node, offset);
  return range.toString().length;
}

type Piece = { node: Text; from: number; to: number };

const isBlank = ({ node, from, to }: Piece) =>
  !/\S/.test(node.data.slice(from, to));

/**
 * Inline code the piece covers whole. It's painted itself, so its padding and
 * border don't cut a gap in the highlight.
 */
function wholeInlineCode({ node, from, to }: Piece): HTMLElement | null {
  const code = node.parentElement;
  return code?.tagName === "CODE" &&
    !code.closest("pre") &&
    // Already painted by a highlight this one sits inside
    !code.classList.contains(HIGHLIGHT_CLASS) &&
    code.childNodes.length === 1 &&
    from === 0 &&
    to === node.length
    ? code
    : null;
}

/**
 * Draws a highlight as one tagged element per text node it covers, styled to
 * read as one bar: only its two ends are rounded, and whitespace at either
 * end isn't painted.
 */
function drawHighlight(region: HTMLElement, highlight: Highlight) {
  const { start, end } = highlight.position ?? {};
  if (start == null || end == null || start >= end) return;

  const pieces: Piece[] = [];
  let offset = 0;
  for (const node of textNodes(region)) {
    const piece = {
      node,
      from: Math.max(start - offset, 0),
      to: Math.min(end - offset, node.length),
    };
    // A line break between paragraphs would paint an empty line
    const betweenBlocks =
      isBlank(piece) &&
      node.data.includes("\n") &&
      !node.parentElement?.closest("pre");
    if (piece.from < piece.to && !betweenBlocks) pieces.push(piece);
    offset += node.length;
    if (offset >= end) break;
  }

  while (pieces.length > 0 && isBlank(pieces[0])) pieces.shift();
  while (pieces.length > 0 && isBlank(pieces[pieces.length - 1])) pieces.pop();
  if (pieces.length === 0) return;
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  while (/\s/.test(first.node.data[first.from])) first.from++;
  while (/\s/.test(last.node.data[last.to - 1])) last.to--;

  for (const piece of pieces) {
    let element = wholeInlineCode(piece);
    if (!element) {
      const { node, from, to } = piece;
      const text = from > 0 ? node.splitText(from) : node;
      if (to - from < text.length) text.splitText(to - from);
      element = document.createElement("span");
      text.replaceWith(element);
      element.appendChild(text);
    }

    const [left, right] = [piece === first, piece === last].map((round) =>
      round ? "8px" : "0px",
    );
    element.classList.add(HIGHLIGHT_CLASS);
    element.dataset.highlightId = String(highlight.id);
    element.style.backgroundColor = highlight.color;
    element.style.borderRadius = `${left} ${right} ${right} ${left}`;
    element.style.setProperty("color", "black", "important");
  }
}

/** Takes every drawn highlight out of a region, leaving its text as it was */
function clearHighlights(region: HTMLElement) {
  const drawn = region.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`);
  if (drawn.length === 0) return;
  drawn.forEach((element) => {
    if (element.tagName === "CODE") {
      element.classList.remove(HIGHLIGHT_CLASS);
      delete element.dataset.highlightId;
      ["background-color", "border-radius", "color"].forEach((property) =>
        element.style.removeProperty(property),
      );
      if (!element.classList.length) element.removeAttribute("class");
      if (!element.style.length) element.removeAttribute("style");
    } else {
      element.replaceWith(...element.childNodes);
    }
  });
  region.normalize();
}

/** Redraws a region's highlights; one inside another goes on top of it */
export function drawHighlights(region: HTMLElement, highlights: Highlight[]) {
  clearHighlights(region);
  [...highlights]
    .sort(byDrawOrder)
    .forEach((highlight) => drawHighlight(region, highlight));
}

/**
 * Highlights in a code editor, as ranges of the code to mark. Whitespace at
 * either end isn't painted, as in drawHighlight.
 */
export function codeMarks(highlights: Highlight[], code: string) {
  return [...highlights].sort(byDrawOrder).flatMap((highlight) => {
    const { start, end } = trimmed(
      code,
      Math.max(highlight.position?.start ?? 0, 0),
      Math.min(highlight.position?.end ?? 0, code.length),
    );
    return start < end
      ? [
          {
            from: start,
            to: end,
            className: HIGHLIGHT_CLASS,
            attributes: {
              "data-highlight-id": String(highlight.id),
              style: `background-color: ${highlight.color}; color: black !important; border-radius: 8px`,
            },
          },
        ]
      : [];
  });
}
