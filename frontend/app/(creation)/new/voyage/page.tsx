import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isAuthorizedUserAdmin, isAuthorizedUserFaculty } from "@/lib/utils";
import { getPlaylists } from "@/lib/requests/playlist";
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

  const [authUser, publicPlaylists] = await Promise.all([
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
  ]);

  if (!authUser) {
    redirect("/explore");
  }

  return (
    <div className="bg-white px-4 pt-4 pb-8 md:px-16 md:pt-8 md:pb-16 lg:px-24 dark:bg-zinc-950">
      <div className="flex w-full flex-col">
        <h1 className="mb-7 text-4xl font-semibold text-black dark:text-white">
          Create a Voyage
        </h1>
        <VoyageForm playlists={publicPlaylists} authorId={authUser.id} />
      </div>
    </div>
  );
}
