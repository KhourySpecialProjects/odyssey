import type { PopoverAnchor } from "./place";

/** The reader's selection, as seen from one container */
export type ContainedSelection =
  /** Nothing selected, or only a caret */
  | { kind: "none" }
  /** A selection that starts or ends outside the container */
  | { kind: "outside" }
  | { kind: "inside"; range: Range; text: string };

/** Reads the page's selection, and whether it lies wholly inside `container` */
export function readSelection(container: Node): ContainedSelection {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return { kind: "none" };
  }
  const range = selection.getRangeAt(0);
  if (
    !container.contains(range.startContainer) ||
    !container.contains(range.endContainer)
  ) {
    return { kind: "outside" };
  }
  return { kind: "inside", range, text: selection.toString() };
}

/** A rect's position relative to `parent`, for placing a popover */
export function anchorIn(parent: Element, rect: DOMRect): PopoverAnchor {
  const parentRect = parent.getBoundingClientRect();
  return {
    top: rect.top - parentRect.top,
    bottom: rect.bottom - parentRect.top,
    centerX: rect.left + rect.width / 2 - parentRect.left,
  };
}
