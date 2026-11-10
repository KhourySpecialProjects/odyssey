"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { displayAnswer } from "@/lib/mentor/answer-text";
import type { MentorHintState } from "@/hooks/use-mentor-hint";
import { MentorMarkdown } from "./mentor-markdown";

/**
 * Mentor's hint under a wrong quiz answer. Never `role="status"`: the lesson
 * footer counts those as answered quizzes. `children` shows once the hint is
 * done (ODY-890's rating slot).
 */
export function MentorHint({
  hint,
  onRetry,
  children,
}: {
  hint: MentorHintState;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  const { status } = hint;
  const streaming = status === "streaming";
  const shown = displayAnswer(hint.text, { streaming: status !== "done" });
  const box = useRef<HTMLElement>(null);

  // The Explain button leaves when the hint finishes: keep focus in the page
  useEffect(() => {
    if (status === "done" && document.activeElement === document.body) {
      box.current?.focus();
    }
  }, [status]);

  return (
    <section
      ref={box}
      tabIndex={-1}
      aria-label="Mentor hint"
      aria-busy={streaming}
      className="ph-no-capture border-mentor-line bg-mentor-soft text-mentor-text mt-4 rounded-lg border p-4 text-left text-sm focus:outline-none"
    >
      <p className="text-mentor-text mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <Sparkles className="text-mentor h-4 w-4" aria-hidden="true" />
        Mentor · a hint, not the answer
      </p>

      {shown && (
        <div className="prose prose-sm prose-p:my-2 prose-code:before:content-none prose-code:after:content-none dark:prose-invert max-w-none [overflow-wrap:anywhere] text-inherit">
          <MentorMarkdown>{shown}</MentorMarkdown>
        </div>
      )}
      {streaming && !shown && (
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

      {hint.truncated && status === "done" && (
        <p className="mt-2 text-xs">
          This hint was cut off at the length limit.
        </p>
      )}
      {hint.error && (
        <div role="alert" className="mt-1 text-red-700 dark:text-red-300">
          <p>{hint.error.message}</p>
          {hint.error.retry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 rounded text-xs font-semibold underline"
            >
              Retry hint
            </button>
          )}
        </div>
      )}

      {/* The final text, announced once */}
      <div aria-live="polite" className="sr-only">
        {status === "done" ? shown : ""}
      </div>

      {status === "done" && children}
    </section>
  );
}
