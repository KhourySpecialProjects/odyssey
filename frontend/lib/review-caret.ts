import { offsetOf, textParts } from "@/lib/anchors/dom";

/**
 * Where the reviewer's caret can stop in Comment mode (ODY-806), ported from
 * the redesign prototype (ui-redesign/comments.js: stopAt, stopBox,
 * stopsOf). Offsets count text the way lib/anchors does, so a stop is also
 * an anchor offset.
 */

// Parts of a text whose words never run on into the next part
const PART =
  "li, td, th, p, h1, h2, h3, h4, h5, h6, pre, blockquote, figcaption, summary";

/** An element's text, where each character came from, and its part breaks */
export type TextMap = {
  text: string;
  parts: ReturnType<typeof textParts>;
  /** Each text node and the offset its first character is at */
  nodes: { node: Text; at: number }[];
  /** Offsets where a new part starts (a list item, a paragraph) */
  breaks: Set<number>;
};

export function textMap(element: Element, ownTextOnly: boolean): TextMap {
  const parts = textParts(element, ownTextOnly);
  const nodes: TextMap["nodes"] = [];
  const breaks = new Set<number>();
  let text = "";
  let lastPart: Element | null | undefined;
  for (const part of parts) {
    const holder =
      part.nodeType === Node.TEXT_NODE ? part.parentElement : (part as Element);
    const inPart = holder?.closest(PART);
    const own = inPart && element.contains(inPart) ? inPart : null;
    if (lastPart !== undefined && own !== lastPart && text.length > 0) {
      breaks.add(text.length);
    }
    lastPart = own;
    if (part.nodeType === Node.TEXT_NODE) {
      nodes.push({ node: part as Text, at: text.length });
      text += (part as Text).data;
    } else {
      text += "\n";
    }
  }
  return { text, parts, nodes, breaks };
}

/**
 * Something the caret moves through: a BlockNote block's own text, or part
 * of a read-only text (a paragraph of a Classic lesson or an Overview field),
 * whose offsets are in the whole text's map.
 */
export type CaretUnit = {
  element: Element;
  /** The BlockNote block id; absent in a read-only text */
  blockId?: string;
  map: TextMap;
  /** The unit's text in `map`: from `from` up to `to` */
  from: number;
  to: number;
};

/** A caret position: before the character at `i`, or after the one before it */
export type CaretStop = { unit: number; i: number; side: "before" | "after" };

const BLOCK = '[data-node-type="blockContainer"][data-id]';
const BLOCK_TEXT = ":scope > .bn-block-content";
// The paragraphs of a read-only text the keyboard moves through
const TEXT_UNIT = "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, summary";

/**
 * The units under `content`: its BlockNote blocks, or, for a read-only text,
 * its paragraphs and list items, with offsets in the whole text
 */
export function caretUnits(content: Element): CaretUnit[] {
  const blocks = Array.from(content.querySelectorAll(BLOCK));
  if (blocks.length > 0) {
    return blocks.flatMap((block) => {
      const element = block.querySelector(BLOCK_TEXT);
      if (!element) return [];
      const map = textMap(element, true);
      return [
        {
          element,
          blockId: block.getAttribute("data-id")!,
          map,
          from: 0,
          to: map.text.length,
        },
      ];
    });
  }
  const map = textMap(content, false);
  const elements = Array.from(content.querySelectorAll(TEXT_UNIT)).filter(
    // The innermost: a paragraph inside a list item is the unit, not both
    (element) => !element.querySelector(TEXT_UNIT),
  );
  const units = elements.flatMap((element) => {
    const inner = textParts(element, false);
    if (inner.length === 0) return [];
    const from = offsetOf(map.parts, inner[0], 0);
    const last = inner[inner.length - 1];
    const to =
      offsetOf(map.parts, last, 0) +
      (last.nodeType === Node.TEXT_NODE ? (last as Text).length : 1);
    return [{ element, map, from, to }];
  });
  // Text outside any paragraph is one unit
  return units.length > 0
    ? units
    : [{ element: content, map, from: 0, to: map.text.length }];
}

/** The unit an element is in */
export function unitOf(units: CaretUnit[], node: Node): number {
  return units.findIndex((unit) => unit.element.contains(node));
}

function nodeAt(map: TextMap, i: number) {
  let lo = 0;
  let hi = map.nodes.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (map.nodes[mid].at <= i) lo = mid;
    else hi = mid - 1;
  }
  const found = map.nodes[lo];
  return found && i >= found.at && i < found.at + found.node.length
    ? found
    : null;
}

/** The box of the character at `i`, or null for a line break */
function charRect(map: TextMap, i: number): DOMRect | null {
  const found = nodeAt(map, i);
  if (!found) return null;
  const range = new Range();
  range.setStart(found.node, i - found.at);
  range.setEnd(found.node, i - found.at + 1);
  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}

