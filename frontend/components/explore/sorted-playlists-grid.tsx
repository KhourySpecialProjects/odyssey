"use client";

import { DueDate, Playlist } from "@/types";
import { PlaylistCard } from "../playlists/playlist-card";
import { useSearch } from "@/contexts/SearchContext";
import { useEffect, useMemo, useState } from "react";
import { AdminPagination } from "@/components/admin/admin-pagination";

const ITEMS_PER_PAGE = 9;

export function SortedPlaylistsGrid({
  playlistsWithCompletion,
  dueDates,
}: {
  playlistsWithCompletion: Playlist[];
  dueDates?: DueDate[];
}) {
  const { searchQuery } = useSearch();
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPlaylists = useMemo(() => {
    return playlistsWithCompletion.filter((playlist) =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [playlistsWithCompletion, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [playlistsWithCompletion, searchQuery]);

  const totalPages = Math.ceil(filteredPlaylists.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPlaylists = filteredPlaylists.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedPlaylists.map((playlist) => (
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
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        variant="standalone"
      />
    </section>
  );
}
