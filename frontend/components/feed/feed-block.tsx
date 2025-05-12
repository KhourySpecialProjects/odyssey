"use client";

import { Announcement, AuthorizedUser } from "@/types";
import Link from "next/link";
import { KudosButton } from "./kudos-button";
import {
  Droplet,
  Handshake,
  ListVideo,
  PartyPopper,
  UsersRound,
  Info,
} from "lucide-react";

export function FeedBlock({
  announcement,
  authUser,
}: {
  announcement: Announcement;
  authUser: AuthorizedUser;
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
    system: <Info />,
  };

  return (
    <li
      className={`${backgroundColor[announcementType]} relative flex flex-col items-start gap-2 rounded-lg p-4 pb-3 hover:scale-105`}
    >
      <div className="flex h-full w-full flex-row gap-3">
        <div className="dark:text-slate-300">
          {announcementIcon[announcementType]}
        </div>
        <div className="flex w-full flex-col justify-between gap-1">
          <div className="flex items-center space-x-4">
            <div className="min-w-0 flex-1">
              {announcementType === "playlist" && (
                <Link href={`/p/${announcement.playlist?.slug}`}>
                  <p className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-300">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType === "droplet" && (
                <Link href={`/d/${announcement.droplet?.slug}`}>
                  <p className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-300">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType === "group" && (
                <Link href={`/g/${announcement.group?.slug}`}>
                  <p className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-300">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType != "group" &&
                announcementType != "droplet" &&
                announcementType != "playlist" && (
                  <>
                    <p className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-300">
                      {announcement.content}
                    </p>
                    {announcementType === "friend" &&
                      !announcement.kudosGiven?.includes(authUser) && (
                        <div className="absolute bottom-0 left-[50%] translate-x-[-50%] translate-y-[40%]">
                          <KudosButton announcementId={announcement.id} />
                        </div>
                      )}
                  </>
                )}
            </div>
          </div>

          {formattedDate && (
            <div className="w-full text-right text-sm text-slate-500 dark:text-slate-300">
              {formattedDate}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
