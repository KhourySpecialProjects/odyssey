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
  const [dropletPopupOpen, setDropletPopupOpen] = useState(false);
  const [playlistPopupOpen, setPlaylistPopupOpen] = useState(false);
  const [groupPopupOpen, setGroupPopupOpen] = useState(false);

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

  // Remove '. Click to give kudos!' from the end if it exists
  const cleanedContent = content.replace(
    /\.\s+Click\s+to\s+give\s+kudos!$/i,
    "",
  );
  const [, taskPart] = cleanedContent.split(/(?:completed|finished)\s+/i);

  const [, kudosTaskPart] = content.split(/for\s+/i);

  // Parse playlist content - handles both "created" and "updated" announcements
  const parsePlaylistContent = (content: string) => {
    // Try "has been updated" format first
    let match = content.match(
      /(.+?)\s+has\s+been\s+updated\.\s+Click\s+to\s+view\s+this\s+playlist/i,
    );
    if (match) {
      return { userName: null, playlistName: match[1] };
    }
    // Try "has created a new playlist" format
    match = content.match(
      /(.+?)\s+has\s+created\s+a\s+new\s+playlist:\s+(.+)/i,
    );
    if (match) {
      return { userName: match[1], playlistName: match[2] };
    }
    return null;
  };

  // Parse droplet content - handles both "created" and other formats
  const parseDropletContent = (content: string) => {
    // Try "has been updated" or similar format
    let match = content.match(
      /(.+?)\s+has\s+been\s+(?:updated|created)\.\s+Click\s+to\s+view\s+this\s+droplet/i,
    );
    if (match) {
      return { userName: null, dropletName: match[1] };
    }
    // Try "has created a new droplet" format
    match = content.match(/(.+?)\s+has\s+created\s+a\s+new\s+droplet:\s+(.+)/i);
    if (match) {
      return { userName: match[1], dropletName: match[2] };
    }
    return null;
  };

  // Parse group content - handles both "created" and "updated" formats
  const parseGroupContent = (content: string) => {
    // Try "has been updated" format
    let match = content.match(
      /(.+?)\s+has\s+been\s+updated\.\s+Click\s+to\s+view\s+this\s+group/i,
    );
    if (match) {
      return { userName: null, groupName: match[1] };
    }
    // Try "has created a new group" format
    match = content.match(/(.+?)\s+has\s+created\s+a\s+new\s+group:\s+(.+)/i);
    if (match) {
      return { userName: match[1], groupName: match[2] };
    }
    return null;
  };

  const playlistData = parsePlaylistContent(content);
  const dropletData = parseDropletContent(content);
  const groupData = parseGroupContent(content);

  return (
    <>
      <li
        className={`${backgroundColor[announcementType]} relative flex flex-col items-start gap-2 rounded-lg p-4 pb-3`}
      >
        <div className="flex w-full flex-col justify-between gap-1">
          <div className="flex items-center space-x-4">
            <div className="dark:text-slate-200">
              {announcementIcon[announcementType]}
            </div>
            <div className="min-w-0 flex-1">
              {announcementType === "playlist" && playlistData && (
                <div className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
                  {playlistData.userName ? (
                    <>
                      <p
                        onClick={() => setOpen(true)}
                        className="inline cursor-pointer hover:underline"
                      >
                        {playlistData.userName}
                      </p>
                      <span>
                        {"\u00A0"}has created a new playlist:{"\u00A0"}
                      </span>
                    </>
                  ) : null}
                  <span
                    onClick={() => setPlaylistPopupOpen(true)}
                    className="cursor-pointer hover:underline"
                  >
                    {playlistData.playlistName}
                  </span>
                  {playlistData.userName ? (
                    <>
                      <span>{"\u00A0"}has been updated</span>
                    </>
                  ) : (
                    <span>{"\u00A0"}has been updated</span>
                  )}
                  {playlistData.userName && (
                    <div>
                      <ProfileBlock
                        user={authUser}
                        otherUser={announcement.authorized_user || authUser}
                        isOpen={open}
                        setIsOpen={setOpen}
                        isFeed={true}
                      />
                    </div>
                  )}
                </div>
              )}

              {announcementType === "droplet" && dropletData && (
                <div className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
                  {dropletData.userName ? (
                    <>
                      <p
                        onClick={() => setOpen(true)}
                        className="inline cursor-pointer hover:underline"
                      >
                        {dropletData.userName}
                      </p>
                      <span>
                        {"\u00A0"}has created a new droplet:{"\u00A0"}
                      </span>
                    </>
                  ) : null}
                  <span
                    onClick={() => setDropletPopupOpen(true)}
                    className="cursor-pointer hover:underline"
                  >
                    {dropletData.dropletName}
                  </span>
                  {dropletData.userName ? null : (
                    <span>{"\u00A0"}has been updated</span>
                  )}
                  {dropletData.userName && (
                    <div>
                      <ProfileBlock
                        user={authUser}
                        otherUser={announcement.authorized_user || authUser}
                        isOpen={open}
                        setIsOpen={setOpen}
                        isFeed={true}
                      />
                    </div>
                  )}
                </div>
              )}

              {announcementType === "group" && groupData && (
                <div className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
                  {groupData.userName ? (
                    <>
                      <p
                        onClick={() => setOpen(true)}
                        className="inline cursor-pointer hover:underline"
                      >
                        {groupData.userName}
                      </p>
                      <span>
                        {"\u00A0"}has created a new group:{"\u00A0"}
                      </span>
                    </>
                  ) : null}
                  <span
                    onClick={() => setGroupPopupOpen(true)}
                    className="cursor-pointer hover:underline"
                  >
                    {groupData.groupName}
                  </span>
                  {groupData.userName ? null : (
                    <span>{"\u00A0"}has been updated</span>
                  )}
                  {groupData.userName && (
                    <div>
                      <ProfileBlock
                        user={authUser}
                        otherUser={announcement.authorized_user || authUser}
                        isOpen={open}
                        setIsOpen={setOpen}
                        isFeed={true}
                      />
                    </div>
                  )}
                </div>
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                          <div className="flex flex-wrap items-center">
                            <p
                              onClick={() => setOpen(true)}
                              className="inline cursor-pointer hover:underline"
                            >
                              {namePart.trim()}
                            </p>
                            <span>
                              {"\u00A0"}has just finished{"\u00A0"}
                            </span>
                            <span
                              onClick={() => setDropletPopupOpen(true)}
                              className="cursor-pointer hover:underline"
                            >
                              {taskPart?.trim()}
                            </span>
                          </div>
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

      {/* Playlist Popup */}
      {playlistPopupOpen && announcement.playlist && (
        <div
          className="bg-opacity-20 dark:bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4"
          onClick={() => setPlaylistPopupOpen(false)}
        >
          <div
            className="w-96 rounded-lg border-2 border-gray-300 bg-white p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {announcement.playlist.name}
              </h2>
              <button
                onClick={() => setPlaylistPopupOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              {announcement.playlist.description || "No description available"}
            </div>
            <Link
              href={`/p/${announcement.playlist.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-md bg-green-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              onClick={() => setPlaylistPopupOpen(false)}
            >
              View Playlist
            </Link>
          </div>
        </div>
      )}

      {/* Droplet Popup */}
      {dropletPopupOpen && announcement.droplet && (
        <div
          className="bg-opacity-20 dark:bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4"
          onClick={() => setDropletPopupOpen(false)}
        >
          <div
            className="w-96 rounded-lg border-2 border-gray-300 bg-white p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {announcement.droplet.name}
              </h2>
              <button
                onClick={() => setDropletPopupOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              {announcement.droplet.description || "No description available"}
            </div>
            <Link
              href={`/d/${announcement.droplet.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              onClick={() => setDropletPopupOpen(false)}
            >
              View Droplet
            </Link>
          </div>
        </div>
      )}

      {/* Group Popup */}
      {groupPopupOpen && announcement.group && (
        <div
          className="bg-opacity-20 dark:bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4"
          onClick={() => setGroupPopupOpen(false)}
        >
          <div
            className="w-96 rounded-lg border-2 border-gray-300 bg-white p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {announcement.group.groupName}
              </h2>
              <button
                onClick={() => setGroupPopupOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              {announcement.group.description || "No description available"}
            </div>
            <Link
              href={`/g/${announcement.group.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-md bg-purple-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              onClick={() => setGroupPopupOpen(false)}
            >
              View Group
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
