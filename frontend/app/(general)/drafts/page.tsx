import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentCreator } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import AccessRequestBanner from "@/components/access-request-banner";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create",
  description: "Share your experience to the other users on Odyssey.",
};

export default async function CreateRoute() {
  const user = await getCurrentUser();
  if (!user || !user.email || !isContentCreator(user.roles))
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
  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Drafts
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          Create a new Droplet draft or edit an existing one.
        </p>
      </div>

      <div className="w-full max-w-5xl px-4 mx-auto mb-8 xl:p-0 s">
        <div className="w-full flex justify-between items-end">
          <h2 className="text-lg">Your Drafts</h2>
          <Link href="/new/droplet">
            <Button after={<PlusIcon />} className="select-none" size="sm">
              New
            </Button>
          </Link>
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
      </div>
    </>
  );
}
