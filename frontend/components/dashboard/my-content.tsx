import { getCurrentUser } from "@/lib/auth/session";
import { ContentSelector } from "./content-selector";
import { EnrolledDropletsGrid } from "./enrolled-droplets-grid";
import { UserPlaylistsGrid } from "./user-playlists-grid";
import { ArchivedDropletsGrid } from "./archived-droplets-grid";

export async function MyContent({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const tab = (await searchParams)?.tab || "droplets";
  const user = await getCurrentUser();

  if (!user?.email) return null;

  return (
    <div className="w-full">
      <ContentSelector user={user} />
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
