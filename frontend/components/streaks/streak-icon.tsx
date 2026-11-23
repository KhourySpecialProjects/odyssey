import Image from "next/image";
import { streakIconSrc, type StreakIconInfo } from "@/lib/streaks";
import { cn } from "@/lib/utils";

/**
 * One of the 24 streak icons (the Streak Hoard spec). Each is a cached SVG
 * file rather than inline markup: the larger ones are 20–37 KB, too much to
 * repeat in every page's HTML. Next to a visible number it's decorative;
 * on its own, pass a `label` (see streakLabel).
 */
export function StreakIcon({
  icon,
  size,
  unlit = false,
  label,
  className,
}: {
  icon: StreakIconInfo;
  size: number;
  /** Grey and faded: no lesson finished today yet */
  unlit?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Image
      src={streakIconSrc(icon)}
      alt={label ?? ""}
      width={size}
      height={size}
      unoptimized
      className={cn(
        "shrink-0 transition-[filter,opacity] duration-700 motion-reduce:transition-none",
        unlit && "opacity-50 grayscale",
        className,
      )}
    />
  );
}
