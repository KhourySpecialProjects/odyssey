"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { FeedClient } from "./feed-client";
import { FeedFilter } from "./feed-filter";
import { AnnouncementType, AuthorizedUser } from "@/types";
import { BellRing, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { FriendRequests } from "../friends/friend-requests";

export function FeedContainer({ authUser }: { authUser: AuthorizedUser }) {
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    Object.values(AnnouncementTypeTitle),
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col items-end gap-4">
        <div className="sticky top-[165px] hidden space-y-4 md:block">
          <div className="min-w-[200px] rounded-md border border-slate-200 bg-slate-50 p-2 transition-colors hover:border-slate-300 lg:p-4 dark:border-slate-500 dark:bg-slate-800">
            <FriendRequests
              noProfile={true}
              friendsPerPage={3}
              authUser={authUser}
            ></FriendRequests>
          </div>
          <FeedFilter onFilterChange={setSelectedRoles} />
        </div>
      </div>

      <div className="relative w-full items-center justify-center text-center text-xl font-bold md:w-[65%]">
        <FeedClient
          selectedRoles={selectedRoles.map(
            (role) => role.toLowerCase() as AnnouncementType,
          )}
          authUser={authUser}
        />

        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className={`absolute top-0 right-0 block translate-y-[-150%] md:hidden ${filtersExpanded ? "rounded-md bg-slate-300 p-1 dark:bg-slate-600" : "p-1"}`}
        >
          <SlidersHorizontal className="h-6 w-6" />
        </button>

        <button
          onClick={() => setRequestsExpanded(!requestsExpanded)}
          className={`absolute top-0 left-0 block translate-y-[-150%] md:hidden ${requestsExpanded ? "rounded-md bg-slate-300 p-1 dark:bg-slate-600" : "p-1"}`}
        >
          <BellRing className="h-6 w-6" />
        </button>

        <div
          className={cn(
            "absolute rounded-md border border-slate-200 bg-slate-50 px-5 pb-5 dark:border-slate-500 dark:bg-slate-800",
            "feed-mobile-filters z-10 overflow-y-hidden",
            filtersExpanded
              ? "visibility: visible top-0 right-0"
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
            "absolute rounded-md border border-slate-200 bg-slate-50 px-5 pb-5 dark:border-slate-500 dark:bg-slate-800",
            "feed-mobile-friend-requests z-10 overflow-y-hidden",
            requestsExpanded
              ? "visibility: visible top-0 left-0"
              : "visibility: hidden",
          )}
        >
          <div>
            <div className="rounded-md bg-slate-50 p-4 px-2 dark:bg-slate-800">
              Friend Requests
              <FriendRequests
                noProfile={true}
                friendsPerPage={5}
                authUser={authUser}
              ></FriendRequests>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
