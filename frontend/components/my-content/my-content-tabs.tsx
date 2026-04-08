"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { Droplet, Playlist } from "@/types";
import { cn } from "@/lib/utils";

interface MyContentTabsProps {
  droplets: Droplet[];
  playlists: Playlist[];
  showPlaylists: boolean;
}

const tabs = [
  { id: "droplets", label: "My Droplets" },
  { id: "playlists", label: "My Playlists" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function MyContentTabs({
  droplets,
  playlists,
  showPlaylists,
}: MyContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("droplets");

  const visibleTabs = showPlaylists
    ? tabs
    : tabs.filter((t) => t.id === "droplets");

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {visibleTabs.map((tab) => (
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
              {tab.label}
            </button>
          ))}
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
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "droplets" &&
          (droplets.length === 0 ? (
            <p className="text-lg text-[#475569] dark:text-slate-400">
              No droplets found.
            </p>
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
            <p className="text-lg text-[#475569] dark:text-slate-400">
              No playlists found.
            </p>
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
      </div>
    </div>
  );
}
