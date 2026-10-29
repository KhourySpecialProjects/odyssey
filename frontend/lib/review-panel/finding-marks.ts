import { resolveAnchor } from "@/lib/anchors/resolve";
import { OUTDATED, type AnchorContent } from "@/lib/anchors/types";
import type { DrawnAnchor } from "@/lib/anchors/editor";
import type { AiFinding } from "@/types";
import type { Band } from "./colors";

/** The id a finding's mark is drawn with; not `comment-`, so the comment layer ignores it */
export const findingMarkId = (id: string) => `finding-${id}`;

/**
 * Finds each numbered finding in the current content and tints it in the
 * band's colour. One whose text was edited away is listed as outdated.
 */
export function findingMarks(
  items: readonly { finding: AiFinding; number: number }[],
  content: AnchorContent,
  band: Band,
  focusedId?: string | null,
): { drawn: DrawnAnchor[]; outdated: string[] } {
  const drawn: DrawnAnchor[] = [];
  const outdated: string[] = [];
  for (const { finding, number } of items) {
    const id = findingMarkId(finding.id);
    const range = resolveAnchor(content, finding.anchor);
    if (range === OUTDATED) {
      outdated.push(id);
      continue;
    }
    const focus = id === focusedId ? " review-mark--focus" : "";
    drawn.push({
      id,
      range,
      className: `review-finding review-finding--${band}${focus}`,
      badge: number,
    });
  }
  return { drawn, outdated };
}
