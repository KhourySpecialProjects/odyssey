"use client";

import { useState } from "react";
import { Check, Copy, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { displayAnswer } from "@/lib/mentor/answer-text";
import type { MentorMsg, StudentMsg } from "@/lib/mentor/chat-types";
import type { Citation } from "@/lib/mentor/types";
import { MentorMarkdown } from "./mentor-markdown";

const toolClass =
  "inline-flex items-center gap-1 rounded text-xs text-slate-600 hover:text-slate-900 aria-disabled:opacity-60 dark:text-slate-300 dark:hover:text-white";

export function StudentMessage({ message }: { message: StudentMsg }) {
  return (
    <li className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#287697] px-3 py-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-white">
        <span className="sr-only">You: </span>
        {message.text}
      </p>
    </li>
  );
}

export function MentorMessage({
  message,
  lessonName,
  onShowSource,
  onSave,
  onRetry,
  onRate,
  rating,
}: {
  message: MentorMsg;
  lessonName: string;
  onShowSource: (citation: Citation) => void;
  /** Resolves true once saved; leave out where there is no notes bar */
  onSave?: () => Promise<boolean>;
  onRetry?: () => void;
  onRate?: (rating: "up" | "down") => void;
  rating?: "up" | "down";
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { status } = message;
  const streaming = status === "streaming";
  // A stopped answer can end mid-ref, so only a finished one keeps a trailing "["
  const shown = displayAnswer(message.text, { streaming: status !== "done" });
  const showTools = status === "done" || status === "stopped";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown.trim());
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };
  const save = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      setSaved(await onSave!());
    } catch {
      // Not saved: the button is usable again
    } finally {
      setSaving(false);
    }
  };

  return (
    <li
      aria-busy={streaming}
      className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
    >
      <p className="mb-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
        <Check className="h-3 w-3" aria-hidden="true" />
        Read {lessonName}
      </p>

      {shown && (
        <div className="prose prose-sm prose-p:my-2 prose-code:before:content-none prose-code:after:content-none dark:prose-invert max-w-none [overflow-wrap:anywhere] text-inherit">
          <MentorMarkdown>{shown}</MentorMarkdown>
        </div>
      )}
      {streaming && (
        <span aria-hidden="true" className="mt-1 inline-flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="bg-mentor h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      )}

      {status === "stopped" && (
        <p className="mt-2 text-xs text-slate-600 italic dark:text-slate-300">
          Stopped
        </p>
      )}
      {message.truncated && status === "done" && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          This answer was cut off at the length limit.
        </p>
      )}
      {message.error && (
        <div role="alert" className="mt-1 text-red-700 dark:text-red-300">
          <p>{message.error.message}</p>
          {message.error.retry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`${toolClass} mt-1 font-semibold underline`}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {status === "done" && message.citations.length > 0 && (
        <ul aria-label="Sources" className="mt-2 flex flex-wrap gap-2">
          {message.citations.map((c) => (
            <li key={c.ref}>
              <button
                type="button"
                aria-label={`Show in lesson: ${c.label}`}
                onClick={() => onShowSource(c)}
                className="rounded border border-[#287697] px-2 py-0.5 text-left text-xs text-[#287697] hover:bg-slate-50 dark:border-[#6cc0e0] dark:text-[#6cc0e0] dark:hover:bg-slate-800"
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showTools && (
        <div className="mt-2 flex items-center gap-3">
          {shown.trim() && (
            <button type="button" onClick={copy} className={toolClass}>
              <Copy className="h-3 w-3" aria-hidden="true" />
              Copy
            </button>
          )}
          {/* ODY-890: pass onRate to show 👍/👎 */}
          {status === "done" && onRate && (
            <>
              <button
                type="button"
                aria-label="Good answer"
                aria-pressed={rating === "up"}
                onClick={() => onRate("up")}
                className={toolClass}
              >
                👍
              </button>
              <button
                type="button"
                aria-label="Bad answer"
                aria-pressed={rating === "down"}
                onClick={() => onRate("down")}
                className={toolClass}
              >
                👎
              </button>
            </>
          )}
          {status === "done" && onSave && (
            <button
              type="button"
              onClick={save}
              aria-disabled={saving || saved}
              className={toolClass}
            >
              <NotebookPen className="h-3 w-3" aria-hidden="true" />
              {saved ? "Saved" : "Save to notes"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
