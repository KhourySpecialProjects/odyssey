import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isAuthorizedUserAdmin, isAuthorizedUserFaculty } from "@/lib/utils";
import { getPlaylists } from "@/lib/requests/playlist";
import { getDroplets } from "@/lib/requests/droplet";
import { VoyageForm } from "@/components/voyages/voyage-form";
import { getCachedUser } from "@/lib/requests/cached";

export default async function NewVoyage() {
  const user = await getCurrentUser();

  if (
    !user ||
    !user?.email ||
    (!isAuthorizedUserFaculty(user.roles) && !isAuthorizedUserAdmin(user.roles))
  ) {
    redirect("/explore");
  }

  const [authUser, publicPlaylists, publishedDroplets] = await Promise.all([
    getCachedUser(user.email),
    getPlaylists({
      filters: { isPublic: true },
      populate: {
        droplets: {
          fields: ["id"],
        },
      },
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

  if (!authUser) {
    redirect("/explore");
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white px-4 pt-12 pb-16 md:px-12 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-[1600px]">
        <VoyageForm
          playlists={publicPlaylists}
          droplets={publishedDroplets}
          authorId={authUser.id}
        />
      </div>
    </div>
  );
}
