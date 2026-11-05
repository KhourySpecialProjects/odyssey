"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { IconSend } from "@tabler/icons-react";
import type { ReviewComment } from "@/types";
import type { ReviewActionError } from "@/lib/requests/reviews";
import { commentTime } from "@/lib/review-comments";
import { cn } from "@/lib/utils";
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
  /** Replies to mark "New": those unseen when the card opened */
  fresh?: ReadonlySet<number>;
  /** The comment itself: a first reply by its author continues its run */
  lead?: ReviewComment;
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

function sameAuthor(a: ReviewComment, b: ReviewComment) {
  if (a.mine || b.mine) return !!a.mine && !!b.mine;
  return a.author?.id === b.author?.id && replyAuthor(a) === replyAuthor(b);
}

// Chat look (experiment): accent #2d7597 with white text is 5.1:1 in light and dark
const BUBBLE =
  "max-w-[85%] rounded-2xl px-3 py-2 [overflow-wrap:anywhere] whitespace-pre-wrap";
const BUBBLE_MINE = "rounded-br-md bg-[var(--rc-accent)] text-white";
const BUBBLE_OTHER =
  "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-[#1a2436] dark:text-slate-100";

export const bubble = (mine?: boolean) =>
  cn(BUBBLE, mine ? BUBBLE_MINE : BUBBLE_OTHER);

/**
 * A message's avatar and name, then `children` in a column on the speaker's
 * side. Yours, and repeats in a run, keep the name for screen readers only.
 */
export function ChatSpeaker({
  mine,
  name,
  starts = true,
  children,
}: {
  mine?: boolean;
  name: string;
  /** Starts a run of messages by one person */
  starts?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {!mine && (
        <span
          aria-hidden
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
            starts && "bg-[var(--rc-accent-soft)] text-[var(--rc-accent-text)]",
          )}
        >
          {starts && initials(name)}
        </span>
      )}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1",
          mine ? "items-end" : "items-start",
        )}
      >
        {mine || !starts ? (
          <span className="sr-only">{mine ? "You" : name}</span>
        ) : (
          <strong className="text-[13px] leading-6 font-semibold text-slate-900 dark:text-slate-100">
            {name}
          </strong>
        )}
        {children}
      </div>
    </>
  );
}

const LINK =
  "rounded text-xs font-medium text-slate-600 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:outline-none disabled:opacity-50 dark:text-slate-300";

