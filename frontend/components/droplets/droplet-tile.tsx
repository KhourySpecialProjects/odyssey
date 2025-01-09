import { Badge } from "@/components/ui/badge";
import { cn, uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import Link from "next/link";


import { StarRating } from "@/components/ui/rating-stars";
import { getDropletAverageRating }  from "@/lib/requests/enrollment";

interface DropletTileProps {
  droplet: Droplet;
  isEnrolled?: boolean;
  completedLessonIds?: number[];
}


export async function DropletTile({
  droplet,
  isEnrolled = false,
  completedLessonIds = [],
}: DropletTileProps) {
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

  const getCompletionBadgeColor = () => {
    if (completionPercentage === 0)
      return "bg-red-100 text-red-800 border-red-200";
    if (completionPercentage < 100)
      return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

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
        
          <div className="flex items-start w-full scale-[0.55] origin-left">
            <StarRating value={await getDropletAverageRating(droplet)} enrollmentID={""} average={true} />
          </div>
          
        </div>
      </Link>
    </li>
  );
}
