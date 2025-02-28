import { Droplet } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { uppercaseFirstChar } from "@/lib/utils";

interface GroupDropletTileProps {
  droplet: Droplet;
}

export function GroupDropletTile({ droplet }: GroupDropletTileProps) {
  return (
    <Link href={`/d/${droplet.slug}`} className="block h-full">
      <Card className="hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-800 border rounded-md border-slate-200 dark:border-slate-500 hover:border-slate-300 h-full">
        <CardHeader className="h-full flex flex-col">
          <div className="flex gap-2 mb-2">
            <Badge
              variant="default"
              className="text-xs bg-white dark:bg-slate-300 text-black border-black pointer-events-none"
            >
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge
              variant="secondary"
              className="text-xs bg-white dark:bg-slate-300 text-black border-black pointer-events-none"
            >
              {uppercaseFirstChar(droplet.type)}
            </Badge>
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
