import { AnchorRange } from "./types";
import { textParts, wrapRange } from "./dom";

const byAttribute = (root: Element, name: string, value: string) =>
  Array.from(root.querySelectorAll(`[${name}]`)).find(
    (element) => element.getAttribute(name) === value,
  );

/**
 * Draws a found anchor in the lesson view by wrapping its text in spans
 * tagged data-anchor-id, one per text node, the way learner highlights are
 * tagged with data-highlight-id. Returns the spans, for styling.
 *
 * `root` is the lesson's content, or the field's element for an anchor
 * without a block id. Not for the BlockNote editor: see anchorsPlugin.
 */
export function drawAnchor(
  root: Element,
  range: AnchorRange,
  anchorId: string,
): HTMLElement[] {
  const element =
    range.blockId !== undefined
      ? byAttribute(root, "data-block-id", range.blockId)
      : root;
  if (!element) return [];

  return wrapRange(
    textParts(element, range.blockId !== undefined),
    range.start,
    range.end,
    () => {
      const span = document.createElement("span");
      span.dataset.anchorId = anchorId;
      return span;
    },
  );
}

/** Takes an anchor's spans back out, leaving the text as it was */
export function removeAnchor(root: Element, anchorId: string): void {
  root.querySelectorAll("[data-anchor-id]").forEach((span) => {
    if (span.getAttribute("data-anchor-id") !== anchorId) return;
    const parent = span.parentNode;
    span.replaceWith(...Array.from(span.childNodes));
    parent?.normalize();
  });
}
