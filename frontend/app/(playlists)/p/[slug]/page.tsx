import { getPlaylistBySlug } from "@/lib/requests/playlist";
import { DropletsGrid } from "@/components/explore/droplets-grid";
import { notFound } from "next/navigation";
import { DropletTile } from "@/components/droplets/droplet-tile";

export default async function PlaylistPage({
  params,
}: {
  params: { slug: string };
}) {
  const playlist = await getPlaylistBySlug(params.slug);

  if (!playlist) {
    notFound();
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">{playlist.name}</h1>
      {playlist.droplets && playlist.droplets.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {playlist.droplets.map((droplet) => (
            <DropletTile key={droplet.id} droplet={droplet} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No droplets in this playlist yet.</p>
      )}
    </div>
  );
} 