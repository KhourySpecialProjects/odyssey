"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import type {
  Review,
  ReviewAnchor,
  ReviewComment,
  ReviewCommentField,
} from "@/types";
import { cn } from "@/lib/utils";
import { drawAnchor } from "@/lib/anchors/draw";
import { textOf, textParts } from "@/lib/anchors/dom";
import {
  commentMarks,
  decorateMarks,
  draftMarkIn,
} from "@/lib/review-comments";

function lightMark(root: Element, markId: string | null) {
  root.querySelectorAll<HTMLElement>("[data-anchor-id]").forEach((span) => {
    span.classList.toggle(
      "review-mark--lit",
      span.getAttribute("data-anchor-id") === markId,
    );
  });
}

interface ReviewTextViewProps {
  /** The text as HTML; it's sanitized here */
  html: string;
  /** The field its comments anchor in: "blocks" for a lesson */
  field: ReviewCommentField;
  comments: readonly ReviewComment[];
  reviewState: Review["state"] | undefined;
  draftAnchor: ReviewAnchor | null;
  litMarkId: string | null;
  /** Comments whose text is gone, found once the text is on the page */
  onOutdated: (comments: ReviewComment[]) => void;
  className?: string;
  testId?: string;
}

/**
 * Read-only text a reviewer comments on by quote (ODY-806): a Classic lesson
 * (Task 7) or an Overview field (Task 8), with comment marks drawn by
 * lib/anchors. Its children are written here rather than by React, so
 * wrapping text in mark spans can't upset React, and they're rewritten
 * whenever the marks change. Anchors are quotes within the whole text;
 * offsets count the text on the page.
 */
export function ReviewTextView({
  html: source,
  field,
  comments,
  reviewState,
  draftAnchor,
  litMarkId,
  onOutdated,
  className,
  testId,
}: ReviewTextViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => DOMPurify.sanitize(source), [source]);
  const onOutdatedRef = useRef(onOutdated);
  onOutdatedRef.current = onOutdated;

  const litRef = useRef(litMarkId);
  litRef.current = litMarkId;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = html;
    const content = { [field]: [{ text: textOf(textParts(root, false)) }] };
    const { drawn, outdated } = commentMarks(comments, content, reviewState);
    const marks = decorateMarks(drawn, null, draftMarkIn(content, draftAnchor));
    for (const mark of marks) {
      drawAnchor(root, mark.range, mark.id, {
        className: mark.className,
        point: mark.point,
      });
    }
    lightMark(root, litRef.current);
    onOutdatedRef.current(outdated);
  }, [html, field, comments, reviewState, draftAnchor]);

  // Lighting only toggles a class: rewriting the HTML would drop a selection
  // the reviewer is still dragging out
  useLayoutEffect(() => {
    if (rootRef.current) lightMark(rootRef.current, litMarkId);
  }, [litMarkId]);

  return (
    <div
      ref={rootRef}
      data-testid={testId}
      className={cn("select-text", className)}
    />
  );
}
