"use client";

import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import { AuthorizedUser } from "@/types";
import { FriendRequestFeedBlock } from "../friends/friend-request-feed-block";
import { Button } from "../ui/button";
import Link from "next/link";
import { FeedLeftNav } from "./feed-left-nav";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";

export function FeedContainer({
  authUser,
  isFeedTab,
  children,
}: {
  authUser: AuthorizedUser;
  isFeedTab: boolean;
  children: React.ReactNode;
}) {
  const [headerHeight, setHeaderHeight] = useState(69);
  const leftRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      const header = document.querySelector<HTMLElement>(".sticky.top-0.z-50");
      if (header) setHeaderHeight(header.getBoundingClientRect().height);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const update = () => {
      const footer = document.querySelector<HTMLElement>("footer");
      if (!footer) return;
      const footerTop = footer.getBoundingClientRect().top;
      const bottom = Math.max(0, window.innerHeight - footerTop);
      if (leftRef.current) leftRef.current.style.bottom = `${bottom}px`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Get pending requests (filtered for blocked)
  const pendingRequests = (authUser.received_requests || []).filter(
    (req) =>
      !authUser.blocked?.some((b) => b.id === req.id) &&
      !authUser.was_blocked?.some((b) => b.id === req.id),
  );

  // Get friends from friendships
  const friendUsers = (authUser.friendships || [])
    .flatMap((f) => f.authorized_users || [])
    .filter((u) => u.id !== authUser.id);

  return (
    <>
      {/* Left sidebar — fixed */}
      <nav
        ref={leftRef}
        aria-label="Content navigation"
        className="fixed left-0 z-40 hidden w-[260px] border-r border-[#D0D5DD] bg-[#FCFCFD] md:block dark:border-slate-700 dark:bg-slate-900"
        style={{ top: headerHeight }}
      >
        <FeedLeftNav />
      </nav>

      {/* Content row: center + right column */}
      <div
        className="flex items-stretch md:ml-[260px]"
        style={{ "--header-h": `${headerHeight}px` } as React.CSSProperties}
      >
        {/* Center */}
        <div
          className="min-w-0 flex-1"
          style={
            isFeedTab
              ? {
                  height: `calc(100vh - ${headerHeight}px)`,
                  overflow: "hidden",
                }
              : { minHeight: `calc(100vh - ${headerHeight}px)` }
          }
        >
          {children}
        </div>

        {/* Right column — Friends sidebar */}
        <div className="hidden w-[280px] shrink-0 flex-col px-4 py-6 md:flex">
          <div className="flex-1 overflow-y-auto rounded-2xl border border-[#D0D5DD] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="p-5">
              <h2 className="mb-3 text-base font-semibold text-black dark:text-white">
                Friends
              </h2>
              <Button
                asChild
                size="sm"
                className="mb-4 w-full rounded-full bg-[#287697] hover:bg-[#1f6080]"
              >
                <Link href="/settings/friends">Manage Friends</Link>
              </Button>

              {/* Pending requests — only show if any exist */}
              {pendingRequests.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-[#667085] uppercase dark:text-slate-400">
                    Pending Requests ({pendingRequests.length})
                  </p>
                  <ul className="space-y-2">
                    {pendingRequests.slice(0, 3).map((request) => (
                      <FriendRequestFeedBlock
                        user={authUser}
                        request={request}
                        key={request.id}
                      />
                    ))}
                  </ul>
                  {pendingRequests.length > 3 && (
                    <Link
                      href="/settings/friends?tab=recieved_requests"
                      className="mt-2 block text-center text-xs text-[#287697] hover:underline"
                    >
                      View all {pendingRequests.length} requests
                    </Link>
                  )}
                  <div className="mt-3 border-t border-[#D0D5DD] dark:border-slate-700" />
                </div>
              )}

              {/* Friends list */}
              {friendUsers.length > 0 ? (
                <ul className="space-y-1">
                  {friendUsers.slice(0, 10).map((friend) => (
                    <li key={friend.id}>
                      <Link
                        href={`/prof/${friend.email?.replace("@northeastern.edu", "")}`}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Avatar variant="round" size="xs">
                          <AvatarImage src={friend.profilePhoto || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(
                              `${friend.firstName} ${friend.lastName}`,
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm text-[#344054] dark:text-slate-300">
                          {friend.firstName} {friend.lastName}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {friendUsers.length > 10 && (
                    <Link
                      href="/settings/friends"
                      className="mt-1 block text-center text-xs text-[#287697] hover:underline"
                    >
                      View all {friendUsers.length} friends
                    </Link>
                  )}
                </ul>
              ) : (
                <p className="text-center text-sm text-[#667085] dark:text-slate-400">
                  No friends yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
