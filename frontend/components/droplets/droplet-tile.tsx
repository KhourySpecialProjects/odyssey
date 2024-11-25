import { Badge } from "@/components/ui/badge";
import { cn, uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import Link from "next/link";

interface DropletTileProps {
  droplet: Droplet;
  isEnrolled?: boolean;
  completedLessonIds?: number[];
}

export function DropletTile({ 
  droplet, 
  isEnrolled = false,
  completedLessonIds = [] 
}: DropletTileProps) {

  const totalLessons = droplet.lessons?.length ?? 0;
  const completedLessons = droplet.lessons?.filter(lesson => 
    completedLessonIds.includes(lesson.id)
  ).length || 0;
  
  const getBackgroundColor = () => {
    if (!isEnrolled) return "bg-slate-50"; // Default gray
    if (completedLessons === 0) return "bg-red-50"; // No lessons completed
    if (completedLessons < totalLessons) return "bg-amber-50"; // Some lessons completed
    return "bg-emerald-50"; // All lessons completed
  };

  const getBorderColor = () => {
    if (!isEnrolled) return "border-slate-200 hover:border-slate-300";
    if (completedLessons === 0) return "border-red-200 hover:border-red-300";
    if (completedLessons < totalLessons) return "border-amber-200 hover:border-amber-300";
    return "border-emerald-200 hover:border-emerald-300";
  };

  return (
    <li className={cn(
      "transition-colors border rounded-md",
      getBackgroundColor(),
      getBorderColor()
    )}>
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
        </div>
      </Link>
    </li>
  );
}
