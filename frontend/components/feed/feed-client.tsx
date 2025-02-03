"use client";

import { useState, useEffect } from "react";
import { AnnouncementType, Announcement } from "@/types";
import { FeedBlock } from "./feed-block";
import { fetchAnnouncements } from "@/lib/requests/feed";
import { AnnouncementTypeTitle } from "@/lib/globals";

export function FeedClient({
  selectedRoles,
  announcements,
}: {
  selectedRoles: AnnouncementType[];
  announcements: Announcement[];
}) {
    const filteredAnnouncements = announcements.filter((post) => 
    selectedRoles.includes(post.type)
  );

  return (
    <section>
      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {announcements.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {filteredAnnouncements.map((post) => (
              <FeedBlock key={post.id} announcement={post} />
            ))}
          </ul>
        ) : (
          <p>You have no posts in your feed</p>
        )}
      </div>
    </section>
  );
}