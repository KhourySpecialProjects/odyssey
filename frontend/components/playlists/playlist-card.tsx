import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

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
}

export function PlaylistCard({
  playlist,
  completedLessonIds,
  toDraft = false,
}: PlaylistCardProps) {
  const linkTo = toDraft ? `/draft/p/${playlist.slug}` : `/p/${playlist.slug}`;
  return (
    <Link href={linkTo}>
      <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500">
        <CardHeader>
          <CardTitle className="text-black dark:text-slate-300">
            {playlist.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-black dark:text-slate-300">
            {playlist.droplets?.length || 0} droplets
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}
