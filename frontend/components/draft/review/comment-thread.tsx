"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { ReviewComment } from "@/types";
import type { ReviewActionError } from "@/lib/requests/reviews";
import { commentTime } from "@/lib/review-comments";
import { isEdited, replyTime } from "@/lib/review-threads";
import type { CommentOutcome } from "@/hooks/use-review-comments";

/** Edit and delete of the viewer's own replies (G14) */
export type ReplyEdits = {
  edit: (id: number, body: string) => Promise<CommentOutcome>;
  remove: (id: number) => Promise<CommentOutcome>;
};

interface CommentThreadProps {
  replies: ReviewComment[];
  /** A sent resolve ended the thread: no more replies */
  closed: boolean;
  /** Shown only when given */
  onReply?: (body: string) => Promise<CommentOutcome>;
  /** Own replies get Edit and Delete only when given, with `onReply` */
  edits?: ReplyEdits;
}

const FAILED = "That didn't save. Try again.";
const SINCE = "Someone has replied since.";
const CLOSED = "Replies are closed.";

const BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none disabled:opacity-50";
const GHOST = `${BUTTON} text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800`;
const PRIMARY = `${BUTTON} bg-[var(--rc-accent)] font-semibold text-white hover:bg-[#255e78]`;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function replyAuthor(reply: ReviewComment) {
  const name = [reply.author?.firstName, reply.author?.lastName]
    .filter(Boolean)
    .join(" ");
  return name || (reply.mine ? "You" : "Someone");
}

const LINK =
  "rounded text-xs font-medium text-slate-600 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none disabled:opacity-50 dark:text-slate-300";

