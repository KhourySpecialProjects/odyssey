"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Playlist } from "@/types";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { IconLayoutList } from "@tabler/icons-react";
import {
  applySort,
  matchesSearch,
  playlistMatchesFilters,
  PlaylistFilterParams,
} from "@/components/my-content/apply-sort-filter";
import {
  CREATOR_DEFAULT_SORT,
  TAB_ALLOWED_PARAMS,
} from "@/components/my-content/sort-filter-options";

interface PlaylistsCreatorGridProps {
  playlists: Playlist[];
}

export function PlaylistsCreatorGrid({ playlists }: PlaylistsCreatorGridProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get("q") ?? "";
  const sortKey = searchParams.get("sort") ?? CREATOR_DEFAULT_SORT.slug;

  const filterParams: PlaylistFilterParams = {
    visibility:
      searchParams.get("visibility")?.split(",").filter(Boolean) ?? [],
    public: searchParams.get("public")?.split(",").filter(Boolean) ?? [],
  };

  const filtered = useMemo(() => {
    const sorted = applySort(playlists, sortKey);
    return sorted
      .filter((p) => matchesSearch(p, q))
      .filter((p) => playlistMatchesFilters(p, filterParams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists, sortKey, q, searchParams]);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    TAB_ALLOWED_PARAMS.playlists
      .filter((key) => key !== "tab")
      .forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (playlists.length === 0) {
    return (
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
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={
            <IconLayoutList
              className="h-7 w-7 text-[#475569] dark:text-slate-400"
              stroke={1.5}
            />
          }
          title="No matching playlists"
          message="No playlists match your current search or filters."
          className="w-full"
        />
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={playlist}
          toDraft={true}
          dashboardPage={true}
          isCreator={true}
          isArchived={playlist.isArchived ?? false}
        />
      ))}
    </ul>
  );
}
