"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IconCheck,
  IconEye,
  IconPencil,
  IconRotate,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import type { ReviewComment } from "@/types";
import { cn } from "@/lib/utils";
import { commentTime } from "@/lib/review-comments";
import { POPOVER_GAP, useDismiss, type PopoverAnchor } from "@/lib/selection";
import type { CommentOutcome } from "@/hooks/use-review-comments";
import { unseenReplies } from "@/lib/review-threads";
import { useThreadSeen } from "./review-comments-context";
import { bubble, CommentThread, type ReplyEdits } from "./comment-thread";

interface CommentCardProps {
  comment: ReviewComment;
  /** Its number, or null once resolved */
  number: number | null;
  /** What it's about, as shown */
  about: ReactNode;
  anchor: PopoverAnchor;
  /** Comments change only while the review is open */
  canChange: boolean;
  onEdit: (body: string) => Promise<CommentOutcome>;
  onDelete: () => Promise<CommentOutcome>;
  onResolve: (resolved: boolean) => Promise<CommentOutcome>;
  onClose: () => void;
  /** Takes focus when it opens; not when a click in the editor opened it */
  focusOnOpen?: boolean;
  /** Said under what it's about, in place of Pending */
  meta?: ReactNode;
  /** The creator's Mark addressed (ODY-807): shown only when given */
  onAddress?: (addressed: boolean) => Promise<CommentOutcome>;
  /** Shown to a droplet's author, reading the feedback sent to them */
  forCreator?: boolean;
  /** Replies to the comment (ODY-881): shown only when given */
  onReply?: (body: string) => Promise<CommentOutcome>;
  /** Edit and delete of own replies; used only with `onReply` */
  replyEdits?: ReplyEdits;
}

type Mode = "view" | "edit" | "confirm-delete";

const FAILED = "That didn't save. Try again.";
const HAS_REPLIES = "This comment has replies. Resolve it instead.";
// Either side's bubble, greyed and struck through (slate-600 on slate-100 is 7:1)
const RESOLVED =
  "bg-slate-100 text-slate-600 line-through dark:bg-[#1a2436] dark:text-slate-400";

const BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none disabled:opacity-50";
const GHOST = `${BUTTON} text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800`;
const SECONDARY = `${BUTTON} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-[#33425c] dark:bg-[#131c2e] dark:text-slate-100 dark:hover:bg-slate-800`;
const PRIMARY = `${BUTTON} bg-[var(--rc-accent)] font-semibold text-white hover:bg-[#255e78]`;

