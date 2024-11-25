import Link from "next/link";
import { Playlist } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaylistCardProps {
  playlist: Playlist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Link href={`/p/${playlist.slug}`}>
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle>{playlist.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {playlist.droplets?.length || 0} droplets
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
} 