/** The text and, for an open thread's own reply, Edit and Delete (G14). */
function ReplyBody({
  reply,
  edits,
  onRemoved,
  report,
}: {
  reply: ReviewComment;
  edits?: ReplyEdits;
  onRemoved: () => void;
  /** Tells the thread (which outlives this row) a change failed; null clears */
  report: (error: ReviewActionError | null) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [draft, setDraft] = useState(reply.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  useEffect(() => {
    if (mode === "delete") keepRef.current?.focus();
    if (mode !== "view" || !refocus.current) return;
    refocus.current = false;
    editRef.current?.focus();
  }, [mode]);

  // A later reply by someone else ends editing; say so, don't drop the text
  useEffect(() => {
    if (edits || mode === "view") return;
    if (mode === "edit") report("conflict");
    setMode("view");
  }, [edits, mode, report]);

  const back = () => {
    refocus.current = true;
    setError(null);
    setMode("view");
  };
  const run = async (
    action: () => Promise<CommentOutcome>,
    done: () => void,
  ) => {
    setBusy(true);
    setError(null);
    report(null);
    const outcome = await action();
    setBusy(false);
    if (outcome.ok) return done();
    // The thread outlives this row, so it shows closures, conflicts and deletes
    const ownsIt =
      mode === "edit" &&
      outcome.error !== "conflict" &&
      outcome.error !== "review_closed";
    if (ownsIt) return setError(FAILED);
    report(outcome.error);
    setMode("view");
  };

  if (mode === "edit" && edits) {
    return (
      <div className="grid gap-1.5">
        <textarea
          aria-label="Edit your reply"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            setDraft(reply.body);
            back();
          }}
          rows={2}
          maxLength={5000}
          autoFocus
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--rc-accent)] focus:ring-2 focus:ring-[var(--rc-accent)]/30 focus:outline-none dark:border-[#33425c] dark:bg-[#0b1220] dark:text-slate-100"
        />
        {error && (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={GHOST}
            onClick={() => {
              setDraft(reply.body);
              back();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={PRIMARY}
            disabled={busy || draft.trim().length === 0}
            onClick={() => run(() => edits.edit(reply.id, draft.trim()), back)}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="[overflow-wrap:anywhere] whitespace-pre-wrap text-slate-800 dark:text-slate-100">
        {reply.body}
      </p>
      {edits && mode === "view" && (
        <div className="flex gap-3">
          <button
            ref={editRef}
            type="button"
            className={LINK}
            onClick={() => {
              setDraft(reply.body);
              setMode("edit");
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className={LINK}
            onClick={() => setMode("delete")}
          >
            Delete
          </button>
        </div>
      )}
      {edits && mode === "delete" && (
        <div className="flex items-center gap-2">
          <span className="mr-auto text-slate-600 dark:text-slate-300">
            Delete this reply?
          </span>
          <button ref={keepRef} type="button" className={GHOST} onClick={back}>
            Keep
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => edits.remove(reply.id), onRemoved)}
            className={`${BUTTON} bg-red-600 font-semibold text-white hover:bg-red-700`}
          >
            Delete
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}

/**
 * A comment's replies, oldest first, with a Reply box while the thread is
 * open (ODY-881). Esc closes the box, not the card around it.
 */
export function CommentThread({
  replies,
  closed,
  onReply,
  edits,
}: CommentThreadProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // The server said a sent resolve closed the thread
  const [closedNow, setClosedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A reply change that failed after its row had gone from the list
  const [notice, setNotice] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // The Reply button is back after the box closes; focus follows it
  const refocus = useRef(false);
  const closeBox = () => {
    refocus.current = true;
    setOpen(false);
  };
  useEffect(() => {
    if (open || !refocus.current) return;
    refocus.current = false;
    toggleRef.current?.focus();
  }, [open]);

  const focusToggle = () =>
    requestAnimationFrame(() => toggleRef.current?.focus());

  // A failed edit or delete: closed hides every control, else a notice here
  const report = useCallback((failure: ReviewActionError | null) => {
    if (failure === "review_closed") {
      setClosedNow(true);
      setOpen(false);
      return setNotice(null);
    }
    setNotice(!failure ? null : failure === "conflict" ? SINCE : FAILED);
    if (failure) requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!onReply || !body || busy) return;
    setBusy(true);
    setError(null);
    const outcome = await onReply(body);
    setBusy(false);
    if (!outcome.ok) {
      if (outcome.error === "review_closed") {
        setClosedNow(true);
        setOpen(false);
      } else {
        setError(FAILED);
      }
      return;
    }
    setText("");
    closeBox();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setError(null);
      closeBox();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="grid gap-2 border-t border-slate-200 pt-2 dark:border-[#223047]">
      {replies.length > 0 && (
        <ul
          aria-label="Replies"
          className="grid max-h-60 gap-2 overflow-y-auto"
        >
          {replies.map((reply, index) => {
            const name = replyAuthor(reply);
            // Own reply, open thread, and nobody else has replied after it
            const editable =
              !!edits &&
              !!onReply &&
              !closed &&
              !closedNow &&
              !!reply.mine &&
              reply.id > 0 &&
              !replies.slice(index + 1).some((r) => !r.mine);
            const time = commentTime(replyTime(reply));
            return (
              <li key={reply.id} className="flex gap-2">
                <span
                  aria-hidden
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--rc-accent-soft)] text-[10px] font-semibold text-[var(--rc-accent-text)]"
                >
                  {initials(name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                    <strong className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {name}
                    </strong>
                    {reply.id < 0 ? (
                      <span>Saving…</span>
                    ) : (
                      time && <span>{time}</span>
                    )}
                    {isEdited(reply) && <span>· edited</span>}
                  </p>
                  <ReplyBody
                    reply={reply}
                    edits={editable ? edits : undefined}
                    onRemoved={focusToggle}
                    report={report}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {notice && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {notice}
        </p>
      )}

      {closed || closedNow ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {closed ? "Resolved · replies are closed" : CLOSED}
        </p>
      ) : (
        onReply &&
        (open ? (
          <div className="grid gap-2">
            <textarea
              aria-label="Write a reply"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              maxLength={5000}
              autoFocus
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--rc-accent)] focus:ring-2 focus:ring-[var(--rc-accent)]/30 focus:outline-none dark:border-[#33425c] dark:bg-[#0b1220] dark:text-slate-100"
            />
            {error && (
              <p role="alert" className="text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={GHOST}
                onClick={() => {
                  setText("");
                  setError(null);
                  closeBox();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={PRIMARY}
                disabled={busy || text.trim().length === 0}
                onClick={send}
              >
                Reply
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              ref={toggleRef}
              type="button"
              className={GHOST}
              onClick={() => setOpen(true)}
            >
              Reply
            </button>
          </div>
        ))
      )}
    </div>
  );
}
