"use client";

import { useEffect, useState } from "react";
import { AnnouncementType, Announcement, AuthorizedUser } from "@/types";
import { FeedBlock } from "./feed-block";
import {
  fetchAnnouncements,
  markAnnouncementRead,
  markAnnouncementUnread,
} from "@/lib/requests/feed";
import { cn } from "@/lib/utils";

type Tab = "unread" | "read";

export function FeedClient({
  selectedRoles,
  authUser,
}: {
  selectedRoles: AnnouncementType[];
  authUser: AuthorizedUser;
}) {
  const [tab, setTab] = useState<Tab>("unread");
  const [currentPage, setCurrentPage] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRoles, tab]);

  useEffect(() => {
    if (selectedRoles.length === 0) {
      setAnnouncements([]);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      try {
        const { data, pagination } = await fetchAnnouncements(
          authUser,
          currentPage,
          selectedRoles,
          { archived: tab === "read" },
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
  }, [authUser, currentPage, selectedRoles, tab, refreshKey]);

  const handleMarkRead = async (id: number) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    const result = await markAnnouncementRead(id);
    if (!result.success) {
      setRefreshKey((k) => k + 1);
    }
  };

  const handleMarkUnread = async (id: number) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    const result = await markAnnouncementUnread(id);
    if (!result.success) {
      setRefreshKey((k) => k + 1);
    }
  };

  const tabButtonClass = (active: boolean) =>
    cn(
      "flex-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "border-[#2D7597] text-[#2D7597]"
        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          className={tabButtonClass(tab === "unread")}
          onClick={() => setTab("unread")}
        >
          Unread
        </button>
        <button
          type="button"
          className={tabButtonClass(tab === "read")}
          onClick={() => setTab("read")}
        >
          Read
        </button>
      </div>

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
          <ul className="grid grid-cols-1 gap-3 p-1">
            {announcements.map((post) => (
              <FeedBlock
                key={post.id}
                announcement={post}
                authUser={authUser}
                onMarkRead={tab === "unread" ? handleMarkRead : undefined}
                onMarkUnread={tab === "read" ? handleMarkUnread : undefined}
              />
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-slate-500">
            {tab === "unread"
              ? "No unread announcements"
              : "No read announcements"}
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
