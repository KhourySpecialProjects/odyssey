import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin, isContentCreator } from "@/lib/utils";
import { getDroplets } from "@/lib/requests/droplet";
import { PlaylistForm } from "@/components/playlists/playlist-form";
import { getCachedUser } from "@/lib/requests/cached";

export default async function NewPlaylist() {
  const user = await getCurrentUser();
  if (
    !user ||
    !user?.email ||
    (!isContentCreator(user.roles) && !isAuthorizedUserAdmin(user.roles))
  )
    return notFound();
  const [authUser, droplets] = await Promise.all([
    getCachedUser(user.email),
    getDroplets({
      filters: {
        $and: [{ status: { $eq: "published" } }, { isHidden: false }],
      },
      populate: {
        lessons: {
          fields: ["id", "name", "slug"],
        },
      },
    }),
  ]);

  return (
    <div className="light:bg-slate-100 flex min-h-screen w-full flex-col items-center px-4 pt-12 md:px-24">
      <h1 className="mb-7 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        Create New Playlist
      </h1>
      <PlaylistForm
        userId={authUser.id}
        droplets={droplets}
        author={authUser}
      />
    </div>
  );
}
