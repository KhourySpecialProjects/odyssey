"use client";

import Link from "next/link";
import { Voyage } from "@/types";
import { ArchiveButton } from "@/components/ui/archive-button";
import { toast } from "sonner";
import { archiveVoyage } from "@/lib/requests/voyage";

interface VoyageCardProps {
  voyage: Voyage;
  isArchived?: boolean;
  isCreator?: boolean;
  dashboardPage?: boolean;
}

export function VoyageCard({
  voyage,
  isArchived,
  isCreator,
  dashboardPage,
}: VoyageCardProps) {
  async function changeVisibility() {
    try {
      const result = await archiveVoyage(voyage.id, !isArchived);
      if (result.success) {
        toast.success(
          isArchived
            ? `${voyage.name} is now unarchived!`
            : `${voyage.name} is now archived!`,
        );
      } else {
        toast.error("Failed to update voyage visibility");
      }
    } catch (error) {
      toast.error("An error occurred while updating the voyage");
      console.error(error);
    }
  }

  const nodes = voyage.voyage_nodes ?? [];

  // Count playlist nodes vs claimed droplet nodes vs unclaimed placeholders
  const playlistNodeCount = nodes.filter(
    (n) => n.nodeType === "playlist",
  ).length;
  const claimedDropletCount = nodes.filter(
    (n) => n.nodeType === "droplet" && n.claimStatus !== "unclaimed",
  ).length;
  const unclaimedCount = nodes.filter(
    (n) => n.nodeType === "droplet" && n.claimStatus === "unclaimed",
  ).length;

  // Total droplets: droplets inside playlists + standalone droplet nodes (1 each)
  const dropletCount =
    nodes.reduce(
      (acc, n) =>
        acc +
        (n.nodeType === "playlist" ? n.playlist?.droplets?.length ?? 0 : 0),
      0,
    ) + claimedDropletCount;

  return (
    <Link
      href={`/v/${voyage.slug}`}
      className="group flex h-full w-full flex-col rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800"
    >
      <div className="flex flex-1 flex-col p-6">
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
          {playlistNodeCount > 0 && (
            <>
              {playlistNodeCount}{" "}
              {playlistNodeCount === 1 ? "playlist" : "playlists"}
            </>
          )}
          {playlistNodeCount > 0 && dropletCount > 0 && <> &middot; </>}
          {dropletCount > 0 && (
            <>
              {dropletCount} {dropletCount === 1 ? "droplet" : "droplets"}
            </>
          )}
          {unclaimedCount > 0 && <> &middot; {unclaimedCount} unclaimed</>}
          {playlistNodeCount === 0 &&
            dropletCount === 0 &&
            unclaimedCount === 0 && <>No content yet</>}
        </p>
      </div>
      {dashboardPage && isCreator && (
        <div className="mt-auto flex justify-end p-2">
          <ArchiveButton
            isArchived={isArchived ?? false}
            onToggle={changeVisibility}
          />
        </div>
      )}
    </Link>
  );
}
