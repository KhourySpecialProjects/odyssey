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
    playlist: "bg-green-200 dark:bg-[#29703B]",
    droplet: "bg-blue-200 dark:bg-[#266697]",
    group: "bg-purple-200 dark:bg-[#754ABA]",
    friend: "bg-yellow-200 dark:bg-[#C38508]",
    kudos: "bg-orange-200 dark:bg-[#B55E0C]",
    system: "bg-red-200 dark:bg-[#B83028]",
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
  const [, taskPart] = content.split(/(?:completed|finished)\s+/i); // non-capturing group for "completed" or "finished"
  const [, kudosTaskPart] = content.split(/for\s+/i);
  return (
    <li
      className={`${backgroundColor[announcementType]} relative flex flex-col items-start gap-2 rounded-lg p-4 pb-3`}
    >
      <div className="flex w-full flex-col justify-between gap-1">
        <div className="flex items-center space-x-4">
          <div className="dark:text-slate-200">
            {announcementIcon[announcementType]}
          </div>
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
                <>
                  {"\u00A0"}has given you kudos for{"\u00A0"}
                </>
                <span>{kudosTaskPart?.trim()}</span>
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
                      <div className="flex flex-row">
                        <p
                          onClick={() => setOpen(true)}
                          className="inline cursor-pointer hover:underline"
                        >
                          {namePart.trim()}
                        </p>
                        <>
                          {"\u00A0"}has just finished{"\u00A0"}
                        </>
                        <span>{taskPart?.trim()}</span>
                        {announcementType === "friend" && (
                          <div className="flex flex-1 justify-end">
                            <KudosButton
                              authUser={authUser}
                              announcement={announcement}
                              droplet={
                                announcement.content?.split(
                                  /finished\s+/i,
                                )[1] || ""
                              }
                            />
                          </div>
                        )}
                      </div>
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
                </>
              )}
          </div>
        </div>
        <div className="flex w-full flex-row items-center justify-end pt-2 text-right text-sm text-slate-900 dark:text-slate-200">
          {formattedDate}
        </div>
      </div>
    </li>
  );
}
