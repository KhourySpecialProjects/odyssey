"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMyStreak } from "@/lib/requests/streaks";
import {
  iconsFor,
  litMessage,
  pendingMessage,
  progressText,
  progressToNext,
} from "@/lib/streak-messages";
import { STREAK_ICONS } from "@/lib/streaks";
import { cn } from "@/lib/utils";
import { useStreakStore } from "@/stores/streak-store";
import { StreakIcon } from "./streak-icon";

const card =
  "flex w-full max-w-xl items-center gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(16,24,40,0.08)] dark:border-slate-700 dark:bg-slate-900";

/** True when the learner asked for less motion (false where matchMedia is missing, as in jsdom) */
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The day count ticking up from yesterday's number to today's, once the
 * treasure has popped in. Shows the final number at once with reduced motion.
 */
function useDayCount(from: number, to: number) {
  const [shown, setShown] = useState(() =>
    prefersReducedMotion() ? to : from,
  );
  useEffect(() => {
    if (shown === to) return;
    const timer = setTimeout(() => setShown(to), 450);
    return () => clearTimeout(timer);
  }, [shown, to]);
  return shown;
}

/** True one frame after mounting, so a bar can grow from empty (already true with reduced motion) */
function useAfterMount() {
  const [ready, setReady] = useState(prefersReducedMotion);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready;
}

/** Today's streak is lit: only the current treasure, a big day count and a short moment of delight */
function LitCard({ current }: { current: number }) {
  const { icon } = iconsFor(current);
  const { title, detail } = litMessage(current);
  const progress = progressToNext(current);
  const shown = useDayCount(current - 1, current);
  const barReady = useAfterMount();

  return (
    <div
      aria-live="polite"
      className={cn(
        card,
        "animate-in fade-in duration-500 motion-reduce:animate-none",
      )}
    >
      {icon && (
        <div className="animate-in zoom-in-50 fade-in shrink-0 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:animate-none">
          <StreakIcon icon={icon} size={64} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {/* The count animates, so only the final text is read out */}
        <p
          aria-hidden="true"
          className="text-3xl leading-none font-extrabold text-slate-900 dark:text-white"
        >
          Day{" "}
          <span
            key={shown}
            className="animate-in fade-in slide-in-from-bottom-2 inline-block duration-300 motion-reduce:animate-none"
          >
            {shown}
          </span>
        </p>
        <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
          {!title.startsWith("Day ") && (
            <span className="sr-only">Day {current}. </span>
          )}
          {title}
        </p>
        <p className="mt-0.5 text-slate-600 dark:text-slate-400">{detail}</p>
        {progress && (
          <div className="mt-3">
            <div
              aria-hidden="true"
              className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
            >
              <div
                className="h-full rounded-full bg-amber-400 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{
                  width: barReady
                    ? `${(progress.done / progress.span) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {progressText(progress)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Under a lesson's Previous / Next buttons (ODY-919). Until a lesson is
 * finished today it says what finishing one unlocks; then it celebrates
 * the day (ODY-950). `lessonCompleted` is this lesson, already finished.
 */
export function StreakLessonBanner({
  lessonCompleted,
}: {
  lessonCompleted: boolean;
}) {
  const streak = useStreakStore((s) => s.streak);
  if (!streak) return null;

  if (streak.litToday) {
    // Keyed so it mounts, and animates in, when the streak lights
    return (
      <div className="mb-12 flex justify-end">
        <LitCard key="lit" current={streak.current} />
      </div>
    );
  }

  const from = iconsFor(streak.current).icon;
  const to = iconsFor(streak.current + 1).icon ?? STREAK_ICONS[0];
  const { title, detail } = pendingMessage(streak, lessonCompleted);

  return (
    <div className="mb-12 flex justify-end">
      <div aria-live="polite" key="pending" className={card}>
        <div className="flex shrink-0 items-center gap-2">
          {from && (
            <>
              <StreakIcon icon={from} size={44} unlit />
              <ArrowRight
                className="h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
            </>
          )}
          <StreakIcon icon={to} size={56} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * After a lesson's first view: fetches the streak if today wasn't lit yet,
 * so the pill and banner light at once. `announce` adds a toast, for when
 * the learner has moved on and the banner is off screen. Never throws.
 */
export async function refreshStreakAfterLesson({
  announce,
}: {
  announce: boolean;
}) {
  const before = useStreakStore.getState().streak;
  if (!before || before.litToday) return;
  const result = await getMyStreak().catch(() => null);
  if (!result?.ok) return;
  useStreakStore.getState().setStreak(result.data);
  if (!announce || !result.data.litToday) return;
  const { current } = result.data;
  const { title, detail } = litMessage(current);
  const icon = iconsFor(current).icon;
  toast.success(title, {
    description: detail,
    icon: icon ? <StreakIcon icon={icon} size={20} /> : undefined,
  });
}
