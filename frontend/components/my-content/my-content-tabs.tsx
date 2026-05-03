"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Droplet, Playlist, Voyage } from "@/types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo } from "react";
import { MyContentToolbar } from "@/components/my-content/my-content-toolbar";
import { DropletsCreatorGrid } from "@/components/my-content/droplets-creator-grid";
import { PlaylistsCreatorGrid } from "@/components/my-content/playlists-creator-grid";
import { VoyagesCreatorGrid } from "@/components/my-content/voyages-creator-grid";
import { TAB_ALLOWED_PARAMS } from "@/components/my-content/sort-filter-options";

interface MyContentTabsProps {
  droplets: Droplet[];
  playlists: Playlist[];
  voyages: Voyage[];
  showPlaylists: boolean;
  showVoyages: boolean;
  currentUserId?: number;
}

const tabs = [
  { id: "droplets", label: "Droplets" },
  { id: "playlists", label: "Playlists" },
  { id: "voyages", label: "Voyages" },
] as const;

export function MyContentTabs({
  droplets,
  playlists,
  voyages,
  showPlaylists,
  showVoyages,
  currentUserId,
}: MyContentTabsProps) {
  const tabIds = tabs.map((t) => t.id);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab = tabIds.includes(rawTab as (typeof tabIds)[number])
    ? (rawTab as (typeof tabIds)[number])
    : "droplets";

  const visibleTabs = useMemo(
    () =>
      tabs.filter(
        (t) =>
          t.id === "droplets" ||
          (t.id === "playlists" && showPlaylists) ||
          (t.id === "voyages" && showVoyages),
      ),
    [showPlaylists, showVoyages],
  );

  useEffect(() => {
    const ids = visibleTabs.map((t) => t.id);
    if (!ids.includes(activeTab)) {
      const fallbackTab = (ids[0] ?? "droplets") as (typeof tabIds)[number];
      const allowed = TAB_ALLOWED_PARAMS[fallbackTab] ?? [];
      const params = new URLSearchParams();
      allowed.forEach((key) => {
        const value = searchParams.get(key);
        if (value !== null) params.set(key, value);
      });
      params.set("tab", fallbackTab);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [activeTab, visibleTabs, searchParams, pathname, router]);

  const handleTabChange = (newTab: (typeof tabIds)[number]) => {
    const allowed = TAB_ALLOWED_PARAMS[newTab] ?? [];
    const params = new URLSearchParams(searchParams.toString());

    // Remove params not applicable to the new tab
    Array.from(params.keys()).forEach((key) => {
      if (!allowed.includes(key)) {
        params.delete(key);
      }
    });

    params.set("tab", newTab);
    router.push(`${pathname}?${params.toString()}`);
  };

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
                onClick={() => handleTabChange(tab.id)}
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

      {/* Toolbar: search + filters + sort */}
      <div className="mt-4">
        <MyContentToolbar
          tab={activeTab as "droplets" | "playlists" | "voyages"}
        />
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "droplets" && (
          <DropletsCreatorGrid droplets={droplets} />
        )}

        {activeTab === "playlists" && showPlaylists && (
          <PlaylistsCreatorGrid playlists={playlists} />
        )}

        {activeTab === "voyages" && showVoyages && (
          <VoyagesCreatorGrid voyages={voyages} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
