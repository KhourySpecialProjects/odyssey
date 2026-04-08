import { PlaylistCard } from "@/components/playlists/playlist-card";
import { Voyage, VoyagePlaylist } from "@/types";

interface VoyageCardProps {
  voyage: Voyage;
}

/**
 * Renders a voyage using the PlaylistCard component for consistent styling.
 * Maps voyage data into the playlist card format.
 */
export function VoyageCard({ voyage }: VoyageCardProps) {
  const playlistCount = voyage.voyage_playlists?.length ?? 0;
  const dropletCount =
    voyage.voyage_playlists?.reduce(
      (acc: number, vp: VoyagePlaylist) =>
        acc + (vp.playlist?.droplets?.length ?? 0),
      0,
    ) ?? 0;

  return (
    <PlaylistCard
      playlist={{
        id: voyage.id,
        name: voyage.name,
        slug: voyage.slug,
        description: voyage.description,
        droplets: [],
        duration: "medium",
        isPublic: true,
      }}
      linkPrefix="/v"
      statsOverride={`${playlistCount} ${playlistCount === 1 ? "playlist" : "playlists"} · ${dropletCount} ${dropletCount === 1 ? "droplet" : "droplets"}`}
    />
  );
}
