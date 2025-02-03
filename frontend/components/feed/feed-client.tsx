"use client";

import { useState } from "react";
import { AnnouncementType, Announcement } from "@/types";
import { FeedBlock } from "./feed-block";
import { Button } from "../ui/button";
import { filter } from "lodash";

export function FeedClient({
  selectedRoles,
  announcements,
  newestAnnouncements
}: {
  selectedRoles: AnnouncementType[];
  announcements: Announcement[];
  newestAnnouncements: Announcement[];
}) {
  const [toShow, setToShow] = useState(newestAnnouncements);
  const [buttonDisplay, setButtonDisplay] = useState(true)
  const filteredAnnouncements = toShow.filter((post) => 
    selectedRoles.includes(post.type)
  );

  const handleLoadMore = () => {
    if (buttonDisplay) {
        setToShow(announcements);
    } else {
        setToShow(newestAnnouncements)
    }
    setButtonDisplay(!buttonDisplay)

  };

  return (
    <section>
      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {filteredAnnouncements.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {filteredAnnouncements.map((post) => (
              <FeedBlock
                key={post.id}
                announcement={post}
              />
            ))}
          </ul>
        ) : (
          <p>You have no posts in your feed</p>
        )}
        <Button size="sm"
            variant="outline" className="mt-4" onClick={handleLoadMore}> 
            {buttonDisplay ? "Load Older Announcements" : "Hide Older Announcements"}
        </Button>
      </div>
    </section>
  );
}