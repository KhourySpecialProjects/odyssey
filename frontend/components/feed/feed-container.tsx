"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { FeedClient } from "./feed-client";
import { FeedFilter } from "./feed-filter";
import { Announcement, AnnouncementType, AuthorizedUser } from "@/types";
import { BellRing, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FriendRequests } from "../friends/friend-requests";

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
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [requestsExpanded, setRequestsExpanded] = useState(false)

  return (
    <div className="flex flex-row">
      <div className="flex justify-center md:w-1/4 text-center h-full">
          <div className=" dark:bg-slate-800 bg-slate-100 rounded-md p-4 hidden md:block">
            <FriendRequests
              noProfile={true}
              friendsPerPage={4}
              authUser={authUser}
            ></FriendRequests>
          </div>
      </div>

        
      <div className="relative w-full sm:w-1/2 text-center text-xl font-bold justify-center items-center">
        <FeedClient
          selectedRoles={selectedRoles.map(
            (role) => role.toLowerCase() as AnnouncementType,
          )}
          announcements={announcements}
        />

        <button onClick={() => setFiltersExpanded(!filtersExpanded)} className="absolute top-0 right-0 translate-y-[-200%] block sm:hidden">
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        <button onClick={() => setRequestsExpanded(!requestsExpanded)} className="absolute top-0 left-0 translate-y-[-200%] block sm:hidden">
          <BellRing className="w-5 h-5" />
        </button>

        <div
          className={cn(
            "absolute px-5 pb-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-500 rounded-md",
            "z-10 overflow-y-hidden",
            filtersExpanded
              ? "right-0 top-0 visibility: visible "
              : "visibility: hidden",
          )}
        >
          <div className="flex justify-center items-center p-4 pb-0  border-slate-200 dark:border-slate-500">
            <button onClick={() => setFiltersExpanded(false)} className="bg-red-600 border border-white rounded-md p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <FeedFilter onFilterChange={setSelectedRoles} />
          </div>
        </div>

        <div
          className={cn(
            "absolute px-5 pb-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-500 rounded-md",
            "z-10 overflow-y-hidden",
            requestsExpanded
              ? "left-0 top-0 visibility: visible "
              : "visibility: hidden",
          )}
        >
          <div className="flex justify-center items-center p-4 pb-0  border-slate-200 dark:border-slate-500">
            <button onClick={() => setRequestsExpanded(false)} className="bg-red-600 border border-white rounded-md p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
          <div className=" dark:bg-slate-800 bg-slate-100 rounded-md p-4">
            <FriendRequests
              noProfile={true}
              friendsPerPage={5}
              authUser={authUser}
            ></FriendRequests>
          </div>
          </div>
        </div>

      </div>


      




      <div className={`w-1/4 text-center text-xl font-bold flex flex-col items-center justify-start dark:text-slate-300 hidden sm:flex`}>
        Filters
        <FeedFilter onFilterChange={setSelectedRoles} />
      </div>

    </div>
  );
}
