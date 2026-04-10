"use client";

import { useSearch } from "@/contexts/SearchContext";
import { DueDate, Playlist } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { PlaylistCard } from "../playlists/playlist-card";
import { AdminPagination } from "@/components/admin/admin-pagination";

const ITEMS_PER_PAGE = 9;

export function UserPlaylistsClient({
  customPlaylists,
  publicPlaylists,
  dueDates,
  isArchived,
  dashboardPage,
}: {
  customPlaylists: Playlist[];
  publicPlaylists: Playlist[];
  dueDates: DueDate[];
  isArchived?: boolean;
  dashboardPage?: boolean;
}) {
  const { searchQuery } = useSearch();
  const [customPage, setCustomPage] = useState(1);
  const [publicPage, setPublicPage] = useState(1);

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

  useEffect(() => {
    setPublicPage(1);
  }, [publicPlaylists, searchQuery]);

  useEffect(() => {
    setCustomPage(1);
  }, [customPlaylists, searchQuery]);

  const customTotalPages = Math.ceil(filteredCustom.length / ITEMS_PER_PAGE);
  const paginatedCustom = filteredCustom.slice(
    (customPage - 1) * ITEMS_PER_PAGE,
    customPage * ITEMS_PER_PAGE,
  );

  const publicTotalPages = Math.ceil(filteredPublic.length / ITEMS_PER_PAGE);
  const paginatedPublic = filteredPublic.slice(
    (publicPage - 1) * ITEMS_PER_PAGE,
    publicPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-8 pb-4">
      {filteredCustom.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold dark:text-slate-300">
            {!isArchived && "Private Playlists"}
          </h2>
          <div className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedCustom.map((playlist: Playlist, index) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                data-testid={`playlist-card-${index}`}
                dashboardPage={dashboardPage}
                isArchived={isArchived}
              />
            ))}
          </div>
          <AdminPagination
            currentPage={customPage}
            totalPages={customTotalPages}
            onPageChange={setCustomPage}
            variant="standalone"
          />
        </section>
      )}

      {filteredPublic.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Public Playlists</h2>
          <div className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedPublic.map((playlist: Playlist) => (
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
            ))}
          </div>
          <AdminPagination
            currentPage={publicPage}
            totalPages={publicTotalPages}
            onPageChange={setPublicPage}
            variant="standalone"
          />
        </section>
      )}
    </div>
  );
}
