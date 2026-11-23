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
  sm: "w-24",
  md: "w-40",
  lg: "w-72",
};

function PlaceholderEmblem() {
  return (
    <svg
      data-testid="badge-placeholder"
      viewBox="0 0 24 24"
      className="h-3/5 text-white/60"
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
      <div className="relative aspect-[5/2] w-full overflow-hidden rounded-[2px] bg-black dark:ring-1 dark:ring-white/15">
        <div className="pointer-events-none absolute inset-[4%] border border-white/80" />
        <div className="absolute inset-[4%] flex items-center justify-center p-[2%]">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- sanitized data URL
            <img src={src} alt="" className="h-full w-full object-contain" />
          ) : (
            <PlaceholderEmblem />
          )}
        </div>
      </div>
      <BadgeRibbon title={title} size={size} />
    </div>
  );
}
