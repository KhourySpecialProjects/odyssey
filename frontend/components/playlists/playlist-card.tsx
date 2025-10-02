"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getDueDateBadgeColor } from "@/lib/utils";
import { Clock } from "lucide-react";
import { Badge } from "../ui/badge";
import { DateTime } from "luxon";
import { getDropletById } from "@/lib/requests/droplet";
import { useState, useEffect, useRef } from "react";

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
}

export function PlaylistCard({
  playlist,
  toDraft = false,
  dueDate,
  timeZone,
}: PlaylistCardProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isTextClamped, setIsTextClamped] = useState(false);
  const [isScreenChanged, setIsScreenChanged] = useState(false); // New state variable to track screen size changes
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
    <Link href={linkTo} className="block h-full">
      <Card className="flex h-full flex-col border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-800">
        <CardHeader>
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
          <CardTitle className="block w-full place-self-end text-3xl font-black text-slate-950 dark:text-slate-300">
            {playlist.name}
          </CardTitle>

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
        </CardHeader>
      </Card>
    </Link>
  );
}
