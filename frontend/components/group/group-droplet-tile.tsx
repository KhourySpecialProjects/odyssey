"use client";

import { AuthorizedUser, Droplet } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getDueDateBadgeColor, uppercaseFirstChar } from "@/lib/utils";
import { Clock } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";

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

  const strippedDescription = droplet.description
    ?.replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  let daysUntil = 0;
  let finalDate = "";
  if (dueDate && dueDate !== "") {
    const dueDateObject = DateTime.fromISO(dueDate);
    const today = DateTime.local().startOf("day");
    const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
    daysUntil = Math.ceil(diffDays);

    finalDate = DateTime.fromISO(dueDate)
      .setZone((authUser?.timeZone.trim()) || "America/New_York")
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
                  className={`${
                    descriptionExpanded ? "line-clamp-none" : "line-clamp-2"
                  } text-md pr-8 text-slate-700 dark:text-slate-300`}
                >
                  {strippedDescription}
                </p>
                <p>
                  {descriptionExpanded ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDescriptionExpanded(false);
                      }}
                      className="text-sm text-sky-700 dark:text-sky-500"
                    >
                      See Less
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDescriptionExpanded(true);
                      }}
                      className="text-sm text-sky-700 dark:text-sky-500"
                    >
                      See More
                    </button>
                  )}
                </p>
              </>
            )}
        </CardContent>
      </Card>
    </Link>
  );
}
