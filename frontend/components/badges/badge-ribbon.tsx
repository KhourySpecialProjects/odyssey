import { cn } from "@/lib/utils";

export type BadgeSize = "sm" | "md" | "lg";

const RIBBON_SIZES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px] leading-tight",
  md: "px-3 py-1 text-xs leading-tight",
  lg: "px-4 py-1.5 text-base leading-snug",
};

interface BadgeRibbonProps {
  title: string;
  size: BadgeSize;
}

/** The grey ribbon under the tile. Hidden from screen readers: the badge's own label already carries the title. */
export function BadgeRibbon({ title, size }: BadgeRibbonProps) {
  return (
    <div
      aria-hidden="true"
      title={title}
      className={cn(
        "relative -mt-3 w-[110%] self-center rounded-md border border-slate-400 bg-slate-200 text-center font-semibold text-slate-800 shadow-md",
        "dark:border-slate-500 dark:bg-slate-600 dark:text-slate-50",
        RIBBON_SIZES[size],
      )}
    >
      <span className="line-clamp-2 break-words">{title}</span>
    </div>
  );
}
