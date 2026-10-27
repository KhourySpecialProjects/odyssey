import { Anchor, CONTEXT } from "./types";
import { blockAt, offsetOf, textOf, textParts } from "./dom";

/**
 * Makes an anchor for a selection, or for a whole block.
 *
 * A selection inside one block, in the lesson view or the BlockNote editor,
 * is anchored to that block by id and offsets. One elsewhere under `root` (a
 * Classic-editor lesson or the Overview, whose blocks have no lasting ids) is
 * anchored by its quote, with offsets in `root`'s text as a hint.
 *
 * Returns null for a collapsed or whitespace-only selection, or one that
 * spans blocks.
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
    if (!startBlock || startBlock.element !== endBlock?.element) return null;
    return anchorIn(startBlock.element, true, target, {
      field,
      blockId: startBlock.blockId,
    });
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
