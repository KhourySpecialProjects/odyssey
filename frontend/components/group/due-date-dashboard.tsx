"use client";

import { Group } from "@/types";
import { useRouter } from "next/navigation";
import { DropletDueDateBlock } from "./droplet-due-date-block";
import { ContentSelector } from "./content-selector";
import { PlaylistDueDateBlock } from "./playlist-due-date-block";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";

interface GroupDueDateDashboardProps {
  existingGroup: Group;
  searchParams?: { [key: string]: string | string[] | undefined };
}
// TODO: Technical debt abounds.  There are some minor differences between
// several different user types that have caused some headaches.
// Currently, just trying to get the functionality done.  Will refactor
// later.
export function GroupDueDateDashboard({
  existingGroup,
  searchParams,
}: GroupDueDateDashboardProps) {
  const router = useRouter();
  const tab = searchParams?.tab || "droplets";

  const droplets = existingGroup?.droplets || [];
  const playlists = existingGroup?.playlists || [];

  const handleCancel = () => {
    router.push(
      existingGroup ? `/g/${existingGroup.slug}` : "/g/dashboard?tab=creator",
    );
  };

  return (
    <div className="w-full">
      <div className="w-full flex flex-row justify-center mt-2">
        <Button
          onClick={handleCancel}
          variant="outline"
          className="dark:bg-slate-800 dark:border dark:border-slate-500 dark:text-white dark:hover:bg-white dark:hover:text-slate-800"
        >
          <ArrowLeft size={18} /> Back to my group
        </Button>
      </div>

      <ContentSelector />
      <div className="mt-6 space-y-1">
        {tab === "droplets" ? (
          <>
            {droplets
              .sort((a, b) => {
                if (b.name > a.name) return -1;
                if (b.name < a.name) return 1;
                return 0;
              })
              .map((droplet) => (
                <DropletDueDateBlock
                  key={droplet.id}
                  existingGroup={existingGroup}
                  currentDroplet={droplet}
                />
              ))}
          </>
        ) : tab === "playlists" ? (
          <>
            {playlists.map((playlist) => (
              <PlaylistDueDateBlock
                key={playlist.id}
                existingGroup={existingGroup}
                currentPlaylist={playlist}
              />
            ))}
          </>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
