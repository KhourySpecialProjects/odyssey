import { PlaylistBlock } from "./playlist-block";
import { CreatePlaylist } from "./create-playlist";
import { Playlist } from "@/types";
import { getPlaylists } from "@/lib/requests/playlist";

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
      author: {
        fields: ["id", "name"],
      },
    },
  });

  return (
    <section>
      <h1 className="font-bold">Playlists</h1>
      <p>The following playlists have been created.</p>

      <div className="mt-4">
        <CreatePlaylist />
      </div>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {playlists.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {playlists.map((p: Playlist) => (
              <PlaylistBlock playlist={p} key={p.id} />
            ))}
          </ul>
        ) : (
          <p>There are no created droplets.</p>
        )}
      </div>
    </section>
  );
}
