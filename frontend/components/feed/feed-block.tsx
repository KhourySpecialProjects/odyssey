"use client";

import { Announcement, AuthorizedUser } from "@/types";
import Link from "next/link";
import { KudosButton } from "./kudos-button";
import {
  CircleAlert,
  Droplet,
  Handshake,
  ListVideo,
  PartyPopper,
  UsersRound,
} from "lucide-react";

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

  const backgroundColor = {
    playlist: "bg-green-100 dark:bg-green-800",
    droplet: "bg-sky-100 dark:bg-sky-800",
    group: "bg-purple-100 dark:bg-purple-800",
    friend: "bg-yellow-100 dark:bg-yellow-800",
    kudos: "bg-orange-100 dark:bg-orange-800",
    system: "bg-red-100 dark:bg-red-800",
  };

  const announcementIcon = {
    playlist: <ListVideo />,
    droplet: <Droplet />,
    group: <UsersRound />,
    friend: <Handshake />,
    kudos: <PartyPopper />,
    system: <CircleAlert />,
  };

  return (
    <li
      className={`${backgroundColor[announcementType]} rounded-lg flex flex-col items-center gap-2 p-2`}
    >
      {formattedDate && (
        <div className="text-sm text-slate-500 dark:text-slate-300">
          {formattedDate}
        </div>
      )}
      <div className="justify-center dark:text-slate-300">
        {announcementIcon[announcementType]}
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex-1 min-w-0">
          {announcementType === "playlist" && (
            <Link href={`/p/${announcement.playlist?.slug}`}>
              <p className="font-medium text-slate-900 dark:text-slate-300 max-h-24 overflow-y-auto">
                {announcement.content}
              </p>
            </Link>
          )}
          {announcementType === "droplet" && (
            <Link href={`/d/${announcement.droplet?.slug}`}>
              <p className="font-medium bg-sky-100 dark:bg-sky-800 text-slate-900 dark:text-slate-300 max-h-24 overflow-y-auto">
                {announcement.content}
              </p>
            </Link>
          )}
          {announcementType === "group" && (
            <Link href={`/g/${announcement.group?.slug}`}>
              <p className="font-medium bg-sky-100 dark:bg-sky-800 text-slate-900 dark:text-slate-300 max-h-24 overflow-y-auto">
                {announcement.content}
              </p>
            </Link>
          )}
          {announcementType != "group" &&
            announcementType != "droplet" &&
            announcementType != "playlist" && (
              <>
                <p className="font-medium text-slate-900 dark:text-slate-300 max-h-24 overflow-y-auto">
                  {announcement.content}
                </p>
                {announcementType === "friend" && !announcement.kudosGiven && (
                  <KudosButton announcementId={announcement.id} />
                )}
              </>
            )}
        </div>
      </div>
    </li>
  );
}
