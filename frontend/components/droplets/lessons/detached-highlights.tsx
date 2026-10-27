"use client";

import { useId, useState } from "react";
import { IconHighlightOff, IconNotebook } from "@tabler/icons-react";
import { Highlight } from "@/types";

interface DetachedHighlightsProps {
  /** The reader's highlights on text the author has since deleted */
  highlights: Highlight[];
  /** The one the reader is moving onto new text, if any */
  movingId: number | null;
  onMove: (highlightId: number) => void;
  onCancelMove: () => void;
  onRemove: (highlightId: number) => void;
}

const buttonClass =
  "rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-400/20";

/**
 * Says when some of the reader's highlights are on text that has since been
 * deleted from the lesson (ODY-198), and lists them. They're never removed
 * for the reader: each can be moved onto new text, or removed. A note on one
 * stays either way.
 */
export function DetachedHighlights({
  highlights,
  movingId,
  onMove,
  onCancelMove,
  onRemove,
}: DetachedHighlightsProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  if (highlights.length === 0) return null;
  const moving = highlights.find((h) => h.id === movingId);
  const count = highlights.length;

  return (
    <section
      aria-label="Highlights no longer in this lesson"
      className="my-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
    >
      <div className="flex items-start gap-3">
        <IconHighlightOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {moving ? (
          <p className="flex-1" role="status">
            Select the text this highlight should move to, then choose{" "}
            <strong>Move highlight here</strong>.
          </p>
        ) : (
          <p className="flex-1">
            <strong className="font-semibold">
              This lesson has changed since you highlighted it.
            </strong>{" "}
            {count === 1
              ? "1 of your highlights is"
              : `${count} of your highlights are`}{" "}
            on text that&apos;s no longer here.
          </p>
        )}
        {moving ? (
          <button type="button" className={buttonClass} onClick={onCancelMove}>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className={buttonClass}
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((wasOpen) => !wasOpen)}
          >
            {open ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {open && !moving && (
        <ul id={listId} className="mt-3 space-y-2">
          {highlights.map((highlight) => {
            const id = highlight.id!;
            const quoteId = `${listId}-${id}`;
            return (
              <li
                key={id}
                className="flex flex-col gap-3 rounded-md bg-white/70 p-3 sm:flex-row sm:items-start dark:bg-slate-900/40"
              >
                <div
                  className="min-w-0 flex-1 border-l-4 pl-3"
                  style={{ borderColor: highlight.color }}
                >
                  <p
                    id={quoteId}
                    className="line-clamp-3 break-words text-slate-600 dark:text-slate-300"
                  >
                    “{highlight.text}”
                  </p>
                  {highlight.note && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <IconNotebook className="h-3.5 w-3.5" aria-hidden />
                      Has a note, which stays if you remove the highlight
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className={buttonClass}
                    aria-describedby={quoteId}
                    onClick={() => onMove(id)}
                  >
                    Move to new text
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    aria-describedby={quoteId}
                    onClick={() => onRemove(id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
