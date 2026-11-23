import { RULE_ICONS } from "@/components/recommendations/recommendation-tile";
import { StartDropletButton } from "@/components/recommendations/start-droplet-button";
import type { Recommendation } from "@/types";

/** Under the Recap title: the next droplet in the student's voyage or playlist. */
export function VoyageBanner({
  recommendation: { droplet, reason, rule },
}: {
  recommendation: Recommendation;
}) {
  const Icon = RULE_ICONS[rule];

  return (
    <section
      aria-label="Up next"
      className="flex flex-wrap items-center gap-4 rounded-lg border border-[#2d7597]/30 bg-[#2d7597]/5 p-4 dark:border-[#2d7597]/60 dark:bg-[#2d7597]/15"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#2d7597]/10 text-[#287697] dark:bg-[#2d7597]/30 dark:text-[#4AABCF]">
        <Icon aria-hidden size={20} absoluteStrokeWidth />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[normal]">
        <p className="text-sm font-medium text-[#287697] dark:text-[#4AABCF]">
          {reason}
        </p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {droplet.name}
        </p>
      </div>
      <StartDropletButton droplet={droplet} />
    </section>
  );
}
