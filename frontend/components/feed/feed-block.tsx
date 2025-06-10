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
import { useState } from "react";
import { ProfileBlock } from "../friends/profile-block";

export function FeedBlock({
  announcement,
  authUser,
}: {
  announcement: Announcement;
  authUser: AuthorizedUser;
}) {
  const announcementType = announcement.type;
  const [open, setOpen] = useState(false);

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
    playlist: "bg-green-200 dark:bg-[#29703B] border border-green-400 dark:border-green-200",
    droplet: "bg-blue-200 dark:bg-[#266697] border border-sky-400 dark:border-sky-200",
    group: "bg-purple-200 dark:bg-[#754ABA] border border-purple-400 dark:border-purple-200",
    friend: "bg-yellow-200 dark:bg-[#977020] border border-yellow-400 dark:border-yellow-200",
    kudos: "bg-orange-200 dark:bg-[#B55E0C] border border-orange-400 dark:border-orange-200",
    system: "bg-red-200 dark:bg-[#B83028] border border-red-400 dark:border-red-200",
  };

  const announcementIcon = {
    playlist: <ListVideo />,
    droplet: <Droplet />,
    group: <UsersRound />,
    friend: <Handshake />,
    kudos: <PartyPopper />,
    system: <Info />,
  };

  const content = announcement.content;
  const [namePart] = content.split(/has\s+/i);
  const [, taskPart] = content.split(/finished\s+/i);

  return (
    <li
      className={`${backgroundColor[announcementType]} relative flex flex-col items-start gap-2 rounded-lg p-4 pb-3 hover:scale-105`}
    >
      <div className="flex h-full w-full flex-row gap-3">
        <div className="dark:text-slate-200">
          {announcementIcon[announcementType]}
        </div>
        <div className="flex w-full flex-col justify-between gap-1">
          <div className="flex items-center space-x-4">
            <div className="min-w-0 flex-1">
              {announcementType === "playlist" && (
                <Link href={`/p/${announcement.playlist?.slug}`}>
                  <p className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType === "droplet" && (
                <Link href={`/d/${announcement.droplet?.slug}`}>
                  <p className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType === "group" && (
                <Link href={`/g/${announcement.group?.slug}`}>
                  <p className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
                    {announcement.content}
                  </p>
                </Link>
              )}
              {announcementType === "kudos" && (
                <div className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
                  <p
                    onClick={() => setOpen(true)}
                    className="inline cursor-pointer hover:underline"
                  >
                    {namePart.trim()}
                  </p>
                  {" has given you kudos "}
                  <div>
                    <ProfileBlock
                      user={authUser}
                      otherUser={announcement.authorized_user || authUser}
                      isOpen={open}
                      setIsOpen={setOpen}
                      isFeed={true}
                    />
                  </div>
                </div>
              )}
              {announcementType != "group" &&
                announcementType != "droplet" &&
                announcementType != "kudos" &&
                announcementType != "playlist" && (
                  <>
                    <div className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
                      {announcementType === "friend" ? (
                        <>
                          <p
                            onClick={() => setOpen(true)}
                            className="inline cursor-pointer hover:underline"
                          >
                            {namePart.trim()}
                          </p>
                          {" has just finished "}
                          <span>{taskPart?.trim()}</span>
                        </>
                      ) : (
                        announcement.content
                      )}
                      <div>
                        <ProfileBlock
                          user={authUser}
                          otherUser={announcement.authorized_user || authUser}
                          isOpen={open}
                          setIsOpen={setOpen}
                          isFeed={true}
                        />
                      </div>
                    </div>
                    {announcementType === "friend" &&
                      !announcement.kudosGiven?.some(
                        (user) => user.id === authUser.id,
                      ) && (
                        <div className="absolute bottom-0 left-[50%] translate-x-[-50%] translate-y-[40%]">
                          <KudosButton
                            authUser={authUser}
                            announcement={announcement}
                            droplet={
                              announcement.content?.split(/finished\s+/i)[1] ||
                              ""
                            }
                          />
                        </div>
                      )}
                  </>
                )}
            </div>
          </div>

          {formattedDate && (
            <div className="w-full text-right text-sm text-slate-500 dark:text-slate-200">
              {formattedDate}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
