import { getCurrentUser } from "@/lib/auth/session";
import { ContentSelector } from "./content-selector";
import { EnrolledDropletsGrid } from "./enrolled-droplets-grid";
import { UserPlaylistsGrid } from "./user-playlists-grid";
import { ArchivedDropletsGrid } from "./archived-droplets-grid";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { notFound } from "next/navigation";

export async function MyContent({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const tab = (await searchParams)?.tab || "droplets";
  const user = await getCurrentUser();

  if (!user || !user.email) {
    return notFound();
  }

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  const allDroplets = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
  const allPlaylists = authorizedUser.playlists?.length || 0;
  const activeDroplets = allDroplets.filter((drop) => !drop.isArchived).length;
  const archivedDroplets = allDroplets.length - activeDroplets;

  return (
    <div className="w-full">
      <ContentSelector
        droplets={activeDroplets}
        playlists={allPlaylists}
        archived={archivedDroplets}
      />
      <div className="mt-6">
        {tab === "droplets" ? (
          <EnrolledDropletsGrid />
        ) : tab === "playlists" ? (
          <UserPlaylistsGrid />
        ) : (
          <ArchivedDropletsGrid />
        )}
      </div>
    </div>
  );
}
