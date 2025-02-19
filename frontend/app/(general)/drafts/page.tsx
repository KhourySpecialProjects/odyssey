import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentCreator, isAuthorizedUserAdmin } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { getDraftDroplets } from "@/lib/requests/droplet";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Separator } from "@/components/ui/separator";
import { Metadata } from "next";
import { getPlaylistsByAuthor } from "@/lib/requests/playlist";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { ShieldAlertIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Create",
  description: "Share your experience to the other users on Odyssey.",
};

export default async function CreateRoute() {
  //get the current user's drafts
  const user = await getCurrentUser();
  if (
    !user ||
    !user.email ||
    (!isAuthorizedUserAdmin(user.roles) && !isContentCreator(user.roles))
  )
    redirect("/unauthorized");
  const author = await getAuthorByAuthorizedUserEmail(user.email, {
    populate: {
      droplets: {
        fields: ["*"],
        filters: { status: { $eq: "draft" } },
        populate: { tags: { fields: ["*"] } },
      },
    },
  });
  if (!author) return redirect("/unauthorized");

  //get the current user's playlists
  const playlists = await getPlaylistsByAuthor(author.id);

  //get all draft droplets
  let allDroplets: Awaited<ReturnType<typeof getDraftDroplets>> = [];
  if (isAuthorizedUserAdmin(user.roles)) {
    allDroplets = await getDraftDroplets();
  }

  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Drafts
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          Create a new Droplet or Playlist draft or edit an existing one.
        </p>
      </div>

      <div className="w-full max-w-5xl px-4 mx-auto mb-8 xl:p-0 s">
        <div className="w-full flex justify-between items-end">
          <h2 className="text-lg">Your Droplet Drafts</h2>
          <div className="flex items-center gap-2">
            <Link href="/new/droplet">
              <Button after={<PlusIcon />} className="select-none" size="sm">
                New Droplet
              </Button>
            </Link>
            <Link href="/new/playlist">
              <Button after={<PlusIcon />} className="select-none" size="sm">
                New Playlist
              </Button>
            </Link>
          </div>
        </div>
        <Separator orientation="horizontal" className="mt-2 mb-4" />
        {!author.droplets || author.droplets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg text-slate-500">No drafts found.</p>
          </div>
        ) : (
          <Suspense fallback={<DropletsSkeleton />}>
            <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {author.droplets.map((droplet) => (
                <DropletTile key={droplet.id} droplet={droplet} />
              ))}
            </ul>
          </Suspense>
        )}
        {isContentCreator(user.roles) && (
          <>
            <h2 className="text-lg mb-2 mt-4">Your Playlists</h2>
            <Separator orientation="horizontal" className="mt-2 mb-4" />
            <Suspense fallback={<DropletsSkeleton />}>
              <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    completedLessonIds={[]}
                    toDraft={true}
                  />
                ))}
              </ul>
            </Suspense>
          </>
        )}
        {isAuthorizedUserAdmin(user.roles) && (
          <>
            <h2 className="text-2xl pt-10 text-center font-bold flex items-center justify-center">
              <ShieldAlertIcon className="mr-2 text-red-500" /> Admin Access{" "}
              <ShieldAlertIcon className="ml-2 text-red-500" />
            </h2>
            <Separator
              orientation="horizontal"
              className="mt-2 mb-2 bg-red-300"
            />
            <h2 className="text-lg mb-2 mt-2">All Droplet Drafts</h2>
            <Separator orientation="horizontal" className="mt-2 mb-4" />
            <Suspense fallback={<DropletsSkeleton />}>
              <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allDroplets.map((droplet) => (
                  <DropletTile key={droplet.id} droplet={droplet} />
                ))}
              </ul>
            </Suspense>
          </>
        )}
      </div>
    </>
  );
}
