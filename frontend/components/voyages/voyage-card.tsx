import Link from "next/link";
import { Voyage, VoyagePlaylist } from "@/types";

interface VoyageCardProps {
  voyage: Voyage;
}

export function VoyageCard({ voyage }: VoyageCardProps) {
  const playlistCount = voyage.voyage_playlists?.length ?? 0;
  const dropletCount =
    voyage.voyage_playlists?.reduce(
      (acc: number, vp: VoyagePlaylist) =>
        acc + (vp.playlist?.droplets?.length ?? 0),
      0,
    ) ?? 0;

  return (
    <Link
      href={`/v/${voyage.slug}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
    >
      <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-[#287697] dark:text-white dark:group-hover:text-[#4da8cc]">
        {voyage.name}
      </h3>
      {voyage.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
          {voyage.description}
        </p>
      )}
      <p className="mt-auto pt-3 text-xs text-slate-400 dark:text-slate-500">
        {playlistCount} {playlistCount === 1 ? "playlist" : "playlists"}{" "}
        &middot; {dropletCount} {dropletCount === 1 ? "droplet" : "droplets"}
      </p>
    </Link>
  );
}
