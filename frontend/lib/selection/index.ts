/**
 * Selecting text to act on it, shared by learner highlights (ODY-785) and
 * review comments (ODY-806): reading the selection, waiting for it to settle,
 * placing a popover next to it, and closing that popover.
 *
 * Offsets aren't here on purpose: highlights count characters the way the
 * lesson view draws them, and anchors (lib/anchors) count a line break as one
 * character, so each keeps its own.
 */
export { readSelection, anchorIn, type ContainedSelection } from "./read";
export {
  placeAt,
  placePopover,
  HEADER_SELECTOR,
  POPOVER_GAP,
  type PopoverAnchor,
} from "./place";
export { useSelectionChange, SELECTION_DELAY_MS } from "./use-selection-change";
export { useDismiss } from "./use-dismiss";
