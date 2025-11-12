"use client";

import { useSearch } from "@/contexts/SearchContext";
import { DueDate, Playlist } from "@/types";
import { useMemo } from "react";
import { PlaylistCard } from "../playlists/playlist-card";

export function UserPlaylistsClient({
  customPlaylists,
  publicPlaylists,
  dueDates,
  isArchived,
  dashboardPage
}: {
  customPlaylists: Playlist[];
  publicPlaylists: Playlist[];
  dueDates: DueDate[];
  isArchived?: boolean;
  dashboardPage?: boolean;
}) {
  const { searchQuery } = useSearch();
  const filteredPublic = useMemo(() => {
    return publicPlaylists.filter((playlist) =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [publicPlaylists, searchQuery]);

  const filteredCustom = useMemo(() => {
    return customPlaylists.filter((playlist) =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [customPlaylists, searchQuery]);

  return (
    <div className="space-y-8 pb-4">
      {filteredCustom.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold dark:text-slate-300">
            {!isArchived && "Private Playlists"}
          </h2>
          <div className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustom.map((playlist: Playlist, index) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                data-testid={`playlist-card-${index}`}
                dashboardPage={dashboardPage}
                isArchived={isArchived}
              />
            ))}
          </div>
        </section>
      )}

      {filteredPublic.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Public Playlists</h2>
          <div className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPublic.map((playlist: Playlist) => (
              <div key={`group-${playlist.id}`} className="h-full">
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  dueDate={
                    dueDates?.find(
                      (dueDate) => dueDate.playlist?.id === playlist.id,
                    )?.dueDate || ""
                  }
                  dashboardPage={dashboardPage}
                  isArchived={isArchived}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
