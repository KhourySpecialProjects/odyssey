import Link from "next/link";
import { Voyage } from "@/types";

interface VoyageCardProps {
  voyage: Voyage;
}

export function VoyageCard({ voyage }: VoyageCardProps) {
  const nodes = voyage.voyage_nodes ?? [];
  const playlistCount = nodes.filter((n) => n.isMainPath).length;
  const dropletCount = nodes.reduce(
    (acc, n) => acc + (n.playlist?.droplets?.length ?? 0),
    0,
  );

  return (
    <Link
      href={`/v/${voyage.slug}`}
      className="group inline-block h-full w-full rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800"
    >
      <div className="flex h-full flex-col p-6">
        {voyage.status === "draft" && (
          <span className="mb-1 inline-flex w-fit items-center rounded-[16px] bg-slate-200 px-[9px] py-[4px] text-xs leading-[18px] font-semibold text-slate-600 opacity-90 dark:bg-slate-600 dark:text-slate-300">
            Draft
          </span>
        )}
        <h3 className="line-clamp-2 text-3xl font-black text-slate-950 group-hover:text-[#287697] dark:text-slate-300 dark:group-hover:text-[#4da8cc]">
          {voyage.name}
        </h3>
        {voyage.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
            {voyage.description}
          </p>
        )}
        <p className="mt-auto pt-2 text-sm text-slate-500 dark:text-slate-400">
          {playlistCount} {playlistCount === 1 ? "playlist" : "playlists"}{" "}
          &middot; {dropletCount} {dropletCount === 1 ? "droplet" : "droplets"}
        </p>
      </div>
    </Link>
  );
}
