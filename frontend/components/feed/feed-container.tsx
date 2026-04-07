"use client";

import { useState, useLayoutEffect, useEffect, useRef } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { FeedClient } from "./feed-client";
import { AnnouncementType, AuthorizedUser } from "@/types";
import { cn } from "@/lib/utils";
import { FriendRequests } from "../friends/friend-requests";
import { Button } from "../ui/button";
import Link from "next/link";
import { Users } from "lucide-react";

const FILTER_OPTIONS: { value: AnnouncementTypeTitle; label: string }[] = [
  { value: AnnouncementTypeTitle.System, label: "System" },
  { value: AnnouncementTypeTitle.Droplet, label: "Droplet" },
  { value: AnnouncementTypeTitle.Playlist, label: "Playlist" },
  { value: AnnouncementTypeTitle.Group, label: "Group" },
  { value: AnnouncementTypeTitle.Friend, label: "Friend" },
  { value: AnnouncementTypeTitle.Kudos, label: "Kudos" },
];

export function FeedContainer({ authUser }: { authUser: AuthorizedUser }) {
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    Object.values(AnnouncementTypeTitle),
  );
  const [headerHeight, setHeaderHeight] = useState(69);
  const sidebarRef = useRef<HTMLElement>(null);

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
    const updateBottom = () => {
      if (!sidebarRef.current) return;
      const footer = document.querySelector<HTMLElement>("footer");
      if (!footer) return;
      const footerTop = footer.getBoundingClientRect().top;
      const bottom = Math.max(0, window.innerHeight - footerTop);
      sidebarRef.current.style.bottom = `${bottom}px`;
    };
    updateBottom();
    window.addEventListener("scroll", updateBottom, { passive: true });
    window.addEventListener("resize", updateBottom);
    return () => {
      window.removeEventListener("scroll", updateBottom);
      window.removeEventListener("resize", updateBottom);
    };
  }, []);

  const toggleRole = (role: AnnouncementTypeTitle) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  return (
    <>
      {/* Sticky sidebar — same style as AdminNav, stops at footer */}
      <nav
        ref={sidebarRef}
        aria-label="Friend requests"
        className="fixed left-0 z-40 hidden w-64 flex-col border-r border-[#D0D5DD] bg-[#FCFCFD] md:flex dark:border-slate-700 dark:bg-slate-900"
        style={{ top: headerHeight }}
      >
        <div className="flex h-full flex-col overflow-hidden px-6 pt-10 pb-6">
          <h2 className="mb-3 shrink-0 text-xl font-bold text-black dark:text-white">
            Friend Requests
          </h2>
          <Link
            href="/settings/friends"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 block shrink-0"
          >
            <Button className="w-full justify-start rounded-full bg-[#287697] hover:bg-[#1f6080]">
              <Users className="mr-2 h-4 w-4" />
              Manage Friends
            </Button>
          </Link>
          <div className="min-h-0 flex-1">
            <FriendRequests
              noProfile={true}
              friendsPerPage={5}
              authUser={{
                ...authUser,
                received_requests: [
                  {
                    id: 101,
                    firstName: "Jordan",
                    lastName: "Chen",
                    email: "jchen@northeastern.edu",
                    profilePhoto: "",
                    roles: [],
                    blocked: [],
                    was_blocked: [],
                    friendships: [],
                    sent_requests: [],
                    received_requests: [],
                    isEnabled: true,
                    isPublic: true,
                    firstTime: false,
                    bio: "",
                    linkedin: "",
                    github: "",
                    website: "",
                    groups: [],
                    timeZone: null,
                  },
                  {
                    id: 102,
                    firstName: "Maya",
                    lastName: "Patel",
                    email: "mpatel@northeastern.edu",
                    profilePhoto: "",
                    roles: [],
                    blocked: [],
                    was_blocked: [],
                    friendships: [],
                    sent_requests: [],
                    received_requests: [],
                    isEnabled: true,
                    isPublic: true,
                    firstTime: false,
                    bio: "",
                    linkedin: "",
                    github: "",
                    website: "",
                    groups: [],
                    timeZone: null,
                  },
                  {
                    id: 103,
                    firstName: "Liam",
                    lastName: "Torres",
                    email: "ltorres@northeastern.edu",
                    profilePhoto: "",
                    roles: [],
                    blocked: [],
                    was_blocked: [],
                    friendships: [],
                    sent_requests: [],
                    received_requests: [],
                    isEnabled: true,
                    isPublic: true,
                    firstTime: false,
                    bio: "",
                    linkedin: "",
                    github: "",
                    website: "",
                    groups: [],
                    timeZone: null,
                  },
                ],
              }}
              showTitle={false}
            />
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-69px)] flex-col px-6 py-4 md:py-8 md:pr-[80px] md:pl-[calc(16rem+80px)]">
        {/* Greeting */}
        <div className="mb-3 shrink-0">
          <h1 className="text-4xl font-semibold text-black dark:text-white">
            Hi, {authUser.firstName || "there"}!
          </h1>
          <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
            Check out what&apos;s happening right now.
          </p>
        </div>

        {/* Filter pills */}
        <div className="mt-2 mb-2 flex shrink-0 flex-wrap gap-2 md:mt-3 md:mb-4">
          {FILTER_OPTIONS.map((option) => {
            const isActive = selectedRoles.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => toggleRole(option.value)}
                className={cn(
                  "rounded-full border-[1.5px] px-3 py-0.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-[#287697] text-[#287697] hover:bg-[#287697]/10"
                    : "border-[#D0D5DD] text-neutral-500 hover:bg-neutral-100 dark:border-slate-700 dark:hover:bg-slate-800",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Feed */}
        <div className="min-h-0 flex-1">
          <FeedClient
            selectedRoles={selectedRoles.map(
              (role) => role.toLowerCase() as AnnouncementType,
            )}
            authUser={authUser}
          />
        </div>
      </div>
    </>
  );
}
