import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin, isContentCreator } from "@/lib/utils";
import { getDroplets } from "@/lib/requests/droplet";
import { PlaylistForm } from "@/components/playlists/playlist-form";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getPlaylistBySlug } from "@/lib/requests/playlist";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EditPlaylistPage({ params }: Props) {
  const user = await getCurrentUser();
  if (
    !user ||
    !user?.email ||
    (!isContentCreator(user.roles) && !isAuthorizedUserAdmin(user.roles))
  )
    return notFound();

  const authUser = await getAuthorizedUserByEmail(user.email);

  const p = await params;
  const playlist = await getPlaylistBySlug(p.slug, {
    populate: {
      droplets: {
        populate: {
          tags: true,
          lessons: {
            fields: ["id", "name", "slug"],
          },
          fields: [
            "id",
            "name",
            "slug",
            "type",
            "focusArea",
            "learningObjectives",
            "isHidden",
            "status",
          ],
        },
      },
      authors: {
        fields: ["id", "name"],
        populate: "*",
      },
    },
  });

  if (
    !playlist ||
    (!playlist.authors?.some((author) => author.id === authUser.id) &&
      !isAuthorizedUserAdmin(user.roles))
  ) {
    return notFound();
  }

  const allDroplets = await getDroplets({
    filters: {
      $and: [{ status: { $eq: "published" } }, { isHidden: false }],
    },
    populate: {
      lessons: {
        fields: ["id", "name", "slug"],
      },
    },
  });

  const availableDroplets = allDroplets.filter(
    (droplet) => !playlist.droplets?.some((pd) => pd.id === droplet.id),
  );

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-100 dark:bg-slate-800 px-24 items-center pt-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-7">
        Edit Playlist
      </h1>
      <PlaylistForm
        userId={authUser.id}
        droplets={availableDroplets}
        author={authUser}
        existingPlaylist={playlist}
      />
    </div>
  );
}
