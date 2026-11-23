import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface OptionCardProps {
  title: string;
  hint: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
  role?: "radio";
}

/** A full-width choice card; a radio when `role` is set, else a toggle. */
export function OptionCard({
  title,
  hint,
  icon,
  selected,
  onClick,
  role,
}: OptionCardProps) {
  const a11y = role
    ? { role, "aria-checked": selected }
    : { "aria-pressed": selected };
  return (
    <button
      type="button"
      {...a11y}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-onboarding flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        selected
          ? "border-onboarding bg-onboarding/5"
          : "border-slate-200 hover:bg-slate-50 dark:border-slate-700",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex h-4 w-4 items-center justify-center border border-slate-300",
          role ? "rounded-full" : "rounded-sm",
          selected && "border-onboarding bg-onboarding text-white",
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}
