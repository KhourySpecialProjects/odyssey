import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";
import { Playlist } from "@/types";
import { getPlaylists } from "@/lib/requests/playlist";

export async function PlaylistsGrid() {
  const playlists = await getPlaylists({});

  if (!playlists || playlists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No public playlists available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {playlists.map((playlist) => (
        <Link
          key={playlist.id}
          href={`/p/${playlist.slug}`}
          className="transition-transform hover:scale-105"
        >
          <Card className="transition-colors border rounded-md bg-slate-50 border-slate-200 hover:none">
            <CardHeader className="text-sm text-black">
              <CardTitle>{playlist.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                {playlist.droplets?.length || 0} droplets
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
} 