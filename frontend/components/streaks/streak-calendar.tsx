"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  monthLabel,
  monthOf,
  shiftMonth,
  weeksOf,
} from "@/lib/streak-calendar";
import type { Streak } from "@/lib/streaks";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  ["S", "Sunday"],
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
];

const monthButton =
  "rounded-md p-1 text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:outline-none disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300";

/**
 * The learner's activity a month at a time, back to their first active
 * month. Only the current streak is gold; streaks that ended are grey.
 */
export function StreakCalendar({
  streak,
}: {
  streak: Pick<Streak, "today" | "days" | "startedOn">;
}) {
  const { today, startedOn } = streak;
  const thisMonth = monthOf(today);
  const [month, setMonth] = useState(thisMonth);
  const lessonsOn = useMemo(
    () => new Map(streak.days.map((d) => [d.date, d.lessons])),
    [streak.days],
  );
  const firstMonth = streak.days.length
    ? monthOf(streak.days[0].date)
    : thisMonth;

  const label = monthLabel(month);
  const weeks = weeksOf(month);
  const isActive = (date: string | null | undefined) =>
    !!date && date <= today && lessonsOn.has(date);
  const activeDays = weeks.flat().filter(isActive).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold" aria-live="polite">
          {label}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            disabled={month <= firstMonth}
            aria-label="Previous month"
            className={monthButton}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= thisMonth}
            aria-label="Next month"
            className={monthButton}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <table className="w-full table-fixed border-collapse text-center text-xs">
        <caption className="sr-only">Your activity in {label}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map(([short, full], i) => (
              <th
                key={i}
                scope="col"
                abbr={full}
                className="pb-1 font-medium text-slate-500 dark:text-slate-400"
              >
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((date, i) => {
                if (!date) return <td key={i} className="h-9" />;
                const lessons = lessonsOn.get(date) ?? 0;
                const active = isActive(date);
                const live = active && !!startedOn && date >= startedOn;
                const isToday = date === today;
                const future = date > today;
                // Back-to-back active days in a row join into one capsule
                const joinsPrev = active && isActive(week[i - 1]);
                const joinsNext = active && isActive(week[i + 1]);
                const detail = active
                  ? `${lessons} ${lessons === 1 ? "lesson" : "lessons"} completed`
                  : future
                    ? ""
                    : "No activity";
                return (
                  <td key={i} className="relative h-9 p-0">
                    {active && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-y-[3px]",
                          live
                            ? "bg-[#FBEDC4] dark:bg-amber-400/20"
                            : "bg-slate-200/70 dark:bg-slate-700/60",
                          joinsPrev
                            ? "left-0"
                            : "left-[calc(50%-15px)] rounded-l-full",
                          joinsNext
                            ? "right-0"
                            : "right-[calc(50%-15px)] rounded-r-full",
                        )}
                      />
                    )}
                    <span
                      title={detail || undefined}
                      className={cn(
                        "relative mx-auto flex h-[30px] w-[30px] items-center justify-center rounded-full tabular-nums",
                        live
                          ? "font-semibold text-[#7A4A0E] dark:text-amber-100"
                          : active
                            ? "font-medium text-slate-600 dark:text-slate-300"
                            : "text-slate-500 dark:text-slate-400",
                        isToday &&
                          (active
                            ? "bg-[#ECAC30] text-[#3A1005] dark:text-[#3A1005]"
                            : "ring-2 ring-sky-700 ring-inset dark:ring-sky-500"),
                      )}
                    >
                      {Number(date.slice(8))}
                      <span className="sr-only">
                        {isToday ? ", today" : ""}
                        {detail ? `, ${detail}` : ""}
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          <b className="font-semibold text-slate-900 dark:text-slate-100">
            {activeDays}
          </b>{" "}
          active {activeDays === 1 ? "day" : "days"}
        </span>
        <span className="flex items-center gap-3" aria-hidden="true">
          <span className="flex items-center gap-1">
            <i className="h-2.5 w-4 rounded-full bg-[#FBEDC4] dark:bg-amber-400/20" />
            Streak
          </span>
          <span className="flex items-center gap-1">
            <i className="h-2.5 w-4 rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
            Past
          </span>
          <span className="flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ECAC30]" />
            Today
          </span>
        </span>
      </div>
    </div>
  );
}
