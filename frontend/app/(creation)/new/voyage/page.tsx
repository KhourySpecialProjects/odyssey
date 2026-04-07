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
      filters: {
        $and: [{ isPublic: true }],
      },
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
    <div className="light:bg-slate-100 flex min-h-screen w-full flex-col items-center px-4 pt-12 md:px-12">
      <h1 className="mb-7 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        Create New Voyage
      </h1>
      <div className="w-full max-w-6xl">
        <VoyageForm playlists={publicPlaylists} authorId={authUser.id} />
      </div>
    </div>
  );
}
