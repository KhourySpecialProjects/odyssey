"use client";

import { AuthorizedUser, Droplet } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  getDueDateBadgeColor,
  uppercaseFirstChar,
  getDifficultyBadgeColor,
  cn,
} from "@/lib/utils";
import { Clock } from "lucide-react";
import { DateTime } from "luxon";
import { useState, useEffect, useRef } from "react";

interface GroupDropletTileProps {
  droplet: Droplet;
  dueDate?: string;
  authUser?: AuthorizedUser;
}

export function GroupDropletTile({
  droplet,
  dueDate,
  authUser,
}: GroupDropletTileProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isTextClamped, setIsTextClamped] = useState(false);
  const textRef = useRef(null);

  const strippedDescription = droplet.description
    ?.replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  useEffect(() => {
    const checkClamping = () => {
      if (textRef.current && strippedDescription) {
        const element = textRef.current as HTMLParagraphElement;
        setIsTextClamped(element.scrollHeight > element.clientHeight);
      }
    };

    checkClamping();
    window.addEventListener("resize", checkClamping);

    return () => window.removeEventListener("resize", checkClamping);
  }, [strippedDescription, descriptionExpanded]);

  let daysUntil = 0;
  let finalDate = "";
  if (dueDate && dueDate !== "") {
    const dueDateObject = DateTime.fromISO(dueDate);
    const today = DateTime.local().startOf("day");
    const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
    daysUntil = Math.ceil(diffDays);

    finalDate = DateTime.fromISO(dueDate)
      .setZone(authUser?.timeZone?.trim() || "America/New_York")
      .toFormat("MM/dd hh:mm a");
  }

  return (
    <Link href={`/d/${droplet.slug}`} target="_blank" rel="noopener noreferrer">
      <Card className="h-full border-slate-200 bg-slate-50 transition-shadow hover:shadow-md dark:border-slate-500 dark:bg-slate-800">
        <CardHeader className={`${dueDate && dueDate !== "" ? "" : ""} pb-2`}>
          <div className="mb-2 flex flex-row items-center gap-2">
            <div className="flex h-1/2 w-2/3 flex-row space-x-1">
              <Badge variant="default" className="text-xs">
                {uppercaseFirstChar(droplet.focusArea)}
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs dark:bg-slate-900 dark:text-white"
              >
                {uppercaseFirstChar(droplet.type)}
              </Badge>
              {droplet.difficulty && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    getDifficultyBadgeColor(droplet.difficulty),
                  )}
                >
                  {uppercaseFirstChar(droplet.difficulty)}
                </Badge>
              )}
            </div>
            {dueDate && dueDate !== "" && daysUntil > -2 && (
              <div className="ml-0 flex w-2/3 justify-end">
                <Badge
                  className={`${getDueDateBadgeColor(daysUntil, true)}`}
                  variant="outline"
                >
                  <Clock size={15} className="mr-1" />

                  {(() => {
                    if (
                      DateTime.fromISO(dueDate).toISODate() ==
                      DateTime.local().toISODate()
                    ) {
                      return "Due today!";
                    } else if (daysUntil > 0) {
                      return `Due ${finalDate}`;
                    } else {
                      return "Late!";
                    }
                  })()}
                </Badge>
              </div>
            )}
          </div>
          <CardTitle className="dark:text-slate-300">{droplet.name}</CardTitle>
          <p className="text-muted-foreground pt-1 text-sm dark:text-slate-400">
            {droplet.lessons?.length || 0} lessons
          </p>
        </CardHeader>
        <CardContent>
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
                      e.stopPropagation();
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
                      e.stopPropagation();
                      setDescriptionExpanded(false);
                    }}
                    className="text-left text-sm text-sky-700 dark:text-sky-500"
                  >
                    See Less
                  </button>
                )}
              </>
            )}
        </CardContent>
      </Card>
    </Link>
  );
}
