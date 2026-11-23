import { cn } from "@/lib/utils";

export type BadgeSize = "sm" | "md" | "lg";

const RIBBON_SIZES: Record<BadgeSize, string> = {
  sm: "px-1.5 pb-2 pt-0.5 text-[9px]",
  md: "px-2.5 pb-3 pt-1 text-xs",
  lg: "px-4 pb-5 pt-1.5 text-base",
};

interface BadgeRibbonProps {
  title: string;
  size: BadgeSize;
}

/**
 * The blue banner hanging under the tile (84% of its width, top flush against
 * it) with a swallowtail bottom edge. Hidden from screen readers: the badge's
 * own label already carries the title.
 */
export function BadgeRibbon({ title, size }: BadgeRibbonProps) {
  return (
    <div
      aria-hidden="true"
      title={title}
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
      }}
      className={cn(
        "w-[84%] bg-blue-700 text-center leading-tight font-bold text-white",
        RIBBON_SIZES[size],
      )}
    >
      <span className="line-clamp-2 break-words">{title}</span>
    </div>
  );
}
