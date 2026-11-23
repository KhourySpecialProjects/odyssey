"use client";

import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getMyStreak } from "@/lib/requests/streaks";
import { iconsFor, litMessage, pendingMessage } from "@/lib/streak-messages";
import { STREAK_ICONS } from "@/lib/streaks";
import { useStreakStore } from "@/stores/streak-store";
import { StreakIcon } from "./streak-icon";

/**
 * Under a lesson's Previous / Next buttons (ODY-919). Until a lesson is
 * finished today it says what finishing one unlocks; then it shows the
 * treasure that earned. `lessonCompleted` is this lesson, already finished.
 */
export function StreakLessonBanner({
  lessonCompleted,
}: {
  lessonCompleted: boolean;
}) {
  const streak = useStreakStore((s) => s.streak);
  if (!streak) return null;

  const lit = streak.litToday;
  // Grey is yesterday's treasure, in colour the one today earns (or earned)
  const from = iconsFor(lit ? streak.current - 1 : streak.current).icon;
  const to =
    iconsFor(lit ? streak.current : streak.current + 1).icon ?? STREAK_ICONS[0];
  const { title, detail } = lit
    ? litMessage(streak.current)
    : pendingMessage(streak, lessonCompleted);

  return (
    <div className="mb-12 flex justify-end">
      <div
        // Remounts when the streak lights, so the lit card animates in
        key={String(lit)}
        aria-live="polite"
        className="animate-in fade-in zoom-in-95 flex w-full max-w-xl items-center gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgba(16,24,40,0.08)] duration-500 motion-reduce:animate-none dark:border-slate-700 dark:bg-slate-900"
      >
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
