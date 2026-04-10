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

  if (!authUser) return notFound();

  return (
    <div className="bg-white px-4 pt-4 pb-8 md:px-[300px] md:pt-8 md:pb-16 dark:bg-zinc-950">
      <div className="flex w-full flex-col">
        <h1 className="mb-7 text-4xl font-semibold text-black dark:text-white">
          Create a Playlist
        </h1>
        <PlaylistForm
          userId={authUser.id}
          droplets={droplets}
          author={authUser}
        />
      </div>
    </div>
  );
}
