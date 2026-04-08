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

interface ParsedContent {
  userName?: string | null;
  entityName?: string | null;
  action?: string;
  taskName?: string;
}

export function FeedBlock({
  announcement,
  authUser,
}: {
  announcement: Announcement;
  authUser: AuthorizedUser;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [playlistPopupOpen, setPlaylistPopupOpen] = useState(false);
  const [dropletPopupOpen, setDropletPopupOpen] = useState(false);
  const [groupPopupOpen, setGroupPopupOpen] = useState(false);

  const announcementConfig = {
    playlist: {
      icon: <ListVideo size={18} />,
      label: "Playlist",
    },
    droplet: {
      icon: <Droplet size={18} />,
      label: "Droplet",
    },
    group: {
      icon: <UsersRound size={18} />,
      label: "Group",
    },
    friend: {
      icon: <Handshake size={18} />,
      label: "Friend",
    },
    kudos: {
      icon: <PartyPopper size={18} />,
      label: "Kudos",
    },
    system: {
      icon: <Info size={18} />,
      label: "System",
    },
  };

  const config = announcementConfig[announcement.type];

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

  function parseContent(content: string, type: string): ParsedContent {
    const cleanContent = content.replace(
      /\.\s+Click\s+to\s+give\s+kudos!$/i,
      "",
    );

    switch (type) {
      case "playlist":
      case "droplet":
      case "group": {
        let match = cleanContent.match(/(.+?)\s+has\s+been\s+updated/i);
        if (match) {
          return { entityName: match[1], action: "updated" };
        }
        match = cleanContent.match(
          /(.+?)\s+has\s+created\s+a\s+new\s+(?:playlist|droplet|group):\s+(.+)/i,
        );
        if (match) {
          return {
            userName: match[1],
            entityName: match[2],
            action: "created",
          };
        }
        return {};
      }

      case "friend": {
        const match = cleanContent.match(
          /(.+?)\s+has\s+(?:just\s+)?(?:finished|completed)\s+(.+)/i,
        );
        if (match) {
          return { userName: match[1], taskName: match[2] };
        }
        return {};
      }

      case "kudos": {
        const match = content.match(
          /(.+?)\s+has\s+given\s+you\s+kudos\s+for\s+(.+)/i,
        );
        if (match) {
          return { userName: match[1], taskName: match[2] };
        }
        return {};
      }

      default:
        return {};
    }
  }

  const parsedContent = parseContent(announcement.content, announcement.type);

  // Check if announcement has structured data with the required entities
  const hasStructuredData = () => {
    if (announcement.type === "system") return false;

    switch (announcement.type) {
      case "playlist":
        return !!announcement.playlist;
      case "droplet":
        return !!announcement.droplet;
      case "group":
        return !!announcement.group;
      case "friend":
        // Friend announcements need BOTH user AND droplet to use structured content
        return !!(announcement.authorized_user && announcement.droplet);
      case "kudos":
        return !!announcement.authorized_user;
      default:
        return false;
    }
  };

  const renderStructuredContent = () => {
    const textClasses = "text-slate-900 dark:text-slate-200";
    const linkClasses = "cursor-pointer hover:underline";

    switch (announcement.type) {
      case "playlist": {
        if (!announcement.playlist) return null;
        return (
          <div className={`-mt-1 text-left font-medium ${textClasses}`}>
            {announcement.authorized_user &&
              parsedContent.action === "created" && (
                <>
                  <span
                    onClick={() => setProfileOpen(true)}
                    className={`inline ${linkClasses}`}
                  >
                    {parsedContent.userName}
                  </span>
                  <span>
                    {"\u00A0"}has created a new playlist:{"\u00A0"}
                  </span>
                </>
              )}
            <span
              onClick={() => setPlaylistPopupOpen(true)}
              className={linkClasses}
            >
              {announcement.playlist.name}
            </span>
            {parsedContent.action === "updated" && (
              <span>{"\u00A0"}has been updated</span>
            )}
          </div>
        );
      }

      case "droplet": {
        if (!announcement.droplet) return null;
        return (
          <div className={`-mt-1 text-left font-medium ${textClasses}`}>
            {announcement.authorized_user &&
              parsedContent.action === "created" && (
                <>
                  <span
                    onClick={() => setProfileOpen(true)}
                    className={`inline ${linkClasses}`}
                  >
                    {parsedContent.userName}
                  </span>
                  <span>
                    {"\u00A0"}has created a new droplet:{"\u00A0"}
                  </span>
                </>
              )}
            <span
              onClick={() => setDropletPopupOpen(true)}
              className={linkClasses}
            >
              {announcement.droplet.name}
            </span>
            {parsedContent.action === "updated" && (
              <span>{"\u00A0"}has been updated</span>
            )}
          </div>
        );
      }

      case "group": {
        if (!announcement.group) return null;

        // Use the group entity's name directly, not parsed content
        const groupName =
          announcement.group.groupName || announcement.group.groupName;

        return (
          <div className={`-mt-1 text-left font-medium ${textClasses}`}>
            {announcement.authorized_user &&
              parsedContent.action === "created" && (
                <>
                  <span
                    onClick={() => setProfileOpen(true)}
                    className={`inline ${linkClasses}`}
                  >
                    {parsedContent.userName}
                  </span>
                  <span>
                    {"\u00A0"}has created a new group:{"\u00A0"}
                  </span>
                </>
              )}
            <span
              onClick={() => setGroupPopupOpen(true)}
              className={linkClasses}
            >
              {groupName}
            </span>
            {(!announcement.authorized_user ||
              parsedContent.action === "updated") && (
              <span>{"\u00A0"}has been updated</span>
            )}
          </div>
        );
      }

      case "friend": {
        // This should only render if we have both user and droplet
        if (!announcement.authorized_user || !announcement.droplet) return null;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
            <div
              className={`flex flex-wrap items-center font-medium ${textClasses}`}
            >
              <span
                onClick={() => setProfileOpen(true)}
                className={`inline ${linkClasses}`}
              >
                {parsedContent.userName}
              </span>
              <span>
                {"\u00A0"}has just finished{"\u00A0"}
              </span>
              <span
                onClick={() => setDropletPopupOpen(true)}
                className={linkClasses}
              >
                {announcement.droplet.name}
              </span>
            </div>
            <div className="flex flex-1 justify-end">
              <KudosButton
                authUser={authUser}
                announcement={announcement}
                droplet={announcement.droplet}
              />
            </div>
          </div>
        );
      }

      case "kudos": {
        if (!announcement.authorized_user) return null;
        return (
          <div className={`-mt-1 text-left font-medium ${textClasses}`}>
            <span
              onClick={() => setProfileOpen(true)}
              className={`inline ${linkClasses}`}
            >
              {parsedContent.userName}
            </span>
            <span>
              {"\u00A0"}has given you kudos for completing{"\u00A0"}
            </span>
            {announcement.droplet ? (
              <span
                onClick={() => setDropletPopupOpen(true)}
                className={linkClasses}
              >
                {announcement.droplet.name}
              </span>
            ) : (
              <span>{parsedContent.taskName}</span>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderPlainContent = () => {
    return (
      <div className="-mt-1 text-left font-medium text-slate-900 dark:text-slate-200">
        {announcement.content}
      </div>
    );
  };

  return (
    <>
      <li className="relative flex flex-col gap-3 rounded-[8px] border border-[#D0D5DD] bg-[#FCFCFD] p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          {config.icon}
          <span className="text-sm font-semibold">{config.label}</span>
        </div>
        <div className="min-w-0">
          {hasStructuredData()
            ? renderStructuredContent()
            : renderPlainContent()}
          {announcement.authorized_user && announcement.type !== "system" && (
            <ProfileBlock
              user={authUser}
              otherUser={announcement.authorized_user}
              isOpen={profileOpen}
              setIsOpen={setProfileOpen}
            />
          )}
        </div>
        <div className="text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
          {formatDate(announcement.firstCreated)}
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
              className="block w-full rounded-md bg-green-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
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
              className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
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
              className="block w-full rounded-md bg-purple-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
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
