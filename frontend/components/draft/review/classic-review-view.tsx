"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import type { Block, Review, ReviewAnchor, ReviewComment } from "@/types";
import { drawAnchor } from "@/lib/anchors/draw";
import { textOf, textParts } from "@/lib/anchors/dom";
import { classicLessonHtml } from "@/lib/review-classic";
import {
  commentMarks,
  decorateMarks,
  draftRangeIn,
} from "@/lib/review-comments";

function lightMark(root: Element, markId: string | null) {
  root.querySelectorAll<HTMLElement>("[data-anchor-id]").forEach((span) => {
    span.classList.toggle(
      "review-mark--lit",
      span.getAttribute("data-anchor-id") === markId,
    );
  });
}

interface ClassicReviewViewProps {
  blocks: readonly Block[];
  comments: readonly ReviewComment[];
  reviewState: Review["state"] | undefined;
  draftAnchor: ReviewAnchor | null;
  litMarkId: string | null;
  /** Comments whose text is gone, found once the lesson is on the page */
  onOutdated: (comments: ReviewComment[]) => void;
}

/**
 * A Classic-editor lesson in Comment mode (ODY-806, Task 7): read-only HTML
 * the reviewer can select, with comment marks drawn by lib/anchors. Its
 * children are written here rather than by React, so wrapping text in mark
 * spans can't upset React, and they're rewritten whenever the marks change.
 * Anchors are quotes within the whole lesson; offsets count the text on the
 * page.
 */
export function ClassicReviewView({
  blocks,
  comments,
  reviewState,
  draftAnchor,
  litMarkId,
  onOutdated,
}: ClassicReviewViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () => DOMPurify.sanitize(classicLessonHtml(blocks)),
    [blocks],
  );
  const onOutdatedRef = useRef(onOutdated);
  onOutdatedRef.current = onOutdated;

  const litRef = useRef(litMarkId);
  litRef.current = litMarkId;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = html;
    const content = { blocks: [{ text: textOf(textParts(root, false)) }] };
    const { drawn, outdated } = commentMarks(comments, content, reviewState);
    const marks = decorateMarks(
      drawn,
      null,
      draftRangeIn(content, draftAnchor),
    );
    for (const mark of marks) {
      for (const span of drawAnchor(root, mark.range, mark.id)) {
        span.className = mark.className ?? "";
      }
    }
    lightMark(root, litRef.current);
    onOutdatedRef.current(outdated);
  }, [html, comments, reviewState, draftAnchor]);

  // Lighting only toggles a class: rewriting the HTML would drop a selection
  // the reviewer is still dragging out
  useLayoutEffect(() => {
    if (rootRef.current) lightMark(rootRef.current, litMarkId);
  }, [litMarkId]);

  return (
    <div
      ref={rootRef}
      data-testid="classic-review-view"
      className="prose prose-lg prose-sky prose-headings:text-inherit prose-strong:text-inherit prose-code:text-inherit max-w-none select-text dark:text-slate-300"
    />
  );
}
