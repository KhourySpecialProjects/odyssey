"use client";

import Link from "next/link";
import { getDueDateBadgeColor } from "@/lib/utils";
import { Archive, ArchiveRestore, Clock } from "lucide-react";
import { Badge } from "../ui/badge";
import { DateTime } from "luxon";
import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
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
}

export function PlaylistCard({
  playlist,
  toDraft = false,
  dueDate,
  timeZone,
  dashboardPage,
  isArchived,
}: PlaylistCardProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  async function changeVisibility() {
    try {
      const result = await archivePlaylist(
        playlist as Playlist,
        isArchived ? false : true,
      );
      if (result.success) {
        toast.success(
          isArchived
            ? `${playlist.name} is now unarchived!`
            : `${playlist.name} is now archived!`,
        );
      } else {
        toast.error("Failed to update playlist visibility");
      }
    } catch (error) {
      toast.error("An error occurred while updating the playlist");
      console.error(error);
    }
  }

  const [isTextClamped, setIsTextClamped] = useState(false);
  const textRef = useRef(null);
  const dropletCount = playlist.droplets ? playlist.droplets.length : 0;
  const lessonCount =
    playlist.droplets?.reduce(
      (total, droplet) => total + (droplet.lessons?.length ?? 0),
      0,
    ) ?? 0;
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

  const linkTo = toDraft ? `/draft/p/${playlist.slug}` : `/p/${playlist.slug}`;
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
      className="inline-block h-full w-full rounded-md border border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800"
    >
      <div className="p-6">
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

          <p className="light:text-slate-600 pt-2 text-sm dark:text-slate-300">
            Droplets: {dropletCount} &nbsp;&nbsp;&nbsp;&nbsp; Lessons:{" "}
            {lessonCount}
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
      {dashboardPage && (
        <div className="flex justify-end p-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              changeVisibility();
            }}
            className={`${isArchived === true || isArchived === false ? "visibility: visible" : "visibility: hidden"} justify-end bg-slate-50 hover:bg-slate-300 dark:bg-slate-300`}
          >
            <div className="group relative">
              {isArchived ? (
                <ArchiveRestore className="text-purple-500" />
              ) : (
                <Archive className="text-purple-500" />
              )}
              <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {isArchived ? "Unarchive" : "Archive"}
              </span>
            </div>
          </Button>
        </div>
      )}
    </Link>
  );
}
