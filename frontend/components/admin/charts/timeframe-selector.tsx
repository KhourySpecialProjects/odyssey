"use client";

import { type TimeframeOption } from "@/lib/chart-utils";

interface TimeframeSelectorProps {
  options: TimeframeOption[];
  value: number;
  onChange: (value: number) => void;
}

export function TimeframeSelector({
  options,
  value,
  onChange,
}: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {options.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`rounded-md px-2 py-1 text-[12px] transition-colors ${
            value === tf.value
              ? "bg-[#2D7597] text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
