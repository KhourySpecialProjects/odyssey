"use client";

import { useState } from "react";
import { AnnouncementTypeTitle } from "@/lib/globals";
import { FeedClient } from "./feed-client";
import { FeedFilter } from "./feed-filter";
import { Announcement, AnnouncementType } from "@/types";

export function FeedContainer({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const [selectedRoles, setSelectedRoles] = useState<AnnouncementTypeTitle[]>(
    Object.values(AnnouncementTypeTitle),
  );

  return (
    <div className="flex flex-row items-start">
      <div className="w-2/3 items-center text-xl font-bold">
        <FeedClient
          selectedRoles={selectedRoles.map(
            (role) => role.toLowerCase() as AnnouncementType,
          )}
          announcements={announcements}
        />
      </div>
      <div className="w-1/3 text-center text-xl font-bold flex flex-col items-center justify-center dark:text-slate-300">
        Filters
        <FeedFilter onFilterChange={setSelectedRoles} />
      </div>
    </div>
  );
}
