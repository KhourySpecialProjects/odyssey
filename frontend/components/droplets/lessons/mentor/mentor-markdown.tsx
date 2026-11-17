"use client";

import { lazy, Suspense } from "react";

const Markdown = lazy(() => import("react-markdown"));

const ALLOWED = ["p", "strong", "em", "code", "pre", "ul", "ol", "li"];

/** Mentor's Markdown: a few inline and list elements; links unwrap to text. */
export function MentorMarkdown({ children }: { children: string }) {
  return (
    <Suspense fallback={<p>{children}</p>}>
      <Markdown allowedElements={ALLOWED} unwrapDisallowed>
        {children}
      </Markdown>
    </Suspense>
  );
}
