"use client";

import { useMemo } from "react";
import type { Block } from "@/types";
import { classicLessonHtml } from "@/lib/review-classic";
import { ReviewTextView } from "./review-text-view";

type ClassicReviewViewProps = Omit<
  React.ComponentProps<typeof ReviewTextView>,
  "html" | "field" | "className" | "testId"
> & { blocks: readonly Block[] };

/**
 * A Classic-editor lesson in Comment mode (ODY-806, Task 7): its blocks as
 * one read-only text, since they have no lasting ids to anchor to.
 */
export function ClassicReviewView({
  blocks,
  ...props
}: ClassicReviewViewProps) {
  const html = useMemo(() => classicLessonHtml(blocks), [blocks]);
  return (
    <ReviewTextView
      {...props}
      html={html}
      field="blocks"
      testId="classic-review-view"
      className="prose prose-lg prose-sky prose-headings:text-inherit prose-strong:text-inherit prose-code:text-inherit max-w-none dark:text-slate-300"
    />
  );
}
