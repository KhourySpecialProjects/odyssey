"use client";

import { Announcement } from "@/types";
import Link from "next/link";

export function FeedBlock({
  announcement
}: {
  announcement: Announcement;
}) {
    const announcementType = announcement.type;

    if (announcementType === "playlist") {
        return (

            <li className="py-0 [&:not(:first-child)]:pt-3">
              <div className="flex items-center space-x-4">
                <div className="flex-1 min-w-0">
                <Link href={`/p/${announcement.playlist?.slug}`}>
                  <p className="font-medium truncate bg-green-100 text-slate-900 dark:text-white">
                    {announcement.content}
                  </p>
                  </Link>
                </div>
        
              </div>
            </li>
   
          );
    }

    if (announcementType === "droplet") {
        return (
            <li className="py-0 [&:not(:first-child)]:pt-3">
              <div className="flex items-center space-x-4">
                <div className="flex-1 min-w-0">
                <Link href={`/d/${announcement.droplet?.slug}`}>
                  <p className="font-medium truncate bg-sky-100 text-slate-900 dark:text-white">
                    {announcement.content}
                  </p>
                </Link>
                </div>
        
              </div>
            </li>
          );
    }

    if (announcementType === "group") {
        return (
            <li className="py-0 [&:not(:first-child)]:pt-3">
              <div className="flex items-center space-x-4">
                <div className="flex-1 min-w-0">
                <Link href={`/g/${announcement.group?.slug}`}>
                  <p className="font-medium truncate bg-purple-100 text-slate-900 dark:text-white">
                    {announcement.content}
                  </p>
                  </Link>
                </div>
        
              </div>
            </li>
          );
    }

    if (announcementType === "friend") {
        return (
            <li className="py-0 [&:not(:first-child)]:pt-3">
              <div className="flex items-center space-x-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate bg-yellow-100 text-slate-900 dark:text-white">
                    {announcement.content}
                  </p>
                </div>
        
              </div>
            </li>
          );
    }

    if (announcementType === "system") {
        return (
            <li className="py-0 [&:not(:first-child)]:pt-3">
              <div className="flex items-center space-x-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate bg-red-100 text-slate-900 dark:text-white">
                    {announcement.content}
                  </p>
                </div>
        
              </div>
            </li>
          );
    }
  

}
