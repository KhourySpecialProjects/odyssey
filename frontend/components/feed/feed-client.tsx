"use client";

import { useEffect, useState } from "react";
import { AnnouncementType, Announcement, AuthorizedUser } from "@/types";
import { FeedBlock } from "./feed-block";
import { fetchAnnouncements } from "@/lib/requests/feed";

export function FeedClient({
  selectedRoles,
  authUser,
}: {
  selectedRoles: AnnouncementType[];
  authUser: AuthorizedUser;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRoles]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data, pagination } = await fetchAnnouncements(
          authUser,
          currentPage,
          selectedRoles,
        );
        setAnnouncements(data);
        setTotalPages(pagination.pageCount);
      } catch (error) {
        console.error("Error loading initial announcements:", error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [authUser, currentPage, selectedRoles]);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div
              data-testid="loading-spinner"
              className="h-6 w-6 animate-spin rounded-full border-4 border-slate-500 border-t-transparent"
              style={{ borderStyle: "dotted", borderTopStyle: "solid" }}
            />
          </div>
        ) : announcements.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3">
            {announcements.map((post) => (
              <FeedBlock
                key={post.id}
                announcement={post}
                authUser={authUser}
              />
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-slate-500">
            No announcements found
          </p>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4 border-t border-neutral-200 py-3 dark:border-neutral-700">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="text-sm font-medium text-[#344054] disabled:opacity-40 dark:text-slate-300"
          >
            ‹ Prev
          </button>
          <span className="text-sm text-[#667085] dark:text-slate-400">
            {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="text-sm font-medium text-[#2D7597] disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
