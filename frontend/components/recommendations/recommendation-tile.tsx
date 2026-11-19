import {
  Compass,
  Route,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getTagColors } from "@/lib/tag-colors";
import { cn, stripHtmlTags, uppercaseFirstChar } from "@/lib/utils";
import type { Recommendation, RecommendationRule } from "@/types";

/** The Figma Reason Line icon for each rule. */
export const RULE_ICONS = {
  "next-in-voyage": Route,
  "next-in-playlist": Route,
  postrequisite: TrendingUp,
  "co-completion": Users,
  popular: Users,
  interest: Compass,
} satisfies Record<RecommendationRule, LucideIcon>;

const BADGE =
  "pointer-events-none rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium";

type RecommendationTileProps = {
  recommendation: Recommendation;
  /** "tile" is Recap's Recommendation Tile; "card" is the Activity strip's Rec Card. */
  variant?: "tile" | "card";
  /** Shows the Not interested ✕. Gets the droplet's numeric id. */
  onDismiss?: (dropletId: number) => void;
  className?: string;
};

export function RecommendationTile({
  recommendation: { droplet, reason, rule },
  variant = "tile",
  onDismiss,
  className,
}: RecommendationTileProps) {
  const isCard = variant === "card";
  const ReasonIcon = RULE_ICONS[rule];
  const description = stripHtmlTags(droplet.description ?? "");
  const lessonCount = droplet.lessons?.length ?? 0;
  const badges = [
    uppercaseFirstChar(droplet.focusArea),
    droplet.type && uppercaseFirstChar(droplet.type),
    ...(droplet.tags ?? []).map((tag) => tag.name),
  ].filter((label): label is string => !!label);

  const reasonRow = (
    <div className="flex items-start justify-between gap-2">
      <p className="flex min-w-0 flex-1 items-start gap-1.5 text-sm leading-5 font-medium text-[#287697] dark:text-[#4AABCF]">
        <ReasonIcon
          aria-hidden
          size={16}
          absoluteStrokeWidth
          className="shrink-0"
        />
        <span className="min-w-0 flex-1">{reason}</span>
      </p>
      {onDismiss && (
        <button
          type="button"
          aria-label={`Not interested in ${droplet.name}`}
          onClick={() => onDismiss(droplet.id)}
          className="relative z-10 shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:outline-none dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <X aria-hidden size={16} absoluteStrokeWidth />
        </button>
      )}
    </div>
  );

  const title = (
    <h3
      className={cn(
        "leading-[normal] font-black text-slate-950 dark:text-slate-300",
        isCard ? "text-xl" : "text-3xl",
      )}
    >
      {/* The link's ::after covers the tile, so the whole tile is clickable */}
      <Link
        href={`/d/${droplet.slug}`}
        className="after:absolute after:inset-0 focus-visible:outline-none"
      >
        {droplet.name}
      </Link>
    </h3>
  );

  const descriptionText = description && (
    <p
      className={cn(
        "leading-[normal] text-slate-700 dark:text-slate-300",
        isCard ? "line-clamp-3 text-sm" : "line-clamp-2 text-base",
      )}
    >
      {description}
    </p>
  );

  const badgeRow = (
    <div className={cn("flex flex-wrap gap-1.5", isCard && "mt-auto")}>
      {badges.map((label, i) => (
        <Badge
          key={`${i}-${label}`}
          variant="outline"
          className={cn(
            BADGE,
            getTagColors(label).bg,
            getTagColors(label).text,
          )}
        >
          {label}
        </Badge>
      ))}
    </div>
  );

  return (
    <article
      className={cn(
        "relative flex h-full flex-col gap-3 rounded-lg border border-[#d0d5dd] bg-[#fcfcfd] transition-colors hover:border-slate-300 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-sky-600 dark:border-slate-500 dark:bg-slate-800",
        isCard ? "min-h-[227px] p-4" : "p-6",
        className,
      )}
    >
      {isCard ? (
        <>
          <div className="flex flex-col gap-2">
            {reasonRow}
            {title}
            {descriptionText}
          </div>
          {badgeRow}
        </>
      ) : (
        <>
          {reasonRow}
          {badgeRow}
          {title}
          {descriptionText}
          {lessonCount > 0 && (
            <p className="text-sm leading-[normal] text-slate-500 dark:text-slate-400">
              {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
            </p>
          )}
        </>
      )}
    </article>
  );
}
