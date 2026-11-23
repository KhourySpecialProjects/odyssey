"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  chatTitle,
  continueHref,
  relativeTime,
  startedIn,
} from "@/lib/mentor/chat-row";
import { displayAnswer } from "@/lib/mentor/answer-text";
import {
  deleteAllMentorChats,
  deleteMentorChat,
  getMentorChat,
  listMentorChats,
  type MentorChatMessage,
  type MentorChatSummary,
} from "@/lib/requests/mentor-chats";

const DEBOUNCE_MS = 300;
const SEARCH_MAX = 100;

type Listing =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "ready"; chats: MentorChatSummary[] };
type Opened = { id: string } & (
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; messages: MentorChatMessage[] }
);
type Pending = { kind: "one"; chat: MentorChatSummary } | { kind: "all" };

/** Activity > Mentor chats: search, read, continue and delete saved chats (ODY-937). */
export function MentorChatsPage() {
  const [input, setInput] = useState("");
  // The term lives in state only, never the URL, so analytics and logs can't see it
  const [q, setQ] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  const [listing, setListing] = useState<Listing>({ status: "loading" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [opened, setOpened] = useState<Opened>({ id: "", status: "loading" });
  const [pending, setPending] = useState<Pending | null>(null);
  const [deleting, setDeleting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const latest = useRef(0);
  const trigger = useRef<HTMLElement | null>(null);
  const deleted = useRef(false);

  useEffect(() => {
    const next = input.trim().slice(0, SEARCH_MAX);
    if (next === q) return;
    const timer = setTimeout(() => setQ(next), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, q]);

  const load = useCallback(async () => {
    const call = (latest.current += 1);
    const res = await listMentorChats(q ? { q } : {});
    if (call !== latest.current) return;
    // An unfiltered load is the student's whole history
    if (res.ok && !q) setTotal(res.data.length);
    setListing(
      res.ok
        ? { status: "ready", chats: res.data }
        : res.error === "unauthenticated"
          ? { status: "signed-out" }
          : { status: "error" },
    );
  }, [q]);
  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (id: string) => {
    if (expanded === id) return setExpanded(null);
    setExpanded(id);
    setOpened({ id, status: "loading" });
    const res = await getMentorChat(id);
    // Only the latest row opened takes the answer
    setOpened((now) =>
      now.id !== id
        ? now
        : res.ok
          ? { id, status: "ready", messages: res.data.messages }
          : { id, status: "error" },
    );
  };

  const confirm = async () => {
    if (!pending) return;
    setDeleting(true);
    const res =
      pending.kind === "all"
        ? await deleteAllMentorChats()
        : await deleteMentorChat(pending.chat.documentId);
    setDeleting(false);
    deleted.current = false;
    if (!res.ok && !(pending.kind === "one" && res.error === "not_found")) {
      toast.error("Couldn't delete");
      setPending(null);
      return;
    }
    deleted.current = true;
    setTotal((n) => (pending.kind === "all" ? 0 : n === null ? n : n - 1));
    setListing((s) =>
      s.status !== "ready"
        ? s
        : {
            status: "ready",
            chats:
              pending.kind === "all"
                ? []
                : s.chats.filter(
                    (c) => c.documentId !== pending.chat.documentId,
                  ),
          },
    );
    if (pending.kind === "all" || expanded === pending.chat.documentId)
      setExpanded(null);
    setPending(null);
  };

  const ask = (p: Pending, e: React.MouseEvent<HTMLElement>) => {
    trigger.current = e.currentTarget;
    deleted.current = false;
    setPending(p);
  };

  const chats = listing.status === "ready" ? listing.chats : [];
  const searching = q !== "";
  const summary =
    listing.status !== "ready"
      ? ""
      : chats.length === 0
        ? searching
          ? `No chats match ‘${q}’`
          : "No saved chats yet"
        : `${chats.length} ${chats.length === 1 ? "chat" : "chats"}${searching ? ` match ‘${q}’` : ""}`;

  return (
    <section aria-labelledby="mentor-chats-heading" className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1
          id="mentor-chats-heading"
          ref={heading}
          tabIndex={-1}
          className="text-xl font-semibold text-slate-900 outline-none dark:text-slate-50"
        >
          Mentor chats
        </h1>
        {listing.status === "ready" && (chats.length > 0 || searching) && (
          <Button
            type="button"
            variant="outline"
            onClick={(e) => ask({ kind: "all" }, e)}
          >
            Delete all chats
          </Button>
        )}
      </div>

      <div className="relative mb-3">
        <Input
          type="search"
          aria-label="Search Mentor chats"
          placeholder="Search by title, droplet or lesson"
          maxLength={SEARCH_MAX}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pr-10"
        />
        {input && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setInput("");
              setQ("");
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#287697] dark:text-slate-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p
        aria-live="polite"
        className="mb-3 text-sm text-slate-600 dark:text-slate-300"
      >
        {listing.status === "loading" ? "Loading chats…" : summary}
      </p>

      {listing.status === "signed-out" && (
        <p role="alert" className="text-sm">
          Sign in to see your Mentor chats.
        </p>
      )}
      {listing.status === "error" && (
        <div role="alert" className="text-sm text-red-700 dark:text-red-300">
          <p>Couldn&apos;t load your chats.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 underline"
          >
            Try again
          </button>
        </div>
      )}

      {chats.length > 0 && (
        <ul aria-label="Saved chats" className="space-y-2">
          {chats.map((c) => {
            const open = expanded === c.documentId;
            const body = opened.id === c.documentId ? opened : null;
            const where = startedIn(c);
            const when = relativeTime(c.lastMessageAt);
            const href = continueHref(c);
            return (
              <li
                key={c.documentId}
                className="rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`chat-${c.documentId}`}
                    onClick={() => void toggle(c.documentId)}
                    className="min-w-0 flex-1 rounded-lg p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#287697]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {chatTitle(c)}
                      </span>
                      {c.kind === "explain" && (
                        <Badge variant="secondary">Explain</Badge>
                      )}
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
                    onClick={(e) => ask({ kind: "one", chat: c }, e)}
                    className="rounded p-2 text-slate-600 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#287697] dark:text-slate-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {open && (
                  <div
                    id={`chat-${c.documentId}`}
                    className="space-y-3 border-t border-slate-200 p-3 text-sm dark:border-slate-700"
                  >
                    {body?.status === "loading" && (
                      <p aria-live="polite">Loading conversation…</p>
                    )}
                    {body?.status === "error" && (
                      <p
                        role="alert"
                        className="text-red-700 dark:text-red-300"
                      >
                        Couldn&apos;t open that chat.
                      </p>
                    )}
                    {body?.status === "ready" &&
                      body.messages.map((m) => (
                        <div key={m.documentId}>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {m.role === "user" ? "You" : "Mentor"}
                          </p>
                          <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-50">
                            {m.role === "user"
                              ? m.text
                              : displayAnswer(m.text, {
                                  streaming: false,
                                }).trim()}
                          </p>
                        </div>
                      ))}
                    {href && (
                      <Link
                        href={href}
                        className="inline-block font-medium text-[#287697] underline dark:text-[#4AABCF]"
                      >
                        Continue in lesson
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && !deleting && setPending(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // The opening button, or the heading once its row is gone
            e.preventDefault();
            (deleted.current ? heading : trigger).current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "all"
                ? searching
                  ? `This deletes all ${total ?? chats.length} of your chats, not only the ones matching ‘${q}’. This can't be undone.`
                  : "Delete all your Mentor chats? This can't be undone."
                : "Delete this chat? This can't be undone."}
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
    </section>
  );
}
