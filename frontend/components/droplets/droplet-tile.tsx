"use client";

import { Badge } from "@/components/ui/badge";
import { cn, uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import Link from "next/link";

import { StarRating } from "@/components/ui/rating-stars";
import { getDropletAverageRating } from "@/lib/requests/enrollment";
import { useEffect, useState } from "react";

interface DropletTileProps {
  droplet: Droplet;
  isEnrolled?: boolean;
  completedLessonIds?: number[];
  profilePage?: boolean;
  compact?: boolean;
}

export function DropletTile({
  droplet,
  isEnrolled = false,
  completedLessonIds = [],
  profilePage,
  compact
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

  if (compact) {
    return (
      <li className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50">
        <Link
          className="relative inline-flex w-full h-full p-2"
          href={`/d/${droplet.slug}`}
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-900">
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
    <li className="transition-colors border rounded-md border-slate-200 hover:border-slate-300 bg-slate-50">
      <Link
        className="relative inline-flex w-full h-full p-6"
        href={
          (droplet.status == "draft" ? `/draft` : "") + `/d/${droplet.slug}`
        }
      >
        <div className="flex flex-col justify-end gap-3">
          <div className="flex flex-row flex-wrap flex-0 gap-1.5">
            {droplet.status == "draft" ? (
              <Badge variant="destructive">Draft</Badge>
            ) : null}

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
