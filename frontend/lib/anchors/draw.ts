import { AnchorRange } from "./types";
import {
  badgeElement,
  caretElement,
  textOf,
  textParts,
  wrapRange,
} from "./dom";

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
 * without a block id. An anchor across blocks wraps every block from its
 * first to its last. With `point`, an empty caret span (`anchor-caret`) also
 * goes at that end: a comment at one spot (ODY-806). Not for the BlockNote
 * editor: see anchorsPlugin.
 */
export function drawAnchor(
  root: Element,
  range: AnchorRange,
  anchorId: string,
  {
    className,
    point,
    badge,
  }: {
    className?: string;
    point?: "before" | "after";
    /** An empty numbered marker (`anchor-badge`) before the first span */
    badge?: number;
  } = {},
): HTMLElement[] {
  const makeSpan = () => {
    const span = document.createElement("span");
    span.dataset.anchorId = anchorId;
    if (className) span.className = className;
    return span;
  };

  let spans: HTMLElement[];
  if (range.blockId === undefined) {
    spans = wrapRange(textParts(root, false), range.start, range.end, makeSpan);
  } else {
    const blocks = Array.from(root.querySelectorAll("[data-block-id]"));
    const first = blocks.indexOf(
      byAttribute(root, "data-block-id", range.blockId) as Element,
    );
    if (first === -1) return [];
    const lastId = range.endBlockId ?? range.blockId;
    const last = blocks.findIndex(
      (block, i) =>
        i >= first && block.getAttribute("data-block-id") === lastId,
    );
    spans = blocks
      .slice(first, last === -1 ? first + 1 : last + 1)
      .flatMap((block, i, run) => {
        const parts = textParts(block, true);
        const from = i === 0 ? range.start : 0;
        const to = i === run.length - 1 ? range.end : textOf(parts).length;
        return wrapRange(parts, from, to, makeSpan);
      });
  }

  if (badge !== undefined && spans.length > 0) {
    spans[0].before(badgeElement(anchorId, badge, className));
  }
  if (point && spans.length > 0) {
    const caret = caretElement(anchorId, className);
    if (point === "before") spans[0].before(caret);
    else spans[spans.length - 1].after(caret);
  }
  return spans;
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
