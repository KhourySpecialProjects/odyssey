"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { AnnouncementType, Announcement, AuthorizedUser } from "@/types";
import { FeedBlock } from "./feed-block";
import { Button } from "../ui/button";
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
      if (announcements.length === 0) {
        try {
          const firstPage = await fetchAnnouncements(authUser, 1);
          setAnnouncements(firstPage);
          setHasMore(firstPage.length === ITEMS_PER_PAGE);
        } catch (error) {
          console.error("Error loading initial announcements:", error);
        }
        setIsLoadingInitial(false);
      }
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
    <section className="pb-8 content">
      <div className="rounded-md">
        {isLoadingInitial ? (
          <div className="flex justify-center items-center py-8">
            <div
              data-testid="loading-spinner"
              className="w-6 h-6 border-4 border-slate-500 border-t-transparent rounded-full animate-spin"
              style={{ borderStyle: "dotted", borderTopStyle: "solid" }}
            ></div>
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          <>
            <ul className="md:w-[80%] md:mx-auto grid gap-4 grid-cols-1">
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
                  className="w-6 h-6 mx-auto border-4 border-slate-500 border-t-transparent rounded-full animate-spin"
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
