import { getPlaylists } from "@/lib/requests/playlist";
import { PlaylistsPageClient } from "./playlists-page-client";

export async function PlaylistsPage() {
  const playlists = await getPlaylists({
    sort: ["name:asc"],
    filters: {},
    pagination: { pageSize: 250, page: 1 },
    populate: {
      droplets: {
        populate: {
          lessons: {
            fields: ["id"],
          },
        },
      },
      groups: {
        fields: ["id"],
      },
    },
    fields: ["id", "name", "slug", "isPublic", "duration"],
  });

  return <PlaylistsPageClient playlists={playlists} />;
}
