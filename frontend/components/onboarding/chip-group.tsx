import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
}

interface ChipGroupProps {
  label: string;
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  muted?: boolean;
}

/** A labelled row of toggle chips. */
export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  muted,
}: ChipGroupProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#2f7a9a] focus-visible:ring-offset-1 focus-visible:outline-none",
              on
                ? "border-[#2f7a9a] bg-[#2f7a9a] text-white"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
              muted && !on && "opacity-60",
            )}
          >
            {on && <Check className="h-3 w-3" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
