import Link from "next/link";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { Voyage, VoyagePlaylist } from "@/types";

interface VoyagesGridProps {
  voyages: Voyage[];
}

function getTotalDropletCount(voyage: Voyage): number {
  return (
    voyage.voyage_playlists?.reduce((acc: number, vp: VoyagePlaylist) => {
      return acc + (vp.playlist?.droplets?.length ?? 0);
    }, 0) ?? 0
  );
}

export function VoyagesGrid({ voyages }: VoyagesGridProps) {
  if (!voyages || voyages.length === 0) {
    return (
      <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
        <MessageHeader subtitle="No Results" title="No Voyages Available" />
        <MessageDescription>
          There are no published voyages available at this time.
        </MessageDescription>
      </Message>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {voyages.map((voyage) => {
        const islandCount = voyage.voyage_playlists?.length ?? 0;
        const dropletCount = getTotalDropletCount(voyage);

        return (
          <Link
            key={voyage.id}
            href={`/v/${voyage.slug}`}
            className="group block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
          >
            {/* Mini island visual hint */}
            <div className="mb-4 flex gap-1.5">
              {Array.from({ length: Math.min(islandCount, 5) }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 w-3 rounded-full border border-[#2D6A4F] bg-[#D8F3DC]"
                />
              ))}
              {islandCount > 5 && (
                <div className="flex h-3 items-center text-[10px] text-slate-400">
                  +{islandCount - 5}
                </div>
              )}
            </div>

            <h3 className="mb-2 text-lg font-semibold text-slate-900 group-hover:text-green-800 dark:text-slate-100 dark:group-hover:text-green-400">
              {voyage.name}
            </h3>

            {voyage.description && (
              <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                {voyage.description}
              </p>
            )}

            <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {islandCount} {islandCount === 1 ? "island" : "islands"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {dropletCount} {dropletCount === 1 ? "droplet" : "droplets"}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
