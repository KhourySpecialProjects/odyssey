import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isContentCreator } from "@/lib/utils";
import { getDroplets } from "@/lib/requests/droplet";
import { PlaylistForm } from "@/components/playlists/playlist-form"

export default async function NewPlaylist() {
  const user = await getCurrentUser();
  if (!user || !isContentCreator(user.roles)) return redirect("/");
  
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
    <div className="flex flex-col min-h-screen w-full bg-slate-100 px-24 items-center pt-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-7">
        Create New Playlist
      </h1>
      <PlaylistForm droplets={droplets} author={user} />
    </div>
  );
}