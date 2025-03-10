import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin, isContentCreator } from "@/lib/utils";
import { getDroplets } from "@/lib/requests/droplet";
import { PlaylistForm } from "@/components/playlists/playlist-form";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

export default async function NewPlaylist() {
  const user = await getCurrentUser();
  if (
    !user ||
    !user?.email ||
    (!isContentCreator(user.roles) && !isAuthorizedUserAdmin(user.roles))
  )
    return notFound();
  const authUser = await getAuthorizedUserByEmail(user.email);

  //TODO: Fix logic here to get all droplets and get droplets in "current" playlist
  // so that this page can be used for creating a new playlist or editing a playlist.
  const droplets = await getDroplets({
    filters: {
      $and: [{ status: { $eq: "published" } }, { isHidden: false }],
    },
    populate: {
      lessons: {
        fields: ["id", "name", "slug"],
      },
    },
  });

  return (
    <div className="flex flex-col min-h-screen w-full light:bg-slate-100 px-24 items-center pt-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-7">
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
