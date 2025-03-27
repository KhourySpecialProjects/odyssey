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

export function FeedBlock({ announcement }: { announcement: Announcement }) {
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
    playlist: "bg-green-200 dark:bg-green-800",
    droplet: "bg-sky-200 dark:bg-sky-800",
    group: "bg-purple-200 dark:bg-purple-800",
    friend: "bg-yellow-200 dark:bg-yellow-800",
    kudos: "bg-orange-200 dark:bg-orange-800",
    system: "bg-red-200 dark:bg-red-800",
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
      className={`${backgroundColor[announcementType]} rounded-lg flex flex-col items-start gap-2 p-4 pb-3 relative hover:scale-105`}
    >

      <div className="flex flex-row w-full h-full gap-3">
        <div className="dark:text-slate-300">
          {announcementIcon[announcementType]}
        </div>
        <div className="flex flex-col gap-1 w-full justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-1 min-w-0">
              {announcementType === "playlist" && (
                <Link href={`/p/${announcement.playlist?.slug}`}>
                  <p className="font-medium text-slate-900 dark:text-slate-300 max-h-24 overflow-y-auto text-left -mt-1">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType === "droplet" && (
                <Link href={`/d/${announcement.droplet?.slug}`}>
                  <p className="font-medium text-slate-900 dark:text-slate-300 max-h-24 overflow-y-auto text-left -mt-1">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType === "group" && (
                <Link href={`/g/${announcement.group?.slug}`}>
                  <p className="font-medium text-slate-900 dark:text-slate-300 max-h-24 overflow-y-auto text-left -mt-1">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType != "group" &&
                announcementType != "droplet" &&
                announcementType != "playlist" && (
                  <>
                    <p className="font-medium text-slate-900 dark:text-slate-300 max-h-24 overflow-y-auto text-left -mt-1">
                      {announcement.content}
                    </p>
                    {announcementType === "friend" && !announcement.kudosGiven && (
                      <div className="absolute bottom-0 left-[50%] translate-x-[-50%] translate-y-[20%]">
                      <KudosButton announcementId={announcement.id} />
                      </div>
                    )}
                  </>
                )}
            </div>
          </div>

          {formattedDate && (
            <div className="text-sm text-slate-500 dark:text-slate-300 w-full text-right">
              {formattedDate}
            </div>
          )}
        </div>
      </div>

    </li>
  );
}
