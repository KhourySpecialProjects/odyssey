"use client";

import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import Link from "next/link";

import { StarRating } from "@/components/ui/rating-stars";
import { getDropletAverageRating } from "@/lib/requests/enrollment";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { archiveDroplet } from "@/lib/actions";
import { Archive, ArchiveRestore, Clock } from "lucide-react";
import { getDueDateBadgeColor } from "@/lib/utils";
import { DateTime } from "luxon";

interface DropletTileProps {
  droplet: Droplet;
  isEnrolled?: boolean;
  completedLessonIds?: number[];
  profilePage?: boolean;
  compact?: boolean;
  isArchived?: boolean;
  dueDate?: string;
}

export function DropletTile({
  droplet,
  isEnrolled = false,
  completedLessonIds = [],
  profilePage,
  compact,
  isArchived,
  dueDate,
}: DropletTileProps) {
  const [averageRating, setAverageRating] = useState<number>(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const dropletLessonIds = droplet.lessons?.map((l) => l.id) || [];
  const completedLessonsInDroplet = completedLessonIds.filter((id) =>
    dropletLessonIds.includes(id),
  );
  const completionPercentage =
    dropletLessonIds.length > 0
      ? Math.round(
          (completedLessonsInDroplet.length / dropletLessonIds.length) * 100,
        )
      : 0;

  let daysUntil = 0;
  if (dueDate && dueDate !== "") {
    const dueDateObject = DateTime.fromISO(dueDate);
    const today = DateTime.local().startOf("day");
    const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
    daysUntil = Math.ceil(diffDays);
  }

  useEffect(() => {
    const fetchRating = async () => {
      const rating = await getDropletAverageRating(droplet);
      setAverageRating(rating);
    };

    fetchRating();
  }, [droplet]);

  const getCompletionBadgeColor = () => {
    if (completionPercentage === 0)
      return "bg-red-100 text-red-800 border-red-200";
    if (completionPercentage < 100)
      return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  async function changeVisibility() {
    try {
      const result = await archiveDroplet(droplet, isArchived ? false : true);
      if (result.success) {
        toast.success(
          isArchived
            ? `${droplet.name} is now unarchived!`
            : `${droplet.name} is now archived!`,
        );
      } else {
        toast.error("Failed to update droplet visibility");
      }
    } catch (error) {
      toast.error("An error occurred while updating the droplet");
      console.error(error);
    }
  }

  if (compact) {
    return (
      <li className="rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:bg-slate-800">
        <Link
          className="relative inline-flex h-full w-full p-2"
          href={`/d/${droplet.slug}`}
        >
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-center text-sm font-medium text-slate-900 dark:text-white">
              {droplet.name}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  if (profilePage) {
    return (
      <li className="rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <Link
          className="relative inline-flex h-full w-full p-6"
          href={
            (droplet.status == "draft" ? `/draft` : "") + `/d/${droplet.slug}`
          }
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <span className="text-3lg block text-center font-black text-slate-950 dark:text-slate-300">
              {droplet.name}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <Link
      href={(droplet.status == "draft" ? `/draft` : "") + `/d/${droplet.slug}`}
    >
      <li className="h-full rounded-md border border-slate-200 bg-slate-50 p-2 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <Button
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            changeVisibility();
          }}
          className={`${isArchived === true || isArchived === false ? "visibility: visible" : "visibility: hidden"} bg-white hover:bg-slate-300 dark:bg-slate-300`}
        >
          <div className="group relative">
            {isArchived ? (
              <ArchiveRestore className="text-purple-800" />
            ) : (
              <Archive className="text-purple-800" />
            )}
            <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              {isArchived ? "Unarchive" : "Archive"}
            </span>
          </div>
        </Button>
        <div className="flex h-full flex-col justify-between gap-3 p-4">
          <div className="space-y-3">
            <div className="flex flex-0 flex-row flex-wrap gap-1.5">
              {droplet.status == "draft" ? (
                <Badge variant="destructive">Draft</Badge>
              ) : null}

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
                      return `Due in ${daysUntil} days`;
                    } else {
                      return "Late!";
                    }
                  })()}
                </Badge>
              )}

              {isEnrolled && dropletLessonIds.length > 0 && (
                <Badge className={getCompletionBadgeColor()} variant="outline">
                  {completionPercentage}% Complete
                </Badge>
              )}

              <Badge className="pointer-events-none border-black bg-white text-black dark:bg-slate-300">
                {uppercaseFirstChar(droplet.focusArea)}
              </Badge>
              <Badge className="pointer-events-none border-black bg-white text-black dark:bg-slate-300">
                {uppercaseFirstChar(droplet.type)}
              </Badge>
              {droplet.tags?.map((tag) => (
                <Badge
                  key={tag.id}
                  className="pointer-events-none border-black bg-white text-black dark:bg-slate-300"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="flex flex-col justify-center gap-1">
              <span className="block w-full place-self-end text-3xl font-black text-slate-950 dark:text-slate-300">
                {droplet.name}
              </span>

              {droplet.description &&
                droplet.description.trim() !== "<p></p>" &&
                droplet.description.trim() !== "" && (
                  <>
                    <p
                      className={`${
                        descriptionExpanded ? "line-clamp-none" : "line-clamp-2"
                      } text-md font-black text-slate-700 dark:text-slate-300`}
                    >
                      {droplet.description}
                    </p>
                    <p>
                      {descriptionExpanded ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setDescriptionExpanded(false);
                          }}
                          className="text-sm text-sky-700 dark:text-slate-300"
                        >
                          See Less
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setDescriptionExpanded(true);
                          }}
                          className="text-sm text-sky-700 dark:text-slate-300"
                        >
                          See More
                        </button>
                      )}
                    </p>
                  </>
                )}
            </div>
          </div>

          {averageRating != 0 ? (
            <div className="flex w-full origin-left scale-[0.55] items-start">
              <StarRating
                value={averageRating}
                enrollmentID={""}
                average={true}
                uniqueId={droplet.id.toString()}
              />
            </div>
          ) : null}
        </div>
      </li>
    </Link>
  );
}
