export type BadgeSize = "sm" | "md" | "lg";

interface BadgeRibbonProps {
  title: string;
}

/**
 * The title laid over the ribbon tail drawn by BadgeFrame. Its font size is in
 * `cqw` (the badge wrapper is a size container), so every badge size looks the
 * same. Hidden from screen readers: the badge's own label already carries the title.
 */
export function BadgeRibbon({ title }: BadgeRibbonProps) {
  return (
    <div
      aria-hidden="true"
      title={title}
      className="absolute top-[81.6%] left-[18.8%] flex h-[12.2%] w-[62.4%] items-center justify-center text-center text-[length:5.4cqw] leading-tight font-bold text-white"
    >
      <span className="line-clamp-2 break-words">{title}</span>
    </div>
  );
}
