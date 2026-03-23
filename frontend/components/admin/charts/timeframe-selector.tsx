"use client";

import { useState } from "react";
import { IconCalendar } from "@tabler/icons-react";
import { type TimeframeOption } from "@/lib/chart-utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRange {
  start: string;
  end: string;
}

interface TimeframeSelectorProps {
  options: TimeframeOption[];
  value: number;
  onChange: (value: number) => void;
  onDateRange?: (range: DateRange) => void;
  activeDateRange?: DateRange | null;
}

export function TimeframeSelector({
  options,
  value,
  onChange,
  onDateRange,
  activeDateRange,
}: TimeframeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(activeDateRange?.start ?? "");
  const [end, setEnd] = useState(activeDateRange?.end ?? "");

  const rangeError = start && end && end < start ? "End date must be on or after start date." : null;

  function applyRange() {
    if (start && end && !rangeError && onDateRange) {
      onDateRange({ start, end });
      setOpen(false);
    }
  }

  const calendarActive = !!activeDateRange;

  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {options.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`rounded-md px-2 py-1 text-[12px] transition-colors ${
            value === tf.value && !calendarActive
              ? "bg-[#2D7597] text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          {tf.label}
        </button>
      ))}

      {onDateRange && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={`rounded-md px-2 py-1 text-[12px] transition-colors ${
                calendarActive
                  ? "bg-[#2D7597] text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <IconCalendar className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 text-[12px] text-slate-500">From</span>
                <input
                  type="date"
                  value={start}
                  max={end || undefined}
                  onChange={(e) => setStart(e.target.value)}
                  className="rounded border border-slate-200 px-2 py-1 text-[12px] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-[12px] text-slate-500">To</span>
                <input
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(e) => setEnd(e.target.value)}
                  className="rounded border border-slate-200 px-2 py-1 text-[12px] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              {rangeError && (
                <p className="text-[11px] text-red-500">{rangeError}</p>
              )}
              <button
                onClick={applyRange}
                disabled={!start || !end || !!rangeError}
                className="mt-1 rounded-md bg-[#2D7597] px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