// The caret is as tall as the text around it, not an inline code chip's
// smaller font
const fontSizes = new WeakMap<Element, number>();
function caretHeight(node: Text): number {
  let element = node.parentElement!;
  const chip = element.closest("code");
  if (chip && !chip.closest("pre")) element = chip.parentElement ?? element;
  if (!fontSizes.has(element)) {
    fontSizes.set(
      element,
      parseFloat(getComputedStyle(element).fontSize) || 16,
    );
  }
  return Math.round(fontSizes.get(element)! * 1.3);
}

/** Where the caret is drawn for a stop, in viewport px */
export function stopBox(
  units: CaretUnit[],
  stop: CaretStop,
): { x: number; top: number; height: number } | null {
  const { map } = units[stop.unit] ?? {};
  if (!map) return null;
  const before = stop.side === "before";
  const ci = before ? stop.i : stop.i - 1;
  const rect = charRect(map, ci);
  const found = nodeAt(map, ci);
  if (!rect || !found) return null;
  const height = caretHeight(found.node);
  return {
    x: before ? rect.left : rect.right,
    top: rect.top + rect.height / 2 - height / 2,
    height,
  };
}

function caretFromPoint(x: number, y: number) {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    return position && { node: position.offsetNode, offset: position.offset };
  }
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    return range && { node: range.startContainer, offset: range.startOffset };
  }
  return null;
}

/**
 * The stop under a point: where the browser would put a text caret, or null
 * where there's no text (an image, a gap)
 */
export function stopAt(
  units: CaretUnit[],
  x: number,
  y: number,
): CaretStop | null {
  const position = caretFromPoint(x, y);
  if (!position) return null;
  const unit = unitOf(units, position.node);
  if (unit === -1) return null;
  const { map, from, to } = units[unit];
  if (to <= from) return null;
  const i = Math.min(
    to,
    Math.max(from, offsetOf(map.parts, position.node, position.offset)),
  );
  // At the end of the unit or a part, or before a line break, the caret
  // stays on the character before it
  if (i >= to || map.text[i] === "\n" || (i > from && map.breaks.has(i))) {
    return i > from ? { unit, i, side: "after" } : { unit, i, side: "before" };
  }
  return { unit, i, side: "before" };
}

/** Every stop in a unit, in reading order: what ← → walk through */
export function stopsOf(units: CaretUnit[], unit: number): CaretStop[] {
  const { map, from, to } = units[unit];
  const stops: CaretStop[] = [];
  for (let i = from; i < to; i++) {
    if (map.text[i] === "\n") continue;
    stops.push({ unit, i, side: "before" });
    if (i + 1 === to || map.breaks.has(i + 1) || map.text[i + 1] === "\n") {
      stops.push({ unit, i: i + 1, side: "after" });
    }
  }
  return stops;
}

/** The stop the next word starts at (Alt+→), or the last one */
export function wordJump(
  units: CaretUnit[],
  stops: CaretStop[],
  from: number,
  direction: 1 | -1,
): number {
  if (stops.length === 0) return -1;
  const { text, breaks } = units[stops[0].unit].map;
  const isSpace = (i: number) => /\s/.test(text[i] ?? " ");
  const edge = ({ i, side }: CaretStop) =>
    side === "after"
      ? direction > 0
      : direction > 0
        ? isSpace(i)
        : !isSpace(i) && (isSpace(i - 1) || breaks.has(i));
  for (let j = from + direction; j >= 0 && j < stops.length; j += direction) {
    if (edge(stops[j])) return j;
  }
  return direction > 0 ? stops.length - 1 : 0;
}

/** "After “state”, before “ment”": a stop read aloud */
export function stopText(units: CaretUnit[], stop: CaretStop): string {
  const { map, from, to } = units[stop.unit];
  const { text, breaks } = map;
  const isWord = (i: number) => i >= from && i < to && !/\s/.test(text[i]);
  let a = stop.i;
  while (a > from && /\s/.test(text[a - 1])) a--;
  let s = a;
  while (s > from && isWord(s - 1) && !breaks.has(s)) s--;
  let z = stop.i;
  while (z < to && /\s/.test(text[z])) z++;
  let e = z;
  while (e < to && isWord(e) && (e === z || !breaks.has(e))) e++;
  const say = (words: string) =>
    `“${words.length > 30 ? `${words.slice(0, 29)}…` : words}”`;
  const left = stop.side === "after" || s < a ? text.slice(s, a) : "";
  const right = stop.side === "before" ? text.slice(z, e) : "";
  if (left && right) return `After ${say(left)}, before ${say(right)}`;
  return right
    ? `Before ${say(right)}, at the start`
    : `After ${say(left)}, at the end`;
}
