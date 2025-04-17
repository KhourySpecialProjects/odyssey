"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { FeedClient } from "./feed-client";
import { FeedFilter } from "./feed-filter";
import { Announcement, AnnouncementType, AuthorizedUser } from "@/types";
import { BellRing, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { FriendRequests } from "../friends/friend-requests";
import { createSystemAnnouncement } from "@/lib/requests/feed";

export function FeedContainer({
  announcements,
  authUser,
}: {
  announcements: Announcement[];
  authUser: AuthorizedUser;
}) {
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    Object.values(AnnouncementTypeTitle),
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  const [index, setIndex] = useState(0);

  const handleCreateAnnouncement = () => {
    const create = async () => {
      await createSystemAnnouncement(`announcement-${index}`, authUser)
      setIndex(index + 1)
    }
    create();
  }

  return (
    <div className="flex flex-row">
      
      <div className="flex justify-end relative md:w-1/4 text-center h-full">
        <div className="absolute top-[-12px] transition-colors border rounded-md border-slate-200 dark:border-slate-500 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 p-2 lg:p-4 hidden md:block min-w-[200px]">
          <div className="relative">
            <FriendRequests
              noProfile={true}
              friendsPerPage={5}
              authUser={authUser}
            ></FriendRequests>
            <button onClick={handleCreateAnnouncement}>create announcement</button>
          </div>
        </div>
      </div>

      <div className="relative w-full md:w-1/2 text-center text-xl font-bold justify-center items-center">
        <FeedClient
          selectedRoles={selectedRoles.map(
            (role) => role.toLowerCase() as AnnouncementType,
          )}
          authUser={authUser}
        />

        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className={`absolute top-0 right-0 translate-y-[-150%] block md:hidden ${filtersExpanded ? "bg-slate-300 rounded-md p-1 dark:bg-slate-600" : "p-1"}`}
        >
          <SlidersHorizontal className="w-6 h-6" />
        </button>

        <button
          onClick={() => setRequestsExpanded(!requestsExpanded)}
          className={`absolute top-0 left-0 translate-y-[-150%] block md:hidden ${requestsExpanded ? "bg-slate-300 rounded-md p-1 dark:bg-slate-600" : "p-1"}`}
        >
          <BellRing className="w-6 h-6" />
        </button>

        <div
          className={cn(
            "absolute px-5 pb-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-500 rounded-md",
            "z-10 overflow-y-hidden feed-mobile-filters",
            filtersExpanded
              ? "right-0 top-0 visibility: visible "
              : "visibility: hidden",
          )}
        >
          <div className="p-2">
            Filters
            <FeedFilter onFilterChange={setSelectedRoles} />
          </div>
        </div>

        <div
          className={cn(
            "absolute px-5 pb-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-500 rounded-md",
            "z-10 overflow-y-hidden feed-mobile-friend-requests",
            requestsExpanded
              ? "left-0 top-0 visibility: visible "
              : "visibility: hidden",
          )}
        >
          <div>
            <div className=" dark:bg-slate-800 bg-slate-50 rounded-md p-4">
              <FriendRequests
                noProfile={true}
                friendsPerPage={5}
                authUser={authUser}
              ></FriendRequests>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`relative w-1/4 text-center text-xl font-bold flex flex-row justify-start dark:text-slate-300 hidden md:flex`}
      >
        <div className="flex flex-col items-center absolute top-0 translate-y-[-20%]">
          Filters
          <FeedFilter onFilterChange={setSelectedRoles} />
        </div>
      </div>
    </div>
  );
}
