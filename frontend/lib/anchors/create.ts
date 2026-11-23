import { Anchor, CONTEXT } from "./types";
import { BLOCK_SELECTOR, blockAt, offsetOf, textOf, textParts } from "./dom";

/**
 * Makes an anchor for a selection, or for a whole block.
 *
 * A selection inside one block, in the lesson view or the BlockNote editor,
 * is anchored to that block by id and offsets. One across blocks is anchored
 * from its first block to its last (`endBlockId`). One elsewhere under `root`
 * (a Classic-editor lesson or the Overview, whose blocks have no lasting ids)
 * is anchored by its quote, with offsets in `root`'s text as a hint.
 *
 * A selection inside a BlockNote block with no saved text of its own (an
 * image, code, a check-in) is anchored to the whole block; across blocks,
 * such a block counts as no text.
 *
 * Returns null for a collapsed or whitespace-only selection, or one that
 * starts or ends outside a block.
 */
export function createAnchor(
  target: Range | { blockId: string },
  { field, root }: { field: string; root?: Element },
): Anchor | null {
  if (!("collapsed" in target)) {
    return { v: 1, field, blockId: target.blockId };
  }
  if (target.collapsed) return null;

  const startBlock = blockAt(target.startContainer);
  const endBlock = blockAt(target.endContainer);
  if (startBlock || endBlock) {
    if (!startBlock || !endBlock) return null;
    if (startBlock.element === endBlock.element) {
      if (startBlock.noText)
        return { v: 1, field, blockId: startBlock.blockId };
      return anchorIn(startBlock.element, true, target, {
        field,
        blockId: startBlock.blockId,
      });
    }
    return anchorAcross(startBlock.element, endBlock.element, target, field);
  }

  if (!root?.contains(target.commonAncestorContainer)) return null;
  return anchorIn(root, false, target, { field });
}

function anchorIn(
  element: Element,
  ownTextOnly: boolean,
  range: Range,
  base: Pick<Anchor, "field" | "blockId">,
): Anchor | null {
  const parts = textParts(element, ownTextOnly);
  const text = textOf(parts);
  let start = offsetOf(parts, range.startContainer, range.startOffset);
  let end = offsetOf(parts, range.endContainer, range.endOffset);

  // Whitespace at either end of a selection isn't part of what was meant
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (start === end) return null;

  return {
    v: 1,
    ...base,
    start,
    end,
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
  };
}

/**
 * A selection from one block to another: each block's own text in document
 * order, joined with "\n" the way resolveAnchor joins them
 */
function anchorAcross(
  first: Element,
  last: Element,
  range: Range,
  field: string,
): Anchor | null {
  const all = Array.from(first.ownerDocument.querySelectorAll(BLOCK_SELECTOR))
    .map((element) => blockAt(element))
    .filter((block) => block !== null);
  const from = all.findIndex((block) => block.element === first);
  const to = all.findIndex((block) => block.element === last);
  if (from === -1 || to < from) return null;

  const blocks = all.slice(from, to + 1).map((block) => {
    // As content.ts reads it: a block with no saved text is ""
    const parts = block.noText ? [] : textParts(block.element, true);
    return { blockId: block.blockId, parts, text: textOf(parts) };
  });
  const text = blocks.map((block) => block.text).join("\n");
  // Where each block's text starts in the joined text
  const offsets: number[] = [];
  let at = 0;
  for (const block of blocks) {
    offsets.push(at);
    at += block.text.length + 1;
  }

  let start = offsetOf(
    blocks[0].parts,
    range.startContainer,
    range.startOffset,
  );
  let end =
    offsets[offsets.length - 1] +
    offsetOf(
      blocks[blocks.length - 1].parts,
      range.endContainer,
      range.endOffset,
    );
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (start === end) return null;

  // The blocks the trimmed selection starts and ends in
  const blockOf = (at: number) => {
    let i = offsets.length - 1;
    while (i > 0 && offsets[i] > at) i--;
    return i;
  };
  const a = blockOf(start);
  const z = blockOf(end - 1);
  const startIn = start - offsets[a];
  const endIn = end - offsets[z];
  const prefix = blocks[a].text.slice(Math.max(0, startIn - CONTEXT), startIn);
  const suffix = blocks[z].text.slice(endIn, endIn + CONTEXT);
  const quote = text.slice(start, end);

  if (a === z) {
    return {
      v: 1,
      field,
      blockId: blocks[a].blockId,
      start: startIn,
      end: endIn,
      quote,
      prefix,
      suffix,
    };
  }
  return {
    v: 1,
    field,
    blockId: blocks[a].blockId,
    endBlockId: blocks[z].blockId,
    start: startIn,
    end: endIn,
    quote,
    prefix,
    suffix,
  };
}

/**
 * A comment at one spot in a block's (or field's) text (ODY-806): anchored to
 * the letters beside it, from the spot to the end of its word ("before"), or
 * the word that ends at the spot ("after"). `side` is the one to try first.
 * A word never runs across a break: an offset where a new part of the text
 * starts (a list item, a table cell, a paragraph in a field). Returns null
 * when there's no word next to the spot.
 */
export function pointAnchor(
  text: string,
  at: number,
  side: "before" | "after",
  base: Pick<Anchor, "field" | "blockId">,
  breaks: ReadonlySet<number> = new Set(),
): Anchor | null {
  const isGap = (i: number) => /\s/.test(text[i]);
  const forward = (): [number, number] | null => {
    let end = at;
    while (
      end < text.length &&
      !isGap(end) &&
      (end === at || !breaks.has(end))
    ) {
      end++;
    }
    return end > at ? [at, end] : null;
  };
  const back = (): [number, number] | null => {
    let start = at;
    while (
      start > 0 &&
      !isGap(start - 1) &&
      (start === at || !breaks.has(start))
    ) {
      start--;
    }
    return start < at ? [start, at] : null;
  };

  let point = side;
  let span = point === "before" ? forward() : back();
  if (!span) {
    point = point === "before" ? "after" : "before";
    span = point === "before" ? forward() : back();
  }
  if (!span) return null;
  const [start, end] = span;
  return {
    v: 1,
    ...base,
    start,
    end,
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    point,
  };
}
