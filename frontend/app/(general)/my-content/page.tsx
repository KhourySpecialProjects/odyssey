import { getCurrentUser } from "@/lib/auth/session";
import {
  isContentCreator,
  isAuthorizedUserAdmin,
  isAuthorizedUserFaculty,
} from "@/lib/utils";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCachedUserCreation } from "@/lib/requests/cached";
import { getVoyagesAdmin } from "@/lib/requests/voyage";
import { MyContentTabs } from "@/components/my-content/my-content-tabs";

export const metadata: Metadata = {
  title: "Create",
  description: "Share your experience to the other users on Odyssey.",
};

export default async function CreateRoute() {
  const user = await getCurrentUser();
  if (
    !user ||
    !user.email ||
    (!isAuthorizedUserAdmin(user.roles) &&
      !isContentCreator(user.roles) &&
      !isAuthorizedUserFaculty(user.roles))
  )
    redirect("/unauthorized");
  const isAdminOrFaculty =
    isAuthorizedUserAdmin(user.roles) || isAuthorizedUserFaculty(user.roles);

  const [authorizedUser, voyages] = await Promise.all([
    getCachedUserCreation(user.email),
    isAdminOrFaculty ? getVoyagesAdmin() : Promise.resolve([]),
  ]);

  if (!authorizedUser) redirect("/unauthorized");

  const playlists = authorizedUser.created_playlists;

  const showPlaylists =
    isContentCreator(user.roles) || isAuthorizedUserAdmin(user.roles);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <h1 className="text-4xl leading-tight font-semibold text-black dark:text-white">
          My Content
        </h1>
        <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
          Create a new Droplet, Playlist, or Voyage draft
        </p>
      </div>

      <MyContentTabs
        droplets={authorizedUser.droplets ?? []}
        playlists={playlists ?? []}
        voyages={voyages}
        showPlaylists={showPlaylists}
        showVoyages={isAdminOrFaculty}
      />
    </div>
  );
}
