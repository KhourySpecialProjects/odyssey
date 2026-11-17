"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  Clock,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { feedColorFor } from "@/lib/feed-colors";
import { dueChipText } from "@/lib/reminder-progress";
import type { SnoozeChoice } from "@/lib/reminder-rules";
import type { Announcement } from "@/types";

const markButtonClass =
  "rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200";

export type RemindLaterChoice = SnoozeChoice | "stop";

const remindChoices: { choice: RemindLaterChoice; label: string }[] = [
  { choice: "tomorrow", label: "Tomorrow" },
  { choice: "in_3_days", label: "In 3 days" },
  { choice: "next_week", label: "Next week" },
];

export function ReminderCard({
  announcement,
  timestamp,
  onMarkRead,
  onMarkUnread,
  onRemindLater,
}: {
  announcement: Announcement;
  timestamp: string;
  onMarkRead?: (id: number) => void;
  onMarkUnread?: (id: number) => void;
  onRemindLater?: (id: number, choice: RemindLaterChoice) => void;
}) {
  const { droplet, reminder } = announcement;
  const colors = feedColorFor("reminder");

  // Computed after mount so it uses the browser's time zone, not the server's.
  const [chip, setChip] = useState<string | null>(null);
  useEffect(() => {
    const dueDate = reminder?.dueDate;
    if (!dueDate) {
      setChip(null);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    // Recompute at each local midnight so an open feed doesn't keep a stale chip
    const update = () => {
      const now = DateTime.local();
      setChip(dueChipText(dueDate, reminder?.dueGroupName, now));
      const nextDay = now.plus({ days: 1 }).startOf("day");
      timer = setTimeout(update, nextDay.toMillis() - now.toMillis());
    };
    update();
    return () => clearTimeout(timer);
  }, [reminder?.dueDate, reminder?.dueGroupName]);

  // Escape returns focus to the trigger; a selection leaves it to FeedClient.
  const selected = useRef(false);
  const choose = (choice: RemindLaterChoice) => {
    selected.current = true;
    onRemindLater?.(announcement.id, choice);
  };

  const progress = reminder?.progress;
  const next = reminder?.nextLesson;
  const base = `/d/${droplet?.slug}`;
  const startsAtOne = !reminder?.started && !!next;

  return (
    <li
      data-announcement-id={announcement.id}
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border p-4",
        colors.card,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 font-semibold",
          colors.accent,
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Bell size={18} />
          <span className="text-sm">Reminder</span>
          <span className="text-sm opacity-60">·</span>
          <span className="truncate text-sm font-medium">{droplet?.name}</span>
          {chip && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-xs font-semibold text-[#B91C1C] dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <Calendar size={12} />
              {chip}
            </span>
          )}
        </div>
        {onMarkRead && (
          <button
            type="button"
            onClick={() => onMarkRead(announcement.id)}
            aria-label="Mark as read"
            title="Mark as read"
            className={markButtonClass}
          >
            <Check size={16} />
          </button>
        )}
        {onMarkUnread && (
          <button
            type="button"
            onClick={() => onMarkUnread(announcement.id)}
            aria-label="Mark as unread"
            title="Mark as unread"
            className={markButtonClass}
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      <p className="text-base font-medium text-[#0F172A] dark:text-slate-100">
        {reminder?.headline ?? announcement.content}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          {progress && (
            <div className="flex items-center gap-3">
              <div
                role="progressbar"
                aria-label="Lessons viewed"
                aria-valuenow={progress.viewed}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                className="h-2 w-56 max-w-full overflow-hidden rounded bg-[#E2E8F0] dark:bg-slate-700"
              >
                <div
                  className="h-full rounded bg-[#2D7597] dark:bg-[#7CC0E0]"
                  style={{
                    width: `${(progress.viewed / progress.total) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-[#475569] dark:text-slate-400">
                {progress.viewed} of {progress.total} lessons
              </span>
            </div>
          )}
          {next && (
            <div className="flex gap-1 text-sm">
              <span className="text-[#475569] dark:text-slate-400">
                Up next:
              </span>
              <span className="font-medium text-[#0F172A] dark:text-slate-100">
                {next.name}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {onRemindLater && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  before={<Clock size={16} />}
                  className="h-9 gap-2 rounded-lg border-[#D0D5DD] px-[14px] text-[#344054] shadow-[0_1px_1px_rgba(16,24,40,0.05)] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  Remind me later
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onCloseAutoFocus={(e) => {
                  if (selected.current) e.preventDefault();
                  selected.current = false;
                }}
              >
                <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
                  Remind me
                </DropdownMenuLabel>
                {remindChoices.map(({ choice, label }) => (
                  <DropdownMenuItem
                    key={choice}
                    onSelect={() => choose(choice)}
                    className="cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => choose("stop")}
                  className="cursor-pointer gap-2 text-slate-700 dark:text-slate-200"
                >
                  <EyeOff size={14} />
                  Stop reminding me
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            asChild
            after={<ArrowRight size={16} />}
            className="h-9 gap-2 rounded-lg border border-[#2D7597] bg-[#2D7597] px-[14px] text-white shadow-[0_1px_1px_rgba(16,24,40,0.05)] hover:bg-[#2D7597]/90 dark:bg-[#2D7597] dark:text-white dark:hover:bg-[#2D7597]/90"
          >
            <Link href={next ? `${base}/${next.slug}` : base}>
              {startsAtOne ? "Start lesson 1" : "Resume"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="text-left text-sm font-semibold text-[#334155] dark:text-slate-300">
        {timestamp}
      </div>
    </li>
  );
}
