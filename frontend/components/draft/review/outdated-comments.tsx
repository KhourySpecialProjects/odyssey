"use client";

import type { ReviewComment } from "@/types";

/**
 * Comments whose text has since been edited away (ODY-806, D11). They have no
 * mark to hang on, so they're listed under the comment strip, never dropped.
 */
export function OutdatedComments({
  comments,
}: {
  comments: readonly ReviewComment[];
}) {
  if (comments.length === 0) return null;
  return (
    <section
      aria-label="Outdated comments"
      className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <p className="font-medium text-slate-700 dark:text-slate-200">
        Outdated ({comments.length}): the text{" "}
        {comments.length === 1 ? "it pointed at has" : "they pointed at has"}{" "}
        changed
      </p>
      <ul className="mt-1 space-y-1">
        {comments.map((comment) => (
          <li key={comment.id} className="text-slate-600 dark:text-slate-300">
            {"quote" in comment.anchor && (
              <q className="text-slate-500 italic dark:text-slate-400">
                {comment.anchor.quote}
              </q>
            )}{" "}
            {comment.body}
          </li>
        ))}
      </ul>
    </section>
  );
}
