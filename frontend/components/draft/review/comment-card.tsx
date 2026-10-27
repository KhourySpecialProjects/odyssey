"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { ReviewComment } from "@/types";
import { POPOVER_GAP, useDismiss, type PopoverAnchor } from "@/lib/selection";
import type { CommentOutcome } from "@/hooks/use-review-comments";

interface CommentCardProps {
  comment: ReviewComment;
  /** Its number, or null once resolved */
  number: number | null;
  /** What it's about, read in full */
  about: string;
  anchor: PopoverAnchor;
  /** Comments change only while the review is open */
  canChange: boolean;
  onEdit: (body: string) => Promise<CommentOutcome>;
  onDelete: () => Promise<CommentOutcome>;
  onResolve: (resolved: boolean) => Promise<CommentOutcome>;
  onClose: () => void;
}

type Mode = "view" | "edit" | "confirm-delete";

const FAILED = "That didn't save. Try again.";

/**
 * An open comment (ODY-806, Task 6): what it's about, the text, and Edit,
 * Delete and Resolve. Esc or a click outside closes it.
 */
export function CommentCard({
  comment,
  number,
  about,
  anchor,
  canChange,
  onEdit,
  onDelete,
  onResolve,
  onClose,
}: CommentCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placement, setPlacement] = useState({
    left: 0,
    top: anchor.bottom + POPOVER_GAP,
  });
  const resolved = !!comment.resolvedAt;
  // Not saved yet: nothing to change on the server
  const saving = comment.id < 0;

  useDismiss(ref, onClose);

  useLayoutEffect(() => {
    const card = ref.current;
    const parent = card?.parentElement;
    if (!card || !parent) return;
    const width = card.offsetWidth;
    setPlacement({
      left: Math.max(
        0,
        Math.min(anchor.centerX - width / 2, parent.clientWidth - width),
      ),
      top: anchor.bottom + POPOVER_GAP,
    });
  }, [anchor]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const run = async (
    action: () => Promise<CommentOutcome>,
    then?: () => void,
  ) => {
    setBusy(true);
    setError(null);
    const outcome = await action();
    setBusy(false);
    if (!outcome.ok) {
      setError(FAILED);
      return;
    }
    then?.();
  };

  return (
    <div
      ref={ref}
      role="dialog"
      tabIndex={-1}
      aria-label={number ? `Comment ${number}` : "Resolved comment"}
      className="absolute z-40 w-80 max-w-full rounded-lg border border-[#eaecf0] bg-white p-3 text-sm shadow-[0px_4px_6px_-2px_rgba(16,24,40,0.03),0px_12px_16px_-4px_rgba(16,24,40,0.08)] focus:outline-none dark:border-slate-700 dark:bg-slate-900"
      style={placement}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-amber-100 px-1 text-xs font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100"
          aria-hidden
        >
          {number ?? <IconCheck className="h-3 w-3" />}
        </span>
        <span className="truncate text-slate-500 dark:text-slate-400">
          {about}
        </span>
      </div>

      {mode === "edit" ? (
        <>
          <textarea
            aria-label="Edit your comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={5000}
            autoFocus
            className="w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(comment.body);
                setMode("view");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={busy || draft.trim().length === 0}
              onClick={() =>
                run(
                  () => onEdit(draft.trim()),
                  () => setMode("view"),
                )
              }
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Save
            </Button>
          </div>
        </>
      ) : (
        <p
          className={
            resolved
              ? "whitespace-pre-wrap text-slate-500 line-through dark:text-slate-400"
              : "whitespace-pre-wrap text-slate-800 dark:text-slate-100"
          }
        >
          {comment.body}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-1 text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {mode === "confirm-delete" && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <span className="mr-auto text-slate-600 dark:text-slate-300">
            Delete this comment?
          </span>
          <Button size="sm" variant="outline" onClick={() => setMode("view")}>
            Keep
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => run(onDelete, onClose)}
          >
            Delete
          </Button>
        </div>
      )}

      {mode === "view" && (
        <div className="mt-2 flex justify-end gap-2">
          {saving ? (
            <span className="text-slate-500">Saving...</span>
          ) : (
            canChange && (
              <>
                {!resolved && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode("edit")}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode("confirm-delete")}
                    >
                      Delete
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => onResolve(!resolved), onClose)}
                >
                  {resolved ? "Reopen" : "Resolve"}
                </Button>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
