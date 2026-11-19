import { RefreshCw } from "lucide-react";
import { RecommendationTile } from "@/components/recommendations/recommendation-tile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Recommendation } from "@/types";

const TILE_COUNT = 3;
const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-3";

type RecommendationStripProps = {
  recommendations: Recommendation[];
  isLoading?: boolean;
  /** Shows Refresh. */
  onRefresh?: () => void;
  /** Shows each card's Not interested ✕. */
  onDismiss?: (dropletId: number) => void;
};

export function RecommendationStrip({
  recommendations,
  isLoading = false,
  onRefresh,
  onDismiss,
}: RecommendationStripProps) {
  // Per the Figma, the strip is hidden when there is nothing to recommend
  if (!isLoading && recommendations.length === 0) return null;

  return (
    <section aria-busy={isLoading} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5 leading-[normal]">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Recommended for you
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Picked from the droplets you&apos;ve finished and the interests you
            chose.
          </p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-lg border-[#d0d5dd] text-[#344054] shadow-[0_1px_1px_rgba(16,24,40,0.05)] dark:border-slate-600 dark:text-slate-200"
          >
            <RefreshCw aria-hidden size={16} absoluteStrokeWidth />
            Refresh
          </Button>
        )}
      </div>

      {isLoading ? (
        <>
          <p className="sr-only">Loading recommendations</p>
          <ul aria-hidden className={GRID}>
            {Array.from({ length: TILE_COUNT }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-[227px] rounded-lg" />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className={GRID}>
          {recommendations.slice(0, TILE_COUNT).map((pick) => (
            <li key={pick.droplet.id}>
              <RecommendationTile
                recommendation={pick}
                variant="card"
                onDismiss={onDismiss}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
