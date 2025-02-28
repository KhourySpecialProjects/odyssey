import { CreatePlaylist } from "./create-playlist";
import { getPlaylists } from "@/lib/requests/playlist";
import { PlaylistClient } from "./playlist-client";

export async function Playlists() {
  const playlists = await getPlaylists({
    filters: {},
    populate: {
      droplets: {
        populate: {
          lessons: {
            fields: ["id", "name", "slug"],
          },
        },
      },
      authors: {
        fields: ["id", "name"],
      },
    },
  });

  return (
    <section>
      <h1 className="font-bold dark:text-slate-300">Playlists</h1>
      <p className="dark:text-slate-300">
        The following playlists have been created.
      </p>

      <div className="mt-4">
        <CreatePlaylist />
      </div>

      <PlaylistClient playlists={playlists}></PlaylistClient>
    </section>
  );
}
