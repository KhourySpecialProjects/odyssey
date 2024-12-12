import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { ContentSelector } from "./content-selector";
import { EnrolledDropletsGrid } from "./enrolled-droplets-grid";
import { UserPlaylistsGrid } from "./user-playlists-grid";

export async function MyContent({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const tab = searchParams?.tab || "droplets";
  const user = await getCurrentUser();

  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email);

  return (
    <div className="w-full">
      <ContentSelector />
      <div className="mt-6">
        {tab === "droplets" ? <EnrolledDropletsGrid /> : <UserPlaylistsGrid />}
      </div>
    </div>
  );
}
