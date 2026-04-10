"use client";

import { useState, useLayoutEffect, useEffect, useRef } from "react";
import { AuthorizedUser } from "@/types";
import { FriendRequests } from "../friends/friend-requests";
import { Button } from "../ui/button";
import Link from "next/link";
import { FeedLeftNav } from "./feed-left-nav";

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
      <div className="flex items-start md:ml-[260px]">
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

        {/* Right column — normal flow */}
        <div className="hidden w-[280px] shrink-0 p-4 pt-6 md:block">
          <div
            className="overflow-hidden rounded-2xl border border-[#D0D5DD] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
            style={{ minHeight: `calc(100vh - ${headerHeight + 48}px)` }}
          >
            <div className="p-5">
              <h2 className="mb-3 text-base font-semibold text-black dark:text-white">
                Friend Requests
              </h2>
              <Button
                asChild
                className="mb-4 w-full rounded-full bg-[#287697] hover:bg-[#1f6080]"
              >
                <Link
                  href="/settings/friends"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Manage Friends
                </Link>
              </Button>
              <FriendRequests
                noProfile={true}
                friendsPerPage={5}
                authUser={authUser}
                showTitle={false}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
