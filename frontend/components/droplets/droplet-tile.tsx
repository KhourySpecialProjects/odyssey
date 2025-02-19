"use client";

import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import Link from "next/link";

import { StarRating } from "@/components/ui/rating-stars";
import { getDropletAverageRating } from "@/lib/requests/enrollment";
import { startTransition, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { archiveDroplet } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Archive, Clock } from "lucide-react";
import { getDueDateBadgeColor } from "@/lib/utils";

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

  // Calculate completion percentage
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

  console.log("date is ", dueDate);

  let daysUntil = 0;
  if (dueDate && dueDate !== "") {
    const dueDateObject = new Date(dueDate);
    const today = new Date();
    const diffTime = dueDateObject.getTime() - today.getTime();
    daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log("daysUntil", daysUntil);
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

  const router = useRouter();

  async function changeVisibility() {
    try {
      const result = await archiveDroplet(droplet, isArchived ? false : true);
      if (result.success) {
        toast.success(
          isArchived
            ? `${droplet.name} is now unarchived!`
            : `${droplet.name} is now archived!`,
        );
        //router.push('/dashboard');
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
      <li className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50">
        <Link
          className="relative inline-flex w-full h-full p-2"
          href={`/d/${droplet.slug}`}
        >
          <div className="flex flex-col gap-1 justify-center items-center text-center">
            <span className="text-sm font-medium text-slate-900 text-center">
              {droplet.name}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  if (profilePage) {
    return (
      <li className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50">
        <Link
          className="relative inline-flex w-full h-full p-6"
          href={
            (droplet.status == "draft" ? `/draft` : "") + `/d/${droplet.slug}`
          }
        >
          <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
            <span className="block text-center text-3lg font-black text-slate-950">
              {droplet.name}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <li className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50 h-full">
      <Button
        size="sm"
        variant="outline"
        onClick={changeVisibility}
        className={`${isArchived === true || isArchived === false ? "visibility: visible" : "visibility: hidden"}`}
      >
        <div className="relative group">
          <Archive className="text-purple-800" />
          <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {isArchived ? "Unarchive" : "Archive"}
          </span>
        </div>
      </Button>
      <Link
        className="relative inline-flex w-full p-6"
        href={
          (droplet.status == "draft" ? `/draft` : "") + `/d/${droplet.slug}`
        }
      >
        <div className="flex flex-col justify-end gap-3">
          <div className="flex flex-row flex-wrap flex-0 gap-1.5">
            {droplet.status == "draft" ? (
              <Badge variant="destructive">Draft</Badge>
            ) : null}

            {dueDate && dueDate !== "" && (
              <Badge className={getDueDateBadgeColor(daysUntil, true)} variant="outline">
                <Clock size={15} className="mr-1" />
                {daysUntil > 0
                  ? `Due in ${daysUntil} ${daysUntil > 1 ? "days" : "day"}!`
                  : "This Droplet is Late!"
                }
              </Badge>
            )}

            {isEnrolled && dropletLessonIds.length > 0 && (
              <Badge className={getCompletionBadgeColor()} variant="outline">
                {completionPercentage}% Complete
              </Badge>
            )}



            <Badge variant="outline">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge variant="outline">{uppercaseFirstChar(droplet.type)}</Badge>
            {droplet.tags?.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>

          <span className="block w-full text-3xl font-black text-slate-950 place-self-end">
            {droplet.name}
          </span>

          {averageRating != 0 ? (
            <div className="flex items-start w-full scale-[0.55] origin-left">
              <StarRating
                value={averageRating}
                enrollmentID={""}
                average={true}
                uniqueId={droplet.id.toString()}
              />
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
