"use client";

import { Announcement, AuthorizedUser } from "@/types";
import Link from "next/link";
import { KudosButton } from "./kudos-button";
import { useState } from "react";

export function FeedBlock({
  announcement,
  curUser,
}: {
  announcement: Announcement;
  curUser: AuthorizedUser;
}) {
  const announcementType = announcement.type;

  function formatDate(dateInput: string | Date | undefined) {
    if (!dateInput) return "";

    try {
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      if (isNaN(date.getTime())) return "";

      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: "EST",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  }
  const formattedDate = formatDate(announcement.firstCreated);

  if (announcementType === "playlist") {
    return (
      <li className="py-0 [&:not(:first-child)]:pt-3">
        {formattedDate && (
          <div className="text-sm text-slate-500">{formattedDate}</div>
        )}
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <Link href={`/p/${announcement.playlist?.slug}`}>
              <p className="font-medium truncate bg-green-100 dark:bg-green-400 text-slate-900 dark:text-black">
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
        {formattedDate && (
          <div className="text-sm text-slate-500">{formattedDate}</div>
        )}
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <Link href={`/d/${announcement.droplet?.slug}`}>
              <p className="font-medium truncate bg-sky-100 dark:bg-sky-400 text-slate-900 dark:text-black">
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
        {formattedDate && (
          <div className="text-sm text-slate-500">{formattedDate}</div>
        )}
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <Link href={`/g/${announcement.group?.slug}`}>
              <p className="font-medium truncate bg-purple-100 dark:bg-purple-400 text-slate-900 dark:text-black">
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
        {formattedDate && (
          <div className="text-sm text-slate-500">{formattedDate}</div>
        )}
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate bg-yellow-100 dark:bg-yellow-400 text-slate-900 dark:text-black">
              {announcement.content}
            </p>
            {!announcement.kudosGiven && (
              <KudosButton announcementId={announcement.id} />
            )}
          </div>
        </div>
      </li>
    );
  }

  if (announcementType === "kudos") {
    return (
      <li className="py-0 [&:not(:first-child)]:pt-3">
        {formattedDate && (
          <div className="text-sm text-slate-500">{formattedDate}</div>
        )}
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate bg-orange-100 dark:bg-orange-400 text-slate-900 dark:text-black">
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
        {formattedDate && (
          <div className="text-sm text-slate-500">{formattedDate}</div>
        )}
        <div className="flex items-center space-x-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate bg-red-100 dark:bg-red-400 text-slate-900 dark:text-black">
              {announcement.content}
            </p>
          </div>
        </div>
      </li>
    );
  }
}
