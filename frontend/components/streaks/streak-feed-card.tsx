"use client";

import { Check, Coins, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { iconsFor, unlockedMessage } from "@/lib/streak-messages";
import { addDays, type Streak, type StreakIconInfo } from "@/lib/streaks";
import { useStreakStore } from "@/stores/streak-store";
import { StreakIcon } from "./streak-icon";

// The activity feed's streak card (ODY-919): the icon the learner's current
// streak unlocked last. It isn't an announcement, so whether it's been read
// is kept in this browser, keyed by the unlock: the next one shows as unread.

const markButtonClass =
  "rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200";

type Unlock = {
  icon: StreakIconInfo;
  /** The learner's date the icon unlocked */
  date: string;
  /** Unique to this unlock in this streak */
  key: string;
};

/** The icon the current streak unlocked last, and when; null with no streak */
export function latestUnlock(
  streak: Pick<Streak, "current" | "startedOn">,
): Unlock | null {
  const { icon } = iconsFor(streak.current);
  if (!icon || !streak.startedOn) return null;
  return {
    icon,
    date: addDays(streak.startedOn, icon.day - 1),
    key: `${streak.startedOn}:${icon.day}`,
  };
}

const storageKey = (userId: number) => `streak-card-read:${userId}`;

function loadRead(userId: number): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function saveRead(userId: number, key: string | null) {
  try {
    if (key) localStorage.setItem(storageKey(userId), key);
    else localStorage.removeItem(storageKey(userId));
  } catch {
    // Storage is blocked: it reads as unread again next visit
  }
}

/**
 * The streak card for the feed's `tab`, or null when it belongs on the
 * other tab, there's no streak, or `shown` is false (a later page).
 */
export function useStreakFeedCard(
  userId: number,
  tab: "unread" | "read",
  shown = true,
): ReactNode {
  const streak = useStreakStore((s) => s.streak);
  const [readKey, setReadKey] = useState<string | null>(null);
  useEffect(() => setReadKey(loadRead(userId)), [userId]);

  const unlock = streak && latestUnlock(streak);
  if (!shown || !unlock) return null;
  const isRead = readKey === unlock.key;
  if ((tab === "read") !== isRead) return null;

  const mark = (key: string | null) => {
    saveRead(userId, key);
    setReadKey(key);
  };
  return (
    <StreakFeedCard
      unlock={unlock}
      onMarkRead={isRead ? undefined : () => mark(unlock.key)}
      onMarkUnread={isRead ? () => mark(null) : undefined}
    />
  );
}

/** Styled like FeedBlock, in gold */
function StreakFeedCard({
  unlock: { icon, date },
  onMarkRead,
  onMarkUnread,
}: {
  unlock: Unlock;
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
}) {
  return (
    <li className="relative flex flex-col gap-3 rounded-[8px] border border-[#ECAC30] bg-[#ECAC30]/5 p-4 dark:border-amber-500/60 dark:bg-amber-400/10">
      <div className="flex items-center justify-between gap-2 font-semibold text-[#8A4F0C] dark:text-amber-300">
        <div className="flex items-center gap-2">
          <Coins size={18} aria-hidden="true" />
          <span className="text-sm">Streak</span>
          <span className="text-sm opacity-60" aria-hidden="true">
            ·
          </span>
          <span className="truncate text-sm font-medium">
            {icon.day}-day streak
          </span>
        </div>
        {onMarkRead && (
          <button
            type="button"
            onClick={onMarkRead}
            aria-label="Mark as read"
            title="Mark as read"
            className={markButtonClass}
          >
            <Check size={16} aria-hidden="true" />
          </button>
        )}
        {onMarkUnread && (
          <button
            type="button"
            onClick={onMarkUnread}
            aria-label="Mark as unread"
            title="Mark as unread"
            className={markButtonClass}
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="-mt-1 flex items-center gap-4">
        <div className="min-w-0 flex-1 text-left">
          <p className="font-medium text-slate-900 dark:text-slate-200">
            You reached a {icon.day}-day streak and unlocked {icon.name}!
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {unlockedMessage(icon.day)}
          </p>
        </div>
        <StreakIcon icon={icon} size={56} />
      </div>
      <div className="text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
        {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
          timeZone: "UTC",
        })}
      </div>
    </li>
  );
}
