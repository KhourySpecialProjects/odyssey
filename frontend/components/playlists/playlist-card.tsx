import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getDueDateBadgeColor } from "@/lib/utils";
import { Clock } from "lucide-react";
import { Badge } from "../ui/badge";

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
  completedLessonIds: number[];
  toDraft?: boolean;
  dueDate?: string;
}

export function PlaylistCard({
  playlist,
  completedLessonIds,
  toDraft = false,
  dueDate,

}: PlaylistCardProps) {
  const linkTo = toDraft ? `/draft/p/${playlist.slug}` : `/p/${playlist.slug}`;

  let daysUntil = 0;
  if (dueDate && dueDate !== "") {
    const dueDateObject = new Date(dueDate);
    const today = new Date();
    const diffTime = dueDateObject.getTime() - today.getTime();
    daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log("daysUntil", daysUntil);
  }

  return (
    // <Link href={`/p/${playlist.slug}`}>
    <Link href={linkTo}>
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
        <div className="pt-4">
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
          <CardTitle>{playlist.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {playlist.droplets?.length || 0} droplets
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}
