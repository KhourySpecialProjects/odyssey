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

  const announcementConfig = {
    playlist: {
      bgColor: "bg-green-200 dark:bg-[#29703B]",
      icon: <ListVideo />,
    },
    droplet: {
      bgColor: "bg-blue-200 dark:bg-[#266697]",
      icon: <Droplet />,
    },
    group: {
      bgColor: "bg-purple-200 dark:bg-[#754ABA]",
      icon: <UsersRound />,
    },
    friend: {
      bgColor: "bg-yellow-200 dark:bg-[#C38508]",
      icon: <Handshake />,
    },
    kudos: {
      bgColor: "bg-orange-200 dark:bg-[#B55E0C]",
      icon: <PartyPopper />,
    },
    system: {
      bgColor: "bg-red-200 dark:bg-[#B83028]",
      icon: <Info />,
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
    const cleanContent = content.replace(/\.\s+Click\s+to\s+give\s+kudos!$/i, "");

    switch (type) {
      case "playlist":
      case "droplet":
      case "group": {
        let match = cleanContent.match(/(.+?)\s+has\s+been\s+updated/i);
        if (match) {
          return { entityName: match[1], action: "updated" };
        }
        match = cleanContent.match(/(.+?)\s+has\s+created\s+a\s+new\s+(?:playlist|droplet|group):\s+(.+)/i);
        if (match) {
          return { userName: match[1], entityName: match[2], action: "created" };
        }
        return {};
      }
      
      case "friend": {
        const match = cleanContent.match(/(.+?)\s+has\s+(?:just\s+)?(?:finished|completed)\s+(.+)/i);
        if (match) {
          return { userName: match[1], taskName: match[2] };
        }
        return {};
      }
      
      case "kudos": {
        const match = content.match(/(.+?)\s+has\s+given\s+you\s+kudos\s+for\s+(.+)/i);
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
            {announcement.authorized_user && parsedContent.action === "created" && (
              <>
                <span
                  onClick={() => setProfileOpen(true)}
                  className={`inline ${linkClasses}`}
                >
                  {parsedContent.userName}
                </span>
                <span>{"\u00A0"}has created a new playlist:{"\u00A0"}</span>
              </>
            )}
            <Link
              href={`/p/${announcement.playlist.slug}`}
              className={linkClasses}
            >
              {announcement.playlist.name}
            </Link>
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
            {announcement.authorized_user && parsedContent.action === "created" && (
              <>
                <span
                  onClick={() => setProfileOpen(true)}
                  className={`inline ${linkClasses}`}
                >
                  {parsedContent.userName}
                </span>
                <span>{"\u00A0"}has created a new droplet:{"\u00A0"}</span>
              </>
            )}
            <Link
              href={`/d/${announcement.droplet.slug}`}
              className={linkClasses}
            >
              {announcement.droplet.name}
            </Link>
            {parsedContent.action === "updated" && (
              <span>{"\u00A0"}has been updated</span>
            )}
          </div>
        );
      }

      case "group": {
        if (!announcement.group) return null;
        
        // Use the group entity's name directly, not parsed content
        const groupName = announcement.group.groupName || announcement.group.groupName;
        
        return (
          <div className={`-mt-1 text-left font-medium ${textClasses}`}>
            {announcement.authorized_user && parsedContent.action === "created" && (
              <>
                <span
                  onClick={() => setProfileOpen(true)}
                  className={`inline ${linkClasses}`}
                >
                  {parsedContent.userName}
                </span>
                <span>{"\u00A0"}has created a new group:{"\u00A0"}</span>
              </>
            )}
            <Link
              href={`/g/${announcement.group.slug}`}
              className={linkClasses}
            >
              {groupName}
            </Link>
            {(!announcement.authorized_user || parsedContent.action === "updated") && (
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
            <div className={`flex flex-wrap items-center font-medium ${textClasses}`}>
              <span
                onClick={() => setProfileOpen(true)}
                className={`inline ${linkClasses}`}
              >
                {parsedContent.userName}
              </span>
              <span>{"\u00A0"}has just finished{"\u00A0"}</span>
              <Link
                href={`/d/${announcement.droplet.slug}`}
                className={linkClasses}
              >
                {announcement.droplet.name}
              </Link>
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
            <span>{"\u00A0"}has given you kudos for{"\u00A0"}</span>
            {announcement.droplet ? (
              <Link
                href={`/d/${announcement.droplet.slug}`}
                className={linkClasses}
              >
                {announcement.droplet.name}
              </Link>
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
      <li
        className={`${config.bgColor} relative flex flex-col items-start gap-2 rounded-lg p-4 pb-3`}
      >
        <div className="flex w-full flex-col justify-between gap-1">
          <div className="flex items-center space-x-4">
            <div className="dark:text-slate-200">{config.icon}</div>
            <div className="min-w-0 flex-1">
              {hasStructuredData() ? renderStructuredContent() : renderPlainContent()}
              
              {announcement.authorized_user && announcement.type !== "system" && (
                <ProfileBlock
                  user={authUser}
                  otherUser={announcement.authorized_user}
                  isOpen={profileOpen}
                  setIsOpen={setProfileOpen}
                  isFeed={true}
                />
              )}
            </div>
          </div>
          <div className="flex w-full flex-row items-center justify-end pt-2 text-right text-sm text-slate-900 dark:text-slate-200">
            {formatDate(announcement.firstCreated)}
          </div>
        </div>
      </li>
    </>
  );
}