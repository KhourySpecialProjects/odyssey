import { emblemToDataUrl } from "@/lib/badges/emblem";
import { cn } from "@/lib/utils";
import { BadgeFrame } from "./badge-frame";
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

function PlaceholderEmblem() {
  return (
    <svg
      data-testid="badge-placeholder"
      viewBox="0 0 24 24"
      className="h-3/5"
      fill="none"
      stroke="#9cc4d6"
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
        "[container-type:inline-size] relative aspect-[712/882]",
        WIDTHS[size],
        className,
      )}
    >
      <BadgeFrame />
      <div
        data-testid="badge-emblem-box"
        className="absolute top-[20.3%] left-[25%] flex h-[40.4%] w-[50%] items-center justify-center"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- sanitized data URL
          <img src={src} alt="" className="h-full w-full object-contain" />
        ) : (
          <PlaceholderEmblem />
        )}
      </div>
      <BadgeRibbon title={title} />
    </div>
  );
}
