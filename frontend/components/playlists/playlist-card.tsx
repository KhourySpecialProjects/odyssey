"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDueDateBadgeColor } from "@/lib/utils";
import { Clock } from "lucide-react";
import { Badge } from "../ui/badge";
import { DateTime } from "luxon";
import { useState, useEffect, useRef } from "react";
import { ArchiveButton } from "../ui/archive-button";
import { toast } from "sonner";
import { archivePlaylist } from "@/lib/requests/playlist";
import { Playlist } from "@/types";

interface PlaylistCardProps {
  playlist: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    droplets?: {
      id: number;
      name: string;
      slug: string;
      lessons?: {
        id: number;
        name: string;
        slug: string;
      }[];
    }[];
    duration: "short" | "medium" | "long";
    isPublic: boolean;
    completionPercentage?: number;
  };
  toDraft?: boolean;
  dueDate?: string;
  timeZone?: string;
  dashboardPage?: boolean;
  isArchived?: boolean;
  linkPrefix?: string;
  statsOverride?: string;
  isCreator?: boolean;
}

export function PlaylistCard({
  playlist,
  toDraft = false,
  dueDate,
  timeZone,
  dashboardPage,
  isArchived,
  linkPrefix,
  statsOverride,
  isCreator,
}: PlaylistCardProps) {
  const router = useRouter();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  // Optimistic local archived state so the icon flips immediately on click.
  // Re-syncs with the `isArchived` prop whenever the parent re-renders with
  // fresh data from the server (e.g., after router.refresh()).
  const [localArchived, setLocalArchived] = useState(!!isArchived);
  useEffect(() => {
    setLocalArchived(!!isArchived);
  }, [isArchived]);

  async function changeVisibility() {
    const nextArchived = !localArchived;
    setLocalArchived(nextArchived);
    try {
      const result = await archivePlaylist(playlist as Playlist, nextArchived);
      if (result.success) {
        toast.success(
          nextArchived
            ? `${playlist.name} is now archived!`
            : `${playlist.name} is now unarchived!`,
        );
        // Pull fresh server data so the card moves between tabs.
        router.refresh();
      } else {
        setLocalArchived(!nextArchived);
        toast.error("Failed to update playlist visibility");
      }
    } catch (error) {
      setLocalArchived(!nextArchived);
      toast.error("An error occurred while updating the playlist");
      console.error(error);
    }
  }

  const [isTextClamped, setIsTextClamped] = useState(false);
  const textRef = useRef(null);
  const dropletCount = playlist.droplets ? playlist.droplets.length : 0;
  const strippedDescription = playlist.description
    ?.replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  useEffect(() => {
    if (textRef.current && strippedDescription) {
      const element = textRef.current as HTMLParagraphElement;
      const isClamped = element.scrollHeight > element.clientHeight;
      setIsTextClamped(isClamped);
    }
  }, [strippedDescription, descriptionExpanded]);

  const linkTo = linkPrefix
    ? `${linkPrefix}/${playlist.slug}`
    : toDraft
      ? `/draft/p/${playlist.slug}`
      : `/p/${playlist.slug}`;
  let daysUntil = 0;
  if (dueDate && dueDate !== "") {
    const dueDateObject = DateTime.fromISO(dueDate);
    const today = DateTime.local().startOf("day");
    const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
    daysUntil = Math.ceil(diffDays);
  }

  const finalDate = DateTime.fromISO(dueDate || "")
    .setZone(timeZone || "America/New_York")
    .toFormat("MM/dd hh:mm a");

  return (
    <Link
      href={linkTo}
      className="flex h-full w-full flex-col rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800"
    >
      <div className="flex-1 p-6">
        <div>
          <div>
            {dueDate && dueDate !== "" && daysUntil > -2 && (
              <Badge
                className={getDueDateBadgeColor(daysUntil, true)}
                variant="outline"
              >
                <Clock size={15} className="mr-1" />

                {(() => {
                  if (
                    DateTime.fromISO(dueDate).toISODate() ==
                    DateTime.local().toISODate()
                  ) {
                    return "Due today!";
                  } else if (daysUntil === 1) {
                    return `Due in 1 day`;
                  } else if (daysUntil > 0) {
                    return timeZone
                      ? `Due ${finalDate}`
                      : `Due in ${daysUntil} days`;
                  } else {
                    return "Late!";
                  }
                })()}
              </Badge>
            )}
          </div>
          <div className="block w-full place-self-end text-3xl font-black text-slate-950 dark:text-slate-300">
            {playlist.name}
          </div>

          <p className="pt-2 text-sm text-slate-500 dark:text-slate-400">
            {statsOverride ?? (
              <>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {dropletCount}
                </span>{" "}
                {dropletCount === 1 ? "droplet" : "droplets"}
              </>
            )}
          </p>
          <div>
            {strippedDescription &&
              strippedDescription.trim() !== "<p></p>" &&
              strippedDescription.trim() !== "" && (
                <>
                  <p
                    ref={textRef}
                    className={`${
                      descriptionExpanded ? "line-clamp-none" : "line-clamp-2"
                    } text-md text-slate-700 dark:text-slate-300`}
                  >
                    {strippedDescription}
                  </p>

                  {isTextClamped && !descriptionExpanded && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDescriptionExpanded(true);
                      }}
                      className="text-left text-sm text-sky-700 dark:text-sky-500"
                    >
                      See More
                    </button>
                  )}

                  {descriptionExpanded && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDescriptionExpanded(false);
                      }}
                      className="text-left text-sm text-sky-700 dark:text-sky-500"
                    >
                      See Less
                    </button>
                  )}
                </>
              )}
          </div>
        </div>
      </div>
      {dashboardPage && isCreator && (
        <div className="mt-auto flex justify-end p-2">
          <ArchiveButton
            isArchived={localArchived}
            onToggle={changeVisibility}
          />
        </div>
      )}
    </Link>
  );
}
