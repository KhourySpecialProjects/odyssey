import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getDueDateBadgeColor } from "@/lib/utils";
import { Clock } from "lucide-react";
import { Badge } from "../ui/badge";
import { DateTime } from "luxon";

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
      <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500 flex flex-col h-full">
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
          <CardTitle className="block w-full text-3xl font-black text-slate-950 place-self-end dark:text-slate-300">
            {playlist.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {playlist.droplets?.length === 1
              ? "1 droplet"
              : `${playlist.droplets?.length || 0} droplets`}
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}
