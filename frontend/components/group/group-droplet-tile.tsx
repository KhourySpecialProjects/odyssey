import { Droplet } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getDueDateBadgeColor, uppercaseFirstChar } from "@/lib/utils";
import { Clock } from "lucide-react";

interface GroupDropletTileProps {
  droplet: Droplet;
  dueDate: string;
}

export function GroupDropletTile({ droplet, dueDate }: GroupDropletTileProps) {
  let daysUntil = 0;
  if (dueDate && dueDate !== "") {
    const dueDateObject = new Date(dueDate);
    const today = new Date();
    const diffTime = dueDateObject.getTime() - today.getTime();
    daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log("daysUntil", daysUntil);
  }

  // const getDueDateBadgeColor = (
  //   daysUntil: number,
  //   includeLate: boolean,
  // ) => {
  //   if (daysUntil > 14) {
  //     return "bg-emerald-200 text-emerald-800 border-emerald-500";
  //   } else if (daysUntil > 3) {
  //     return "bg-amber-200 text-amber-800 border-amber-500";
  //   } else if (daysUntil > 0) {
  //     return "bg-red-200 text-red-800 border-red-500";
  //   } else if (daysUntil <= 0 && includeLate) {
  //     return "bg-red-400 text-red-900 border-red-700";
  //   } 
  // };

  return (
    <Link href={`/d/${droplet.slug}`}>
      <Card className="bg-slate-50 border-slate-200 hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex gap-2 mb-2">
            <Badge variant="default" className="text-xs">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {uppercaseFirstChar(droplet.type)}
            </Badge>
            {dueDate && dueDate !== "" && (
              <Badge
                className={getDueDateBadgeColor(daysUntil, true)}
                variant="outline"
              >
                <Clock size={15} className="mr-1" />
                {daysUntil > 0
                  ? `Due in ${daysUntil} ${daysUntil > 1 ? "days" : "day"}!`
                  : "This Droplet is Late!"}
              </Badge>
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
