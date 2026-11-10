"use client";

import { useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  iconsFor,
  panelMessage,
  revivesLeftText,
  shortDate,
} from "@/lib/streak-messages";
import { STREAK_ICONS, type Streak, type StreakRevive } from "@/lib/streaks";
import { cn } from "@/lib/utils";
import { useStreakStore } from "@/stores/streak-store";
import { StreakCalendar } from "./streak-calendar";
import { StreakIcon } from "./streak-icon";
import { StreakReviveOffer, useReviveOffer } from "./streak-revive-offer";

/**
 * The learner's streak in the site header (ODY-919): gold once a lesson is
 * finished today, grey until then, with a dot while yesterday can be revived
 * (ODY-920). Opens the streak and its calendar.
 */
export function StreakPill({ streak: fromServer }: { streak: Streak }) {
  const setStreak = useStreakStore((s) => s.setStreak);
  // Each server render (a reload, or an action that revalidates) brings the
  // latest; the lesson footer may set a newer one in between
  useEffect(() => setStreak(fromServer), [fromServer, setStreak]);
  const streak = useStreakStore((s) => s.streak) ?? fromServer;

  const { offer, dismiss } = useReviveOffer(streak);
  const lit = streak.litToday;
  const icon = iconsFor(streak.current).icon ?? STREAK_ICONS[0];
  const canRevive = offer
    ? `. Your ${offer.ended}-day streak can be revived`
    : "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${streak.current}-day streak${lit ? "" : ", not lit today"}${canRevive}. Show your activity calendar`}
          className={cn(
            "relative inline-flex h-8 shrink-0 items-center gap-1 rounded-full border pr-2.5 pl-1 text-sm font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-900",
            lit
              ? "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100 data-[state=open]:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/20 dark:data-[state=open]:bg-amber-400/20"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 data-[state=open]:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:data-[state=open]:bg-slate-700",
          )}
        >
          <StreakIcon icon={icon} size={24} unlit={!lit} />
          {streak.current}
          {offer && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        className="w-80 p-0"
      >
        <StreakPanel streak={streak} offer={offer} onDismiss={dismiss} />
      </PopoverContent>
    </Popover>
  );
}

function StreakPanel({
  streak,
  offer,
  onDismiss,
}: {
  streak: Streak;
  /** The revive on offer, unless dismissed */
  offer: StreakRevive | null;
  onDismiss: () => void;
}) {
  const { current, longest, litToday, startedOn, revivesLeft } = streak;
  const { icon, next } = iconsFor(current);
  const shown = icon ?? STREAK_ICONS[0];

  return (
    <div>
      <div className="flex items-center gap-3 p-4 pb-3">
        <StreakIcon icon={shown} size={64} unlit={!litToday} />
        <div className="min-w-0">
          <p className="text-2xl leading-none font-extrabold tabular-nums">
            {current}
            <span className="ms-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
              day streak
            </span>
          </p>
          {icon && <p className="mt-1.5 text-sm font-semibold">{icon.name}</p>}
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {startedOn ? `Since ${shortDate(startedOn)} · ` : ""}
            Longest {longest} {longest === 1 ? "day" : "days"}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {revivesLeftText(revivesLeft)}
          </p>
        </div>
      </div>

      {offer ? (
        <StreakReviveOffer
          streak={{ revive: offer, revivesLeft }}
          onDismiss={onDismiss}
        />
      ) : litToday ? (
        <div className="mx-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-400/10 dark:text-amber-100">
          {next && <StreakIcon icon={next} size={32} />}
          <p>{panelMessage(streak)}</p>
        </div>
      ) : (
        <div className="mx-4 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300">
          <b>
            {current > 0
              ? "Not lit yet today."
              : longest > 0
                ? "Streak ended."
                : "No streak yet."}
          </b>{" "}
          {panelMessage(streak)}
        </div>
      )}

      <div className="mt-3 border-t border-slate-200 p-4 pt-3 dark:border-slate-800">
        <StreakCalendar streak={streak} />
      </div>
    </div>
  );
}