/**
 * An open comment (ODY-806), as the redesign prototype has it: what it's
 * about and whether it's pending, who wrote it and when, the text, and
 * Delete, Edit and Resolve (or Reopen). Esc, the close button or a click
 * outside closes it.
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
  focusOnOpen = true,
  meta,
  onAddress,
  forCreator = false,
  onReply,
  replyEdits,
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
  const pending = canChange && !resolved;
  // Sent and Resolved show already (badge, closed note): only Pending is said
  const status = meta ?? (pending ? "Pending" : null);
  // Not read back yet (no author): the viewer just wrote it
  const mine = comment.mine ?? !comment.author;
  // A carried comment's date is the original's (ODY-807)
  const time = commentTime(comment.carriedFrom?.createdAt ?? comment.createdAt);
  const addressed = !!comment.addressedAt;
  const replies = comment.replies ?? [];

  // Opening the card checks for newer replies; replies unseen now get a New pill
  const { check, seen, markSeen } = useThreadSeen();
  const [fresh, setFresh] = useState<ReadonlySet<number>>(
    () => new Set(unseenReplies(comment, seen).map((r) => r.id)),
  );
  useEffect(() => {
    check();
  }, [check]);
  useEffect(() => {
    const ids = unseenReplies(comment, seen).map((r) => r.id);
    if (ids.length === 0) return;
    setFresh((current) => new Set([...current, ...ids]));
    markSeen(ids);
  }, [comment, seen, markSeen]);

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
    if (focusOnOpen) ref.current?.focus();
  }, [focusOnOpen]);

  const run = async (
    action: () => Promise<CommentOutcome>,
    then?: () => void,
    conflict = FAILED,
  ) => {
    setBusy(true);
    setError(null);
    const outcome = await action();
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.error === "conflict" ? conflict : FAILED);
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
      className="rc-pop-in absolute z-40 grid w-[360px] max-w-full gap-2 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.12)] focus:outline-none dark:border-[#33425c] dark:bg-[#131c2e] dark:text-slate-100 dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
      style={placement}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn(
            "inline-grid h-5 min-w-[22px] shrink-0 place-items-center rounded-[5px] px-1.5 text-[11px] font-bold tabular-nums",
            resolved
              ? "bg-slate-200 text-slate-600 dark:bg-[#26324a] dark:text-slate-300"
              : pending
                ? "border-[1.5px] border-dashed border-[var(--rc-accent)] bg-white text-[var(--rc-accent-text)] dark:bg-[#0b1220]"
                : "bg-[var(--rc-accent)] text-white",
          )}
        >
          {number ?? <IconCheck className="h-3 w-3" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words text-slate-900 dark:text-slate-50">
            {about}
          </p>
          {status && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {status}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close comment"
          onClick={onClose}
          className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <IconX className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* The comment is the first bubble of its thread (ODY-893) */}
      <CommentThread
        lead={{
          comment: { ...comment, mine },
          body: (
            <>
              {mode === "edit" ? (
                <textarea
                  aria-label="Edit your comment"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  autoFocus
                  className="min-h-[76px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--rc-accent)] focus:ring-2 focus:ring-[var(--rc-accent)]/30 focus:outline-none dark:border-[#33425c] dark:bg-[#0b1220] dark:text-slate-100"
                />
              ) : (
                <p className={cn(bubble(mine), resolved && RESOLVED)}>
                  {comment.body}
                </p>
              )}
              {time && mode !== "edit" && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {time}
                </span>
              )}
            </>
          ),
        }}
        replies={replies}
        closed={resolved}
        onReply={onReply}
        edits={replyEdits}
        fresh={fresh}
      />

      {addressed && !resolved && (
        <p className="flex items-start gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
          <IconCheck
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--rc-accent-text)]"
            aria-hidden
          />
          {forCreator
            ? "Marked addressed. The reviewer resolves it."
            : "The creator marked this addressed."}
        </p>
      )}

      {/* Once replied to, the creator has seen it: nothing is hidden */}
      {mode === "view" && pending && replies.length === 0 && (
        <p className="flex items-start gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
          <IconEye className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Only you can see this until you request changes.
        </p>
      )}

      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {mode === "edit" && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={GHOST}
            onClick={() => {
              setDraft(comment.body);
              setMode("view");
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={PRIMARY}
            disabled={busy || draft.trim().length === 0}
            onClick={() =>
              run(
                () => onEdit(draft.trim()),
                () => setMode("view"),
              )
            }
          >
            Save
          </button>
        </div>
      )}

      {mode === "confirm-delete" && (
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-slate-600 dark:text-slate-300">
            Delete this comment?
          </span>
          <button
            type="button"
            className={GHOST}
            onClick={() => setMode("view")}
          >
            Keep
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(onDelete, onClose, HAS_REPLIES)}
            className={`${BUTTON} bg-red-600 font-semibold text-white hover:bg-red-700`}
          >
            Delete
          </button>
        </div>
      )}

      {mode === "view" && onAddress && !resolved && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={addressed ? GHOST : SECONDARY}
            disabled={busy}
            onClick={() => run(() => onAddress(!addressed))}
          >
            {addressed ? (
              <IconRotate className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <IconCheck className="h-3.5 w-3.5" aria-hidden />
            )}
            {addressed ? "Not addressed yet" : "Mark addressed"}
          </button>
        </div>
      )}

      {mode === "view" && !onAddress && (
        <div className="flex flex-wrap justify-end gap-2">
          {saving ? (
            <span className="text-slate-500">Saving...</span>
          ) : (
            canChange && (
              <>
                {/* Once replied to, the comment stays as the thread read it */}
                {!resolved && replies.length === 0 && (
                  <>
                    <button
                      type="button"
                      className={GHOST}
                      onClick={() => setMode("confirm-delete")}
                    >
                      <IconTrash className="h-3.5 w-3.5" aria-hidden />
                      Delete
                    </button>
                    <button
                      type="button"
                      className={SECONDARY}
                      onClick={() => setMode("edit")}
                    >
                      <IconPencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={SECONDARY}
                  disabled={busy}
                  onClick={() => run(() => onResolve(!resolved), onClose)}
                >
                  {resolved ? (
                    <IconRotate className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <IconCheck className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {resolved ? "Reopen" : "Resolve"}
                </button>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
