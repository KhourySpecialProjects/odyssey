import type { Highlight } from "@/types";

/**
 * A highlight that is still being saved carries a temporary negative id from
 * `LessonRenderer` (and a highlight with no id at all has no server record
 * either). Neither can be removed, recoloured or merged until the save returns.
 * NaN (a drawn piece whose id attribute didn't parse) counts as pending too.
 */
export function isPendingHighlightId(id: number | undefined | null): boolean {
  return typeof id !== "number" || !(id > 0);
}

/**
 * Whether a note is attached to the highlight. `note.highlight` is one-to-one:
 * deleting the highlight orphans its note, and a second note would take the
 * link from the first.
 */
export function highlightHasNote(highlight: Pick<Highlight, "note">): boolean {
  return highlight.note != null;
}

/**
 * Selector for the pieces this block draws. The note bar briefly wraps text in a
 * span with `data-highlight-id="highlight-id"` (note-block.tsx), so the attribute
 * alone is not enough: the class is what marks one of ours.
 */
export const HIGHLIGHT_PIECE_SELECTOR = ".ody-highlight[data-highlight-id]";
