import { Droplet } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getDueDateBadgeColor, uppercaseFirstChar } from "@/lib/utils";
import { Clock } from "lucide-react";
import { DateTime } from "luxon";

interface GroupDropletTileProps {
  droplet: Droplet;
  dueDate: string;
}

export function GroupDropletTile({ droplet, dueDate }: GroupDropletTileProps) {
  let daysUntil = 0;
  if (dueDate && dueDate !== "") {
    const dueDateObject = DateTime.fromISO(dueDate);
    const today = DateTime.local().startOf('day');  // Set to start of day
    const diffDays = dueDateObject.startOf('day').diff(today, 'days').days;
    daysUntil = Math.ceil(diffDays);
    console.log("daysUntil", daysUntil);
  }

  const finalDate = DateTime.fromISO(dueDate).toFormat("MM/dd hh:mm a");

  return (
    <Link href={`/d/${droplet.slug}`}>
      <Card className="bg-slate-50 border-slate-200 hover:shadow-md transition-shadow h-full">
        <CardHeader className={`${dueDate && dueDate !== "" ? '' : ''} `}>
          <div className="flex flex-row gap-2 mb-2 items-center">
            <div className="h-1/2 flex flex-row w-2/3 space-x-1">
              <Badge variant="default" className="text-xs">
                {uppercaseFirstChar(droplet.focusArea)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {uppercaseFirstChar(droplet.type)}
              </Badge>
            </div>
            {dueDate && dueDate !== "" && (
              <div className="flex justify-end">
                <div
                  className={`text-sm whitespace-nowrap flex flex-row items-center rounded-md p-2 ${getDueDateBadgeColor(daysUntil, true)}`}
                >
                  <Clock size={15} className="mr-1" />
                  {daysUntil > 0
                    ? `Due ${finalDate}`
                    : "This Droplet is Late!"}
                </div>
              </div>
            )}
          </div>
          <CardTitle>{droplet.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {droplet.lessons?.length || 0} lessons
          </p>



        </CardHeader>

      </Card>
    </Link>
  );
}
