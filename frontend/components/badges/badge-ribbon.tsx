export type BadgeSize = "sm" | "md" | "lg";

interface BadgeRibbonProps {
  title: string;
}

/**
 * The title laid over the ribbon drawn by BadgeFrame. Its font size is in `cqw`
 * (the badge wrapper is a size container), so every badge size looks the same.
 * Hidden from screen readers: the badge's own label already carries the title.
 */
export function BadgeRibbon({ title }: BadgeRibbonProps) {
  return (
    <div
      aria-hidden="true"
      title={title}
      className="absolute top-[69.9%] left-[10.07%] flex h-[20.7%] w-[79.9%] items-center justify-center text-center text-[length:5.6cqw] leading-tight font-bold text-white"
    >
      <span className="line-clamp-2 break-words">{title}</span>
    </div>
  );
}
