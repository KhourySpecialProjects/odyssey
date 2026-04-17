import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin, isAuthorizedUserFaculty } from "@/lib/utils";
import { getPlaylists } from "@/lib/requests/playlist";
import { getDroplets } from "@/lib/requests/droplet";
import { getVoyageBySlug } from "@/lib/requests/voyage";
import { VoyageForm } from "@/components/voyages/voyage-form";
import { getCachedUser } from "@/lib/requests/cached";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditVoyagePage({ params }: Props) {
  const user = await getCurrentUser();
  if (
    !user?.email ||
    (!isAuthorizedUserFaculty(user.roles) && !isAuthorizedUserAdmin(user.roles))
  ) {
    return notFound();
  }

  const { slug } = await params;

  const [authUser, voyage, publicPlaylists, publishedDroplets] =
    await Promise.all([
      getCachedUser(user.email),
      getVoyageBySlug(slug, { includeDrafts: true }),
      getPlaylists({
        filters: { isPublic: true },
        populate: { droplets: { fields: ["id"] } },
        fields: ["id", "name", "slug"],
        sort: ["name:asc"],
      }),
      getDroplets({
        filters: { status: "published", isHidden: false },
        fields: ["id", "name", "slug"],
        populate: {},
        sort: ["name:asc"],
      }),
    ]);

  if (!authUser || !voyage) return notFound();

  return (
    <div className="flex min-h-screen w-full flex-col bg-white px-4 pt-12 pb-16 md:px-12 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-[1600px]">
        <VoyageForm
          playlists={publicPlaylists}
          droplets={publishedDroplets}
          authorId={authUser.id}
          voyage={voyage}
        />
      </div>
    </div>
  );
}
