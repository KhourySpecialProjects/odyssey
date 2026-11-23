import { emblemToDataUrl } from "@/lib/badges/emblem";
import { cn } from "@/lib/utils";
import { BadgeRibbon, type BadgeSize } from "./badge-ribbon";

interface DropletBadgeProps {
  title: string;
  emblemSvg?: string;
  size: BadgeSize;
  className?: string;
}

const WIDTHS: Record<BadgeSize, string> = {
  sm: "w-20",
  md: "w-36",
  lg: "w-64",
};

const TILE_PADDING: Record<BadgeSize, string> = {
  sm: "p-2",
  md: "p-4",
  lg: "p-7",
};

function PlaceholderEmblem() {
  return (
    <svg
      data-testid="badge-placeholder"
      viewBox="0 0 24 24"
      className="h-1/2 w-1/2 text-slate-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11Z" />
    </svg>
  );
}

export function DropletBadge({
  title,
  emblemSvg,
  size,
  className,
}: DropletBadgeProps) {
  const src = emblemToDataUrl(emblemSvg);

  return (
    <div
      role="img"
      aria-label={`${title} badge`}
      data-size={size}
      className={cn(
        "inline-flex flex-col items-center",
        WIDTHS[size],
        className,
      )}
    >
      <div
        className={cn(
          "flex aspect-square w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900 shadow-md",
          "dark:border-slate-500 dark:bg-slate-950",
          TILE_PADDING[size],
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- sanitized data URL
          <img src={src} alt="" className="h-full w-full object-contain" />
        ) : (
          <PlaceholderEmblem />
        )}
      </div>
      <BadgeRibbon title={title} size={size} />
    </div>
  );
}
