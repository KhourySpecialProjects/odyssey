import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin, isContentCreator } from "@/lib/utils";
import { getDroplets } from "@/lib/requests/droplet";
import { PlaylistForm } from "@/components/playlists/playlist-form";
import { getCachedUser } from "@/lib/requests/cached";
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

  const p = await params;
  const [authUser, playlist] = await Promise.all([
    getCachedUser(user.email),
    getPlaylistBySlug(p.slug, {
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
    }),
  ]);

  if (
    !playlist ||
    (!isAuthorizedUserAdmin(user.roles) &&
      !playlist.authors?.some((author) => author.id === authUser?.id))
  ) {
    return notFound();
  }

  if (!authUser) return notFound();

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
    <div className="bg-white px-4 pt-4 pb-8 md:px-[300px] md:pt-8 md:pb-16 dark:bg-zinc-950">
      <div className="flex w-full flex-col">
        <h1 className="mb-7 text-4xl font-semibold text-black dark:text-white">
          Edit Playlist
        </h1>
        <PlaylistForm
          userId={authUser.id}
          droplets={availableDroplets}
          author={authUser}
          existingPlaylist={playlist}
        />
      </div>
    </div>
  );
}
