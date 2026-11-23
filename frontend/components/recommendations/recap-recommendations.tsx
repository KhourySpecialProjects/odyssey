"use client";

import { useRecommendationPicks } from "@/components/recommendations/recommendation-picks";
import { RecommendationTile } from "@/components/recommendations/recommendation-tile";

const TILE_COUNT = 4;

/** Recap's "Extend Your Odyssey": 4 ranked tiles, leaving out the banner's pick. */
export function RecapRecommendations({
  bannerDropletId,
}: {
  bannerDropletId?: number;
}) {
  const { picks, dismiss } = useRecommendationPicks();
  const tiles = picks
    .filter((pick) => pick.droplet.id !== bannerDropletId)
    .slice(0, TILE_COUNT);

  if (tiles.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Extend Your Odyssey
      </h2>
      <p className="mt-1 text-slate-500 dark:text-slate-300">
        Picked from what you&apos;ve finished and the interests you chose.
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tiles.map((pick) => (
          <li key={pick.droplet.id}>
            <RecommendationTile recommendation={pick} onDismiss={dismiss} />
          </li>
        ))}
      </ul>
    </section>
  );
}
