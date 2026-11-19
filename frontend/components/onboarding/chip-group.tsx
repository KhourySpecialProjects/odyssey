import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string | number> {
  label: string;
  options: ChipOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  muted?: boolean;
}

/** A labelled row of toggle chips. */
export function ChipGroup<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
  muted,
}: ChipGroupProps<T>) {
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
              "focus-visible:ring-onboarding inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
              on
                ? "border-onboarding bg-onboarding text-white"
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
