import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentCreator, isAuthorizedUserAdmin } from "@/lib/utils";
import { redirect } from "next/navigation";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Separator } from "@/components/ui/separator";
import { Metadata } from "next";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

export const metadata: Metadata = {
  title: "Create",
  description: "Share your experience to the other users on Odyssey.",
};

export default async function CreateRoute() {
  const user = await getCurrentUser();
  if (
    !user ||
    !user.email ||
    (!isAuthorizedUserAdmin(user.roles) && !isContentCreator(user.roles))
  )
    redirect("/unauthorized");
  const authorizedUser = await getAuthorizedUserByEmail(user.email);

  const playlists = authorizedUser.created_playlists;

  return (
    <>
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="light:text-slate-900 text-3xl font-bold tracking-tight sm:text-4xl">
          My Content
        </h1>
        <p className="light:text-slate-600 mt-4 text-lg leading-normal text-balance dark:text-slate-300">
          Create a new Droplet or Playlist draft or edit an existing one.
        </p>
      </div>

      <div className="s mx-auto mb-8 w-full max-w-7xl px-4 xl:p-0">
        <div className="flex w-full items-end justify-between">
          <h2 className="text-lg dark:text-slate-300">My Droplets</h2>
          <div className="flex items-center gap-2">
            <Link href="/new/droplet">
              <Button
                after={<PlusIcon />}
                className="select-none dark:bg-slate-300"
                size="sm"
              >
                New Droplet
              </Button>
            </Link>
          </div>
        </div>
        <Separator orientation="horizontal" className="mt-2 mb-4" />
        {!authorizedUser.droplets || authorizedUser.droplets.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="light:text-slate-500 text-lg dark:text-slate-400">
              No droplets found.
            </p>
          </div>
        ) : (
          <Suspense fallback={<DropletsSkeleton />}>
            <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {authorizedUser.droplets.map((droplet) => (
                <DropletTile key={droplet.id} droplet={droplet} />
              ))}
            </ul>
          </Suspense>
        )}
        {(isContentCreator(user.roles) ||
          isAuthorizedUserAdmin(user.roles)) && (
          <>
            <div className="s mx-auto w-full max-w-7xl px-4 xl:p-0">
              <div className="flex w-full items-end justify-between">
                <h2 className="mt-4 mb-2 text-lg dark:text-slate-300">
                  My Playlists
                </h2>
                <Link href="/new/playlist">
                  <Button
                    after={<PlusIcon />}
                    className="select-none dark:bg-slate-300"
                    size="sm"
                  >
                    New Playlist
                  </Button>
                </Link>
              </div>
            </div>
            <Separator orientation="horizontal" className="mt-2 mb-4" />
            {!playlists || playlists.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="light:text-slate-500 text-lg dark:text-slate-400">
                  No playlists found.
                </p>
              </div>
            ) : (
              <Suspense fallback={<DropletsSkeleton />}>
                <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {playlists?.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      toDraft={true}
                    />
                  ))}
                </ul>
              </Suspense>
            )}
          </>
        )}
      </div>
    </>
  );
}