/** The text and, for an open thread's own reply, Edit and Delete (G14). */
function ReplyBody({
  reply,
  meta,
  edits,
  onRemoved,
  report,
}: {
  reply: ReviewComment;
  /** Time, edited and New, on the line under the bubble */
  meta: ReactNode;
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
      <div className="grid w-full gap-1.5">
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
      <p className={cn(bubble(reply.mine), reply.id < 0 && "opacity-60")}>
        {reply.body}
      </p>
      {(meta || (edits && mode === "view")) && (
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
          {meta}
          {edits && mode === "view" && (
            <>
              <button
                ref={editRef}
                type="button"
                className={cn(LINK, "ml-1")}
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
            </>
          )}
        </div>
      )}
      {edits && mode === "delete" && (
        <div className="flex w-full items-center gap-2">
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
 * open (ODY-881). Esc clears the box; on an empty box it closes the card.
 */
export function CommentThread({
  replies,
  closed,
  onReply,
  edits,
  fresh,
  lead,
}: CommentThreadProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // The server said a sent resolve closed the thread
  const [closedNow, setClosedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A reply change that failed after its row had gone from the list
  const [notice, setNotice] = useState<string | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Open at the first New reply, else the newest; then follow new ones while
  // the list is at its bottom, and always after your own
  const listRef = useRef<HTMLUListElement>(null);
  const atBottom = useRef(true);
  const opened = useRef(false);
  const last = replies.at(-1);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (opened.current && !atBottom.current && !last?.mine) return;
    const first = opened.current
      ? null
      : list.querySelector<HTMLElement>("[data-fresh]");
    opened.current = true;
    list.scrollTop = first ? first.offsetTop : list.scrollHeight;
  }, [last?.id, last?.mine]);

  // The box grows with its text, up to its max height
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight + 2}px`;
  }, [text]);

  const focusBox = () => requestAnimationFrame(() => boxRef.current?.focus());

  // A failed edit or delete: closed hides every control, else a notice here
  const report = useCallback((failure: ReviewActionError | null) => {
    if (failure === "review_closed") {
      setClosedNow(true);
      return setNotice(null);
    }
    setNotice(!failure ? null : failure === "conflict" ? SINCE : FAILED);
    if (failure) requestAnimationFrame(() => boxRef.current?.focus());
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!onReply || !body || busy) return;
    setBusy(true);
    setError(null);
    const outcome = await onReply(body);
    setBusy(false);
    if (!outcome.ok) {
      if (outcome.error === "review_closed") setClosedNow(true);
      else setError(FAILED);
      return;
    }
    setText("");
    // Sending from the button disables it, which would drop focus
    boxRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      // An empty box lets Esc close the card
      if (!text && !error) return;
      e.stopPropagation();
      setText("");
      setError(null);
    } else if (
      e.key === "Enter" &&
      !e.shiftKey &&
      // Enter that ends an IME composition picks the text; it doesn't send
      !e.nativeEvent.isComposing
    ) {
      // Shift+Enter is a new line
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="grid gap-2">
      {replies.length > 0 && (
        <ul
          ref={listRef}
          aria-label="Replies"
          className="relative max-h-60 overflow-x-hidden overflow-y-auto"
          onScroll={(e) => {
            const l = e.currentTarget;
            atBottom.current =
              l.scrollHeight - l.scrollTop - l.clientHeight < 24;
          }}
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
            // A run of replies by one person shows the name and avatar once
            const before = index === 0 ? lead : replies[index - 1];
            const starts = !before || !sameAuthor(before, reply);
            // ...and a time the next one repeats only under the last
            const after = replies[index + 1];
            const showTime =
              !!time &&
              (!after ||
                !sameAuthor(reply, after) ||
                commentTime(replyTime(after)) !== time);
            const edited = isEdited(reply);
            // One New per run of new replies, beside the last one's time
            const isNew =
              !!fresh?.has(reply.id) &&
              !(after && sameAuthor(reply, after) && fresh.has(after.id));
            const hasMeta = reply.id < 0 || showTime || edited || isNew;
            return (
              <li
                key={reply.id}
                data-fresh={fresh?.has(reply.id) || undefined}
                className={cn(
                  "flex gap-2",
                  reply.mine && "justify-end",
                  starts ? "mt-3 first:mt-0" : "mt-1",
                )}
              >
                <ChatSpeaker mine={reply.mine} name={name} starts={starts}>
                  <ReplyBody
                    reply={reply}
                    meta={
                      hasMeta && (
                        <>
                          {reply.id < 0 ? (
                            <span>Saving…</span>
                          ) : (
                            showTime && <span>{time}</span>
                          )}
                          {edited && (
                            <span>{showTime ? "· edited" : "edited"}</span>
                          )}
                          {isNew && (
                            <span className="rounded bg-amber-100 px-1.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              New
                            </span>
                          )}
                        </>
                      )
                    }
                    edits={editable ? edits : undefined}
                    onRemoved={focusBox}
                    report={report}
                  />
                </ChatSpeaker>
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
        onReply && (
          <div className="grid gap-1">
            <div className="flex items-end gap-2">
              <textarea
                ref={boxRef}
                aria-label="Write a reply"
                placeholder="Reply…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={5000}
                className="max-h-32 min-h-9 flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-3 py-[7px] text-sm leading-5 text-slate-900 placeholder:text-slate-500 focus:border-[var(--rc-accent)] focus:ring-2 focus:ring-[var(--rc-accent)]/30 focus:outline-none dark:border-[#33425c] dark:bg-[#0b1220] dark:text-slate-100 dark:placeholder:text-slate-400"
              />
              <button
                type="button"
                aria-label="Reply"
                title="Reply (Enter)"
                disabled={busy || text.trim().length === 0}
                onClick={send}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--rc-accent)] text-white hover:bg-[#255e78] focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 dark:focus-visible:ring-offset-[#131c2e]"
              >
                <IconSend className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {error && (
              <p role="alert" className="text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
