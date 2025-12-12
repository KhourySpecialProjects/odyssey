import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isAuthorizedUserAdmin, isContentEditor } from "@/lib/utils";
import { redirect } from "next/navigation";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Separator } from "@/components/ui/separator";
import { Metadata } from "next";
import { getInReviewDroplets } from "@/lib/requests/droplet";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";

export const metadata: Metadata = {
  title: "Review",
  description: "Review draft droplets in Odyssey.",
};

export default async function CreateRoute() {
  const user = await getCurrentUser();
  if (
    !user ||
    !user.email ||
    (!isAuthorizedUserAdmin(user.roles) && !isContentEditor(user.roles))
  )
    redirect("/unauthorized");

  const drafts = await getInReviewDroplets();

  return (
    <>
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="light:text-slate-900 text-3xl font-bold tracking-tight sm:text-4xl">
          To Review
        </h1>
        <p className="light:text-slate-600 mt-4 text-balance text-lg leading-normal dark:text-slate-300">
          Look over draft droplets that have been submitted for review.
        </p>
      </div>

      <div className="s mx-auto mb-8 w-full max-w-5xl px-4 xl:p-0">
        <Separator orientation="horizontal" className="mb-4 mt-2" />
        {!drafts || drafts.length === 0 ? (
          <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
            <MessageHeader
              subtitle="No Results"
              title="No Droplets In Review"
            />
            <MessageDescription>
              No draft droplets are currently submitted for review.
            </MessageDescription>
          </Message>
        ) : (
          <Suspense fallback={<DropletsSkeleton />}>
            <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {drafts.map((droplet) => (
                <DropletTile key={droplet.id} droplet={droplet} />
              ))}
            </ul>
          </Suspense>
        )}
      </div>
    </>
  );
}
