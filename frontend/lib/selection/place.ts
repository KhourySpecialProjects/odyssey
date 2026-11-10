/** Where the selected text sits, in px from the popover's parent's top left */
export interface PopoverAnchor {
  top: number;
  bottom: number;
  centerX: number;
}

export const POPOVER_GAP = 8;

// The site header (the element the droplet sidebar measures too)
export const HEADER_SELECTOR = ".sticky.top-0.z-50";

/**
 * Above the anchor, or below it when it would go under the site header, and
 * kept inside the parent's width. All values are in px; `parentTop` and
 * `headerBottom` are viewport positions.
 */
export function placeAt({
  anchor,
  width,
  height,
  parentWidth,
  parentTop,
  headerBottom,
}: {
  anchor: PopoverAnchor;
  width: number;
  height: number;
  parentWidth: number;
  parentTop: number;
  headerBottom: number;
}): { left: number; top: number } {
  const left = Math.max(
    0,
    Math.min(anchor.centerX - width / 2, parentWidth - width),
  );
  const above = anchor.top - height - POPOVER_GAP;
  const fitsAbove = parentTop + above >= headerBottom;
  return { left, top: fitsAbove ? above : anchor.bottom + POPOVER_GAP };
}

/** placeAt for a rendered popover, measured against its parent and the header */
export function placePopover(
  popover: HTMLElement,
  anchor: PopoverAnchor,
): { left: number; top: number } | null {
  const parent = popover.parentElement;
  if (!parent) return null;
  return placeAt({
    anchor,
    width: popover.offsetWidth,
    height: popover.offsetHeight,
    parentWidth: parent.clientWidth,
    parentTop: parent.getBoundingClientRect().top,
    headerBottom:
      document.querySelector(HEADER_SELECTOR)?.getBoundingClientRect().bottom ??
      0,
  });
}
