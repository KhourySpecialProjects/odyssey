"use client";

import { useSearch } from "@/contexts/SearchContext";
import { DueDate, Playlist } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { PlaylistCard } from "../playlists/playlist-card";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { useSortKey } from "@/hooks/use-sort-key";
import { sortPlaylists } from "@/lib/playlist-sort";

const ITEMS_PER_PAGE = 9;

export function UserPlaylistsClient({
  customPlaylists,
  publicPlaylists,
  dueDates,
  isArchived,
  dashboardPage,
  sortKey,
}: {
  customPlaylists: Playlist[];
  publicPlaylists: Playlist[];
  dueDates: DueDate[];
  isArchived?: boolean;
  dashboardPage?: boolean;
  sortKey?: string;
}) {
  const { searchQuery } = useSearch();
  const activeSortKey = useSortKey(sortKey);
  const [customPage, setCustomPage] = useState(1);
  const [publicPage, setPublicPage] = useState(1);

  const filteredPublic = useMemo(() => {
    return sortPlaylists(publicPlaylists, activeSortKey).filter((playlist) =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [publicPlaylists, activeSortKey, searchQuery]);

  const filteredCustom = useMemo(() => {
    return sortPlaylists(customPlaylists, activeSortKey).filter((playlist) =>
      playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [customPlaylists, activeSortKey, searchQuery]);

  useEffect(() => {
    setPublicPage(1);
  }, [publicPlaylists, searchQuery, activeSortKey]);

  useEffect(() => {
    setCustomPage(1);
  }, [customPlaylists, searchQuery, activeSortKey]);

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
                isCreator={true}
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
                isCreator={true}
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
