/**
 * A highlight that is still being saved carries a temporary negative id from
 * `LessonRenderer` (and a highlight with no id at all has no server record
 * either). Neither can be removed, recoloured or merged until the save returns.
 */
export function isPendingHighlightId(id: number | undefined | null): boolean {
  return id === undefined || id === null || id <= 0;
}
