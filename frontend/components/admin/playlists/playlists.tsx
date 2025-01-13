import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { PlaylistBlock } from "./playlist-block";
import { CreatePlaylist } from "./create-playlist";

export async function Playlists() {
  const authorizedUsers = await fetchAuthorizedUsers();

  return (
    <section>
      <h1 className="font-bold">Playlists</h1>
      <p>The following playlists have been created.</p>

      <div className="mt-4">
        <CreatePlaylist />
      </div>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {authorizedUsers.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {authorizedUsers.map((user) => (
              <PlaylistBlock user={user} key={user.id} />
            ))}
          </ul>
        ) : (
          <p>There are no authorized users.</p>
        )}
      </div>
    </section>
  );
}
