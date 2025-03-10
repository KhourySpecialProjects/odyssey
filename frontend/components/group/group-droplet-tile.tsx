import { AuthorizedUser, Droplet } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getDueDateBadgeColor, uppercaseFirstChar } from "@/lib/utils";
import { Clock } from "lucide-react";
import { DateTime } from "luxon";

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
  let daysUntil = 0;
  let finalDate = "";
  if (dueDate && dueDate !== "") {
    const dueDateObject = DateTime.fromISO(dueDate);
    const today = DateTime.local().startOf("day"); // Set to start of day
    const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
    daysUntil = Math.ceil(diffDays);

    finalDate = DateTime.fromISO(dueDate)
    .setZone(authUser?.timeZone || "America/New_York")
    .toFormat("MM/dd hh:mm a");
  }

  

  return (
    <Link href={`/d/${droplet.slug}`}>
      <Card className="bg-slate-50 border-slate-200 hover:shadow-md transition-shadow h-full dark:bg-slate-800 dark:border-slate-500">
        <CardHeader className={`${dueDate && dueDate !== "" ? "" : ""} `}>
          <div className="flex flex-row gap-2 mb-2 items-center">
            <div className="h-1/2 flex flex-row w-2/3 space-x-1">
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
              <div className="flex justify-end w-2/3 ml-0">
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
                      return "This Droplet is Late!";
                    }
                  })()}
                </Badge>
              </div>
            )}
          </div>
          <CardTitle className="dark:text-slate-300">{droplet.name}</CardTitle>
          <p className="text-sm text-muted-foreground dark:text-slate-400">
            {droplet.lessons?.length || 0} lessons
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}
