"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AnnouncementType, Announcement, AuthorizedUser } from "@/types";
import { FeedBlock } from "./feed-block";
import { fetchAnnouncements } from "@/lib/requests/feed";

const ITEMS_PER_PAGE = 20;

export function FeedClient({
  selectedRoles,
  authUser,
}: {
  selectedRoles: AnnouncementType[];
  authUser: AuthorizedUser;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadMoreAnnouncements = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const newAnnouncements = await fetchAnnouncements(authUser, nextPage);

      if (newAnnouncements.length === 0) {
        setHasMore(false);
      } else {
        setAnnouncements((prev) => [...prev, ...newAnnouncements]);
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error("Error loading more announcements:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, isLoadingMore, hasMore, authUser, selectedRoles]);

  useEffect(() => {
    const grabAnnouncements = async () => {
      try {
        const firstPage = await fetchAnnouncements(authUser, 1);
        setAnnouncements(firstPage);
        setHasMore(firstPage.length === ITEMS_PER_PAGE);
      } catch (error) {
        console.error("Error loading initial announcements:", error);
      }
      setIsLoadingInitial(false);
    };
    grabAnnouncements();
  }, [authUser, selectedRoles]);

  //checks if the user is at the bottom of the announcements
  //and loads more if so
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingInitial) {
          loadMoreAnnouncements();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMoreAnnouncements, isLoadingInitial]);

  useEffect(() => {
    if (announcements.length !== 0) {
      loadMoreAnnouncements();
    }
  }, [selectedRoles]);

  const filteredAnnouncements = announcements.filter((post) =>
    selectedRoles.includes(post.type),
  );

  return (
    <section className="content mb-12 pb-8 pt-4 md:bg-slate-50 md:border md:border-slate-200 md:rounded-md md:dark:border-slate-500 md:dark:bg-slate-800">
      <div className="rounded-md">
        {isLoadingInitial ? (
          <div className="flex items-center justify-center py-8">
            <div
              data-testid="loading-spinner"
              className="h-6 w-6 animate-spin rounded-full border-4 border-slate-500 border-t-transparent"
              style={{ borderStyle: "dotted", borderTopStyle: "solid" }}
            ></div>
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          <>
            <ul className="grid grid-cols-1 gap-4 md:mx-auto md:w-[95%]">
              {filteredAnnouncements.map((post) => (
                <FeedBlock
                  key={post.id}
                  announcement={post}
                  authUser={authUser}
                />
              ))}
            </ul>
            {/* Loading indicator and observer target */}
            <div ref={observerTarget} className="py-4 text-center">
              {isLoadingMore && (
                <div
                  className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-slate-500 border-t-transparent"
                  style={{ borderStyle: "dotted", borderTopStyle: "solid" }}
                ></div>
              )}
              {!hasMore && filteredAnnouncements.length > 0 && (
                <p className="text-slate-500">No more announcements</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-center text-slate-500">No announcements found</p>
        )}
      </div>
    </section>
  );
}
