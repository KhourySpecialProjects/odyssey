"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { FeedClient } from "./feed-client";
import { FeedFilter } from "./feed-filter";
import { Announcement, AnnouncementType } from "@/types";

export function FeedContainer({
    announcements,
    newestAnnouncements,
} : {
    announcements: Announcement[];
    newestAnnouncements: Announcement[]
}) {
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    Object.values(AnnouncementTypeTitle)
  );

  return (
    <div className="flex flex-row justify-content">
      <div className="w-2/3 h-200 text-center text-xl font-bold">
        <FeedClient 
        selectedRoles={selectedRoles.map(role => role.toLowerCase() as AnnouncementType)} 
        announcements={announcements} 
        newestAnnouncements={newestAnnouncements}/>
      </div>
      <div className="w-1/3 h-200 text-center text-xl font-bold flex flex-col items-center justify-center">
        Filters
        <FeedFilter onFilterChange={setSelectedRoles} />
      </div>
    </div>
  );
}