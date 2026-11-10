"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Send, Sparkles, Square, X } from "lucide-react";
import { LESSON_PANEL } from "@/lib/lesson-panel";
import { MENTOR_MESSAGE_MAX } from "@/lib/validations/mentor";
import type { ChatMsg } from "@/hooks/use-mentor-chat";
import type { MentorMsg } from "@/lib/mentor/chat-types";
import type { Citation } from "@/lib/mentor/types";
import { MentorMessage, StudentMessage } from "./mentor-message";
import { MentorNotice } from "./mentor-notice";

export const STARTERS = [
  "Summarize this lesson",
  "Explain the example",
  "Quiz me on this",
];

type SheetProps = {
  open: boolean;
  modal: boolean;
  lessonName: string;
  messages: ChatMsg[];
  streaming: boolean;
  lock: string | null;
  accepted: boolean;
  /** Opened by Explain: a wide sheet leaves focus, and the selection, in the lesson */
  openedByExplain: boolean;
  announcement: { n: number; text: string };
  draft: string;
  setDraft: (draft: string) => void;
  onClose: () => void;
  onAccept: () => void;
  onSend: (message: string) => void;
  onStop: () => void;
  onRetry: (id: string) => void;
  onShowSource: (citation: Citation) => void;
  onSave?: (message: MentorMsg) => Promise<boolean>;
};

/** The dialog chrome: header, conversation, composer. State lives in MentorPanel. */
export function MentorSheet(p: SheetProps) {
  const composer = useRef<HTMLTextAreaElement>(null);
  const gotIt = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // Only a student close (Esc, X) returns focus to Ask Mentor, not a swap to Notes
  const studentClosed = useRef(false);
  // On wide screens the sheet stacks inside the lesson like the Notes panel,
  // so the notes toggle (also inside it) stays above the sheet's edge
  const [wrapper] = useState(() =>
    typeof document === "undefined"
      ? null
      : document.querySelector<HTMLElement>(".lesson-wrapper"),
  );
  const stick = useRef(true);
  const locked = !p.accepted || p.lock !== null;

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [p.messages]);

  // "Got it" enables the composer; it can't take focus while disabled
  useEffect(() => {
    if (p.accepted) composer.current?.focus();
  }, [p.accepted]);

  useEffect(() => {
    const box = composer.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight + 2, 140)}px`;
  }, [p.draft, p.open]);

  const send = () => {
    if (p.streaming || locked || !p.draft.trim()) return;
    p.onSend(p.draft);
    p.setDraft("");
  };

  return (
    <Dialog.Root
      open={p.open}
      modal={p.modal}
      onOpenChange={(open) => {
        if (open) return;
        studentClosed.current = true;
        p.onClose();
      }}
    >
      <Dialog.Portal container={p.modal ? undefined : wrapper}>
        <Dialog.Content
          ref={content}
          className={`${LESSON_PANEL.sheet} flex flex-col border-l border-slate-200 bg-white shadow-[-8px_0_16px_-8px_rgba(16,24,40,0.12)] dark:border-slate-500 dark:bg-slate-900`}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            if (!p.modal && p.openedByExplain && p.accepted && !p.lock) return;
            const target = !p.accepted
              ? gotIt.current
              : p.lock
                ? closeButton.current
                : composer.current;
            target?.focus();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (!studentClosed.current) return;
            studentClosed.current = false;
            document.getElementById("ask-mentor-button")?.focus();
          }}
          onInteractOutside={(e) => {
            if (!p.modal) e.preventDefault();
          }}
          // Non-modal Radix hears Esc anywhere: only act when focus is in the sheet
          onEscapeKeyDown={(e) => {
            if (
              !p.modal &&
              !content.current?.contains(document.activeElement)
            ) {
              e.preventDefault();
            }
          }}
        >
          <header className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-500">
            <span className="border-mentor-line bg-mentor-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
              <Sparkles className="text-mentor h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Dialog.Title className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Mentor
                </Dialog.Title>
                <span
                  aria-hidden="true"
                  className="bg-mentor dark:bg-mentor-line rounded-full px-1.5 text-[10px] leading-4 font-bold text-white"
                >
                  New
                </span>
              </div>
              <Dialog.Description className="truncate text-xs text-slate-600 dark:text-slate-300">
                Reading: {p.lessonName}
              </Dialog.Description>
            </div>
            <Dialog.Close
              ref={closeButton}
              aria-label="Close Mentor"
              className="rounded p-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </header>

          {/* aria-live, not role="status": the footer counts [role=status] as answered quizzes */}
          <div aria-live="polite" className="sr-only">
            <span key={p.announcement.n}>{p.announcement.text}</span>
          </div>

          <div
            className="flex-1 overflow-y-auto p-4"
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 24;
            }}
            ref={scroller}
          >
            {p.messages.length === 0 &&
              (p.accepted ? (
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => p.onSend(s)}
                      className="border-mentor-line text-mentor-text rounded-full border px-3 py-1 text-[12.5px] leading-[18px]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <MentorNotice onAccept={p.onAccept} buttonRef={gotIt} />
              ))}
            <ol aria-label="Conversation" className="space-y-3">
              {p.messages.map((m) =>
                m.role === "student" ? (
                  <StudentMessage key={m.id} message={m} />
                ) : (
                  <MentorMessage
                    key={m.id}
                    message={m}
                    lessonName={p.lessonName}
                    onShowSource={p.onShowSource}
                    onSave={p.onSave && (() => p.onSave!(m))}
                    onRetry={
                      m.error?.retry && !p.lock
                        ? () => p.onRetry(m.id)
                        : undefined
                    }
                  />
                ),
              )}
            </ol>
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-500">
            {p.lock && (
              <p
                role="alert"
                className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
              >
                {p.lock}
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={composer}
                rows={1}
                aria-label="Ask about this lesson"
                aria-describedby="mentor-fine-print"
                placeholder="Ask about this lesson..."
                maxLength={MENTOR_MESSAGE_MAX}
                disabled={locked}
                value={p.draft}
                onChange={(e) => p.setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing &&
                    // Safari's IME-commit Enter reports isComposing false
                    e.nativeEvent.keyCode !== 229
                  ) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="min-h-10 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
              />
              {/* One button, so focus stays on it as Send turns into Stop */}
              <button
                type="button"
                aria-disabled={!p.streaming && (locked || !p.draft.trim())}
                onClick={p.streaming ? p.onStop : send}
                className={`inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-white ${
                  p.streaming
                    ? "bg-slate-800"
                    : "bg-[#287697] aria-disabled:opacity-60"
                }`}
              >
                {p.streaming ? (
                  <Square className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Send className="h-3 w-3" aria-hidden="true" />
                )}
                {p.streaming ? "Stop" : "Send"}
              </button>
            </div>
            <p
              id="mentor-fine-print"
              className="mt-2 text-[11.5px] leading-[17px] text-slate-600 dark:text-slate-300"
            >
              Answers come from Odyssey&apos;s lessons, with sources. In
              check-ins Mentor gives hints, not answers.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
