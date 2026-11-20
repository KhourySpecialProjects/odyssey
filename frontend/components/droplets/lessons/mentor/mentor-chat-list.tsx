"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MentorChatSummary } from "@/lib/requests/mentor-chats";

export type ChatListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; chats: MentorChatSummary[] };

/** "just now", "5 min ago", "3 hr ago", "2 days ago" */
export function relativeTime(iso: string | null, now = Date.now()) {
  const then = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export const chatTitle = (c: MentorChatSummary) => c.title?.trim() || "Chat";

const startedIn = (c: MentorChatSummary) =>
  [c.lesson?.name, c.droplet?.name].filter(Boolean).join(" · ");

/** The student's saved chats, newest first, with open and delete per row. */
export function MentorChatList({
  state,
  openId,
  busy,
  onOpen,
  onDelete,
  onRetry,
  onFocusHeading,
}: {
  state: ChatListState;
  openId: string | null;
  /** An answer is streaming: opening or deleting the open chat would lose it */
  busy: boolean;
  onOpen: (id: string) => void;
  onDelete: (chat: MentorChatSummary) => Promise<void>;
  onRetry: () => void;
  /** Where focus goes when the button that opened the dialog is gone */
  onFocusHeading: () => void;
}) {
  const [pending, setPending] = useState<MentorChatSummary | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (state.status === "loading")
    return (
      <p
        aria-live="polite"
        aria-busy="true"
        className="text-sm text-slate-600 dark:text-slate-300"
      >
        Loading chats…
      </p>
    );
  if (state.status === "error")
    return (
      <div role="alert" className="text-sm text-red-700 dark:text-red-300">
        <p>Couldn&apos;t load your chats.</p>
        <button type="button" onClick={onRetry} className="mt-2 underline">
          Try again
        </button>
      </div>
    );
  if (state.chats.length === 0)
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        No saved chats yet
      </p>
    );

  const confirm = async () => {
    if (!pending) return;
    setDeleting(true);
    try {
      await onDelete(pending);
    } finally {
      setDeleting(false);
      setPending(null);
    }
  };

  return (
    <>
      <ul aria-label="Saved chats" className="space-y-1">
        {state.chats.map((c) => {
          const current = c.documentId === openId;
          const where = startedIn(c);
          const when = relativeTime(c.lastMessageAt);
          return (
            <li
              key={c.documentId}
              className={`flex items-center gap-1 rounded-lg border ${
                current
                  ? "border-[#287697] bg-slate-100 dark:border-[#6cc0e0] dark:bg-slate-800"
                  : "border-transparent"
              }`}
            >
              <button
                type="button"
                aria-current={current ? "true" : undefined}
                disabled={busy}
                onClick={() => onOpen(c.documentId)}
                className="min-w-0 flex-1 rounded-lg p-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#287697] disabled:opacity-60"
              >
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {chatTitle(c)}
                </span>
                <span className="block truncate text-xs text-slate-600 dark:text-slate-300">
                  {where && `Started in ${where}`}
                  {where && when && " · "}
                  {when}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Delete chat: ${chatTitle(c)}`}
                disabled={busy && current}
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setPending(c);
                }}
                className="rounded p-2 text-slate-600 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#287697] disabled:opacity-60 dark:text-slate-300"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && !deleting && setPending(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
            else onFocusHeading();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this chat? This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirm();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
