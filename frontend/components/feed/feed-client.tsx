"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnnouncementType, Announcement, AuthorizedUser } from "@/types";
import { FeedBlock } from "./feed-block";
import { useStreakFeedCard } from "@/components/streaks/streak-feed-card";
import {
  type FeedPage,
  fetchAnnouncements,
  getUnreadAnnouncementCount,
  markAnnouncementRead,
  markAnnouncementUnread,
} from "@/lib/requests/feed";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FILTER_VALUES, toFeedRoles } from "./feed-filter-params";
import { useFeedUnreadStore } from "@/stores/feed-unread-store";

type Tab = "unread" | "read";

/** Page 1 of the Unread tab, rendered on the server for `roles`. */
export type InitialFeed = {
  roles: AnnouncementType[];
  page: FeedPage;
};

const sameRoles = (a: AnnouncementType[], b: AnnouncementType[]) =>
  a.length === b.length && a.every((role, i) => role === b[i]);

const DEFAULT_ROLES = toFeedRoles(FILTER_VALUES);

// Global broadcasts can't be marked read and aren't in the badge (ODY-943)
const isBroadcast = (a?: Announcement) =>
  a?.type === "system" && !a.authorized_user;

const paramsKey = (tab: Tab, page: number, roles: AnnouncementType[]) =>
  `${tab}|${page}|${roles.join(",")}`;

export function FeedClient({
  selectedRoles,
  authUser,
  initialFeed,
  pending = false,
}: {
  selectedRoles: AnnouncementType[];
  authUser: AuthorizedUser;
  /** Server-rendered first page; used instead of fetching on mount. */
  initialFeed?: InitialFeed;
  /** Suspense fallback while the initial feed streams in: don't fetch. */
  pending?: boolean;
}) {
  // Captured once: later server re-renders (after an action revalidates)
  // send a fresh initialFeed, but by then this component owns the list.
  const [seed] = useState(() =>
    initialFeed && sameRoles(initialFeed.roles, selectedRoles)
      ? initialFeed.page
      : undefined,
  );
  const [tab, setTab] = useState<Tab>("unread");
  const [currentPage, setCurrentPage] = useState(1);
  const [roles, setRoles] = useState(selectedRoles);
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    seed?.data ?? [],
  );
  const [isLoading, setIsLoading] = useState(
    pending || (!seed && selectedRoles.length > 0),
  );
  const [totalPages, setTotalPages] = useState(seed?.pagination.pageCount ?? 1);
  // A silent refresh keeps the current list on screen instead of a spinner.
  const [refresh, setRefresh] = useState({ key: 0, silent: false });
  const seedParams = seed ? paramsKey("unread", 1, selectedRoles) : null;
  const seededParams = useRef(seedParams);
  const lastParams = useRef(seedParams);
  // Bumped on every read/unread change so fetches started before it are
  // dropped instead of resurrecting the optimistically removed item.
  const mutations = useRef(0);
  // The learner's latest streak icon (ODY-919), atop the first page
  const streakCard = useStreakFeedCard(authUser.id, tab, currentPage === 1);

  // Compared by value so a re-created array doesn't refetch. Resetting the
  // page here (not in an effect) avoids fetching the old page for new filters.
  if (!sameRoles(roles, selectedRoles)) {
    setRoles(selectedRoles);
    setCurrentPage(1);
  }

  // Friend and kudos announcements are scoped to friends server-side, so a
  // changed friend list (e.g. a request accepted in the sidebar) refetches.
  const friendsKey = useMemo(
    () =>
      (authUser.friendships ?? [])
        .flatMap((f) => (f.authorized_users ?? []).map((u) => u.id))
        .filter((id) => id !== authUser.id)
        .sort((a, b) => a - b)
        .join(","),
    [authUser],
  );
  const [seenFriendsKey, setSeenFriendsKey] = useState(friendsKey);
  if (friendsKey !== seenFriendsKey) {
    setSeenFriendsKey(friendsKey);
    setRefresh((r) => ({ key: r.key + 1, silent: true }));
  }

  useEffect(() => {
    if (pending) return;
    const params = paramsKey(tab, currentPage, roles);
    if (params === seededParams.current && refresh.key === 0) return;
    seededParams.current = null;
    const silent = refresh.silent && params === lastParams.current;
    lastParams.current = params;

    if (roles.length === 0) {
      setAnnouncements([]);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }
    let ignore = false;
    const mutationsAtStart = mutations.current;
    const load = async () => {
      if (!silent) setIsLoading(true);
      try {
        const { data, pagination } = await fetchAnnouncements(
          currentPage,
          roles,
          { archived: tab === "read" },
        );
        if (ignore || mutations.current !== mutationsAtStart) return;
        const lastPage = Math.max(1, pagination.pageCount);
        if (currentPage > lastPage) {
          // This page emptied out, e.g. its last item was marked read.
          setCurrentPage(lastPage);
          return;
        }
        setAnnouncements(Array.isArray(data) ? data : []);
        setTotalPages(pagination.pageCount);
        setIsLoading(false);
      } catch (error) {
        if (ignore) return;
        console.error("Error loading initial announcements:", error);
        setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [pending, currentPage, roles, tab, refresh]);

  // The badge follows the filters (on either tab) while this is mounted. The
  // layout's count already covers the default filters before any change.
  useEffect(() => {
    if (pending) return;
    const { setFeedCount } = useFeedUnreadStore.getState();
    if (refresh.key === 0 && sameRoles(roles, DEFAULT_ROLES)) {
      setFeedCount(null);
      return;
    }
    if (roles.length === 0) {
      setFeedCount(0);
      return;
    }
    let ignore = false;
    const mutationsAtStart = mutations.current;
    getUnreadAnnouncementCount(roles)
      .then((count) => {
        // null = the count failed, so keep what the badge shows
        if (count !== null && !ignore && mutations.current === mutationsAtStart)
          setFeedCount(count);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [pending, roles, refresh]);
  useEffect(() => () => useFeedUnreadStore.getState().setFeedCount(null), []);

  const selectTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    setCurrentPage(1);
  };

  const updateReadState = async (
    id: number,
    update: (id: number) => Promise<{ success: boolean }>,
    errorMessage: string,
  ) => {
    mutations.current += 1;
    const delta = isBroadcast(announcements.find((a) => a.id === id))
      ? 0
      : tab === "unread"
        ? -1
        : 1;
    useFeedUnreadStore.getState().adjustFeedCount(delta);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    const result = await update(id);
    if (!result.success) {
      useFeedUnreadStore.getState().adjustFeedCount(-delta);
      toast.error(errorMessage);
    }
    // Re-sync with the server: on success this quietly backfills the page;
    // on failure it restores the item behind the spinner.
    setRefresh((r) => ({ key: r.key + 1, silent: result.success }));
  };

  const handleMarkRead = (id: number) =>
    updateReadState(id, markAnnouncementRead, "Failed to mark as read");

  const handleMarkUnread = (id: number) =>
    updateReadState(id, markAnnouncementUnread, "Failed to mark as unread");

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
          onClick={() => selectTab("unread")}
        >
          Unread
        </button>
        <button
          type="button"
          className={tabButtonClass(tab === "read")}
          onClick={() => selectTab("read")}
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
        ) : announcements.length > 0 || streakCard ? (
          <ul className="grid grid-cols-1 gap-3 p-1">
            {streakCard}
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
