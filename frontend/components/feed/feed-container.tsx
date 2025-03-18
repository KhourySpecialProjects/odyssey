"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { FeedClient } from "./feed-client";
import { FeedFilter } from "./feed-filter";
import { Announcement, AnnouncementType, AuthorizedUser } from "@/types";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeedContainer({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    Object.values(AnnouncementTypeTitle),
  );
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-row">
      <div className="relative w-full sm:w-2/3 text-center text-xl font-bold justify-center items-center">
        <FeedClient
          selectedRoles={selectedRoles.map(
            (role) => role.toLowerCase() as AnnouncementType,
          )}
          announcements={announcements}
        />

        <button onClick={() => setExpanded(true)} className="absolute top-0 right-0 translate-y-[-200%] block sm:hidden">
          <SlidersHorizontal className="w-5 h-5" />
        </button>

      </div>
      <div className={`w-1/3 text-center text-xl font-bold flex flex-col items-center justify-center dark:text-slate-300 hidden sm:flex`}>
        Filters
        <FeedFilter onFilterChange={setSelectedRoles} />
      </div>



      
        <div
          className={cn(
            "absolute px-5 pb-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-500 rounded-md",
            "z-10 overflow-y-hidden",
            expanded
              ? "right-0 top-0 translate-y-[70%] visibility: visible "
              : "visibility: hidden",
          )}
        >
          <div className="flex justify-center items-center p-4 pb-0  border-slate-200 dark:border-slate-500">
            <button onClick={() => setExpanded(false)} className="bg-red-600 border border-white rounded-md p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <FeedFilter onFilterChange={setSelectedRoles} />
          </div>
        </div>

    </div>
  );
}
