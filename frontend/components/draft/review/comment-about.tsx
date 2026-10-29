"use client";

import type { ReviewAnchor } from "@/types";
import { cn } from "@/lib/utils";
import { pointSides } from "@/lib/review-comments";

/**
 * The words around a spot comment with the caret drawn between them, as the
 * redesign prototype shows it in tags, the composer and the card:
 * “…state|ment…”. Screen readers hear the ‸ text instead.
 */
export function SpotQuote({
  anchor,
  length,
  draft = false,
}: {
  anchor: Extract<ReviewAnchor, { quote: string }>;
  length: number;
  draft?: boolean;
}) {
  const { left, right } = pointSides(anchor, length);
  return (
    <>
      <span aria-hidden>
        “{left}
        <span className={cn("rc-caretmark", draft && "rc-caretmark--draft")} />
        {right}”
      </span>
      <span className="sr-only">{`“${left}‸${right}”`}</span>
    </>
  );
}
