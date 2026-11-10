"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import type {
  Review,
  ReviewAnchor,
  ReviewComment,
  ReviewCommentField,
  AiFinding,
} from "@/types";
import { cn } from "@/lib/utils";
import { drawAnchor } from "@/lib/anchors/draw";
import { textOf, textParts } from "@/lib/anchors/dom";
import { findingMarks } from "@/lib/review-panel/finding-marks";
import type { Band } from "@/lib/review-panel/colors";
import {
  commentMarks,
  decorateMarks,
  draftMarkIn,
} from "@/lib/review-comments";

/** Toggles a class on one mark's text spans (not its badge marker) */
function toggleMark(root: Element, markId: string | null, cls: string) {
  root
    .querySelectorAll<HTMLElement>("[data-anchor-id]:not(.anchor-badge)")
    .forEach((span) => {
      span.classList.toggle(
        cls,
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
  /** The mark the panel pointed at, ringed (ODY-849) */
  focusedMarkId?: string | null;
  /** The open criterion's findings here (memoized: a new list redraws), and its band */
  findings?: readonly { finding: AiFinding; number: number }[];
  band?: Band;
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
  focusedMarkId,
  findings,
  band,
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
  const focusRef = useRef(focusedMarkId);
  focusRef.current = focusedMarkId;

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
    const found = band ? findingMarks(findings ?? [], content, band).drawn : [];
    for (const mark of found) {
      drawAnchor(root, mark.range, mark.id, {
        className: mark.className,
        badge: mark.badge,
      });
    }
    toggleMark(root, litRef.current, "review-mark--lit");
    toggleMark(root, focusRef.current ?? null, "review-mark--focus");
    onOutdatedRef.current(outdated);
  }, [html, field, comments, reviewState, draftAnchor, findings, band]);

  // Lighting only toggles a class: rewriting the HTML would drop a selection
  // the reviewer is still dragging out
  useLayoutEffect(() => {
    if (rootRef.current) {
      toggleMark(rootRef.current, litMarkId, "review-mark--lit");
    }
  }, [litMarkId]);
  useLayoutEffect(() => {
    if (rootRef.current) {
      toggleMark(rootRef.current, focusedMarkId ?? null, "review-mark--focus");
    }
  }, [focusedMarkId]);

  return (
    <div
      ref={rootRef}
      data-testid={testId}
      className={cn("select-text", className)}
    />
  );
}
