"use client";

import { DueDate, Playlist } from "@/types";
import { PlaylistCard } from "../playlists/playlist-card";
import { useSearch } from "@/contexts/SearchContext";
import { useMemo } from "react";

export function SortedPlaylistsGrid({
  playlistsWithCompletion,
  dueDates,
}: {
  playlistsWithCompletion: Playlist[];
  dueDates?: DueDate[];
}) {
  const { searchQuery } = useSearch();

  const filteredDroplets = useMemo(() => {
    return playlistsWithCompletion.filter((playlist) =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [playlistsWithCompletion, searchQuery]);

  return (
    <section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDroplets.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            dueDate={
              dueDates?.find((dueDate) => dueDate.playlist?.id === playlist.id)
                ?.dueDate || ""
            }
          />
        ))}
      </div>
    </section>
  );
}
