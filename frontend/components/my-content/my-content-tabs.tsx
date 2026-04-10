"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { VoyageCard } from "@/components/voyages/voyage-card";
import { Droplet, Playlist, Voyage } from "@/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { IconDroplet, IconLayoutList, IconMap } from "@tabler/icons-react";

interface MyContentTabsProps {
  droplets: Droplet[];
  playlists: Playlist[];
  voyages: Voyage[];
  showPlaylists: boolean;
  showVoyages: boolean;
}

const tabs = [
  { id: "droplets", label: "My Droplets" },
  { id: "playlists", label: "My Playlists" },
  { id: "voyages", label: "My Voyages" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function MyContentTabs({
  droplets,
  playlists,
  voyages,
  showPlaylists,
  showVoyages,
}: MyContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("droplets");

  const visibleTabs = tabs.filter(
    (t) =>
      t.id === "droplets" ||
      (t.id === "playlists" && showPlaylists) ||
      (t.id === "voyages" && showVoyages),
  );

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {visibleTabs.map((tab) => {
            const count =
              tab.id === "droplets"
                ? droplets.length
                : tab.id === "playlists"
                  ? playlists.length
                  : voyages.length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-[#287697] bg-[#287697] text-white"
                    : "border-[#D0D5DD] text-[#667085] hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800",
                )}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {activeTab === "droplets" && (
          <Link href="/new/droplet">
            <Button
              after={<PlusIcon />}
              size="sm"
              className="bg-[#287697] text-white hover:bg-[#1f6080]"
            >
              New Droplet
            </Button>
          </Link>
        )}
        {activeTab === "playlists" && showPlaylists && (
          <Link href="/new/playlist">
            <Button
              after={<PlusIcon />}
              size="sm"
              className="bg-[#287697] text-white hover:bg-[#1f6080]"
            >
              New Playlist
            </Button>
          </Link>
        )}
        {activeTab === "voyages" && showVoyages && (
          <Link href="/new/voyage">
            <Button
              after={<PlusIcon />}
              size="sm"
              className="bg-[#287697] text-white hover:bg-[#1f6080]"
            >
              New Voyage
            </Button>
          </Link>
        )}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "droplets" &&
          (droplets.length === 0 ? (
            <EmptyState
              icon={
                <IconDroplet
                  className="h-7 w-7 text-[#475569] dark:text-slate-400"
                  stroke={1.5}
                />
              }
              title="No droplets yet"
              message="Create a new droplet to get started."
            />
          ) : (
            <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {droplets.map((droplet) => (
                <DropletTile key={droplet.id} droplet={droplet} />
              ))}
            </ul>
          ))}

        {activeTab === "playlists" &&
          showPlaylists &&
          (playlists.length === 0 ? (
            <EmptyState
              icon={
                <IconLayoutList
                  className="h-7 w-7 text-[#475569] dark:text-slate-400"
                  stroke={1.5}
                />
              }
              title="No playlists yet"
              message="Create a new playlist to get started."
            />
          ) : (
            <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  toDraft={true}
                />
              ))}
            </ul>
          ))}

        {activeTab === "voyages" &&
          showVoyages &&
          (voyages.length === 0 ? (
            <EmptyState
              icon={
                <IconMap
                  className="h-7 w-7 text-[#475569] dark:text-slate-400"
                  stroke={1.5}
                />
              }
              title="No voyages yet"
              message="Create a new voyage to get started."
            />
          ) : (
            <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {voyages.map((voyage) => (
                <li key={voyage.id}>
                  <VoyageCard voyage={voyage} />
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}
