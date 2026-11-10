"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSparkles } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  getAiScoringRun,
  startAiScoring,
  type AiRunStatus,
} from "@/lib/requests/ai-scoring";
import {
  CEILING_STOP,
  START_FAILED,
  startErrorMessage,
  stoppedAtCeiling,
} from "@/lib/review-panel/ai-messages";
import type { AiScoringRunState } from "@/types";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;

const isActive = (state?: AiScoringRunState) =>
  state === "queued" || state === "running";

const lessonCount = (n: number) => `${n} lesson${n === 1 ? "" : "s"}`;

function describeRun(run: AiRunStatus): string {
  const n = run.failedLessons.length;
  // The ceiling skips the lessons left and the Overall Score.
  if (stoppedAtCeiling(run.error)) {
    return run.runState === "failed"
      ? `${CEILING_STOP} Nothing was scored.`
      : `${CEILING_STOP} Suggestions are ready, except for ${n ? `${lessonCount(n)} and ` : ""}the Overall Score.`;
  }
  switch (run.runState) {
    case "queued":
    case "running":
      return "Scoring every lesson. You can keep reviewing.";
    case "done":
      return "AI suggestions are ready to confirm.";
    case "partial":
      return n
        ? `AI suggestions are ready, except for ${lessonCount(n)} it couldn't score.`
        : "AI suggestions are ready, except for the Overall Score.";
    case "failed":
      return "Score with AI couldn't finish. Try again.";
  }
}

/**
 * Score with AI (ODY-814): starts a run on the reviewer's review and polls
 * until it ends, then refreshes so the suggestions load. The suggestions
 * themselves show in the Transcript panel (ODY-805).
 */
export function ScoreWithAiButton({ dropletId }: { dropletId: number }) {
  const router = useRouter();
  const [run, setRun] = useState<AiRunStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const active = isActive(run?.runState);

  // Picks up a run already going, say after a reload.
  useEffect(() => {
    let cancelled = false;
    getAiScoringRun(dropletId)
      .then((result) => {
        if (!cancelled && result.ok) setRun(result.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dropletId]);

  // One check at a time: the next is scheduled only after the last answers,
  // so a slow answer can't stack checks up or announce the end twice.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      const result = await getAiScoringRun(dropletId).catch(() => null);
      if (cancelled) return;
      if (result?.ok) {
        // No run at all: nothing left to wait for.
        if (!result.data) return;
        setRun(result.data);
        if (!isActive(result.data.runState)) {
          if (result.data.runState === "failed") {
            toast.error(describeRun(result.data));
          } else {
            toast.success(describeRun(result.data));
          }
          router.refresh();
          return;
        }
      } else if (result && result.error !== "failed") {
        // Refused (say the droplet left review): stop asking.
        return;
      }
      timer = setTimeout(check, POLL_MS);
    };
    timer = setTimeout(check, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, dropletId, router]);

  const start = async () => {
    setStarting(true);
    try {
      const result = await startAiScoring(dropletId);
      if (result.ok) {
        setRun(result.data);
        toast.success("Score with AI started. It takes a minute or two.");
      } else {
        toast.error(startErrorMessage(result));
      }
    } catch {
      toast.error(START_FAILED);
    } finally {
      setStarting(false);
    }
  };

  const label = active
    ? "Scoring with AI…"
    : starting
      ? "Starting…"
      : run
        ? "Score with AI again"
        : "Score with AI";

  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={start}
        disabled={starting || active}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-4 text-sm font-medium whitespace-nowrap text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <IconSparkles
          className={cn("h-4 w-4", active && "animate-pulse")}
          aria-hidden
        />
        {label}
      </button>
      <p
        role="status"
        aria-live="polite"
        className="text-xs text-slate-500 dark:text-slate-400"
      >
        {run ? describeRun(run) : ""}
      </p>
    </div>
  );
}
