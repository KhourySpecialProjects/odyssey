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
