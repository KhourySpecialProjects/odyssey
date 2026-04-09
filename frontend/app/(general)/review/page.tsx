import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isAuthorizedUserAdmin, isContentEditor } from "@/lib/utils";
import { redirect } from "next/navigation";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Metadata } from "next";
import { getInReviewDroplets } from "@/lib/requests/droplet";
import { EmptyState } from "@/components/ui/empty-state";
import { IconClipboardList } from "@tabler/icons-react";

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
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-[56px] md:py-8">
        <div className="mb-6">
          <h1 className="text-4xl leading-tight font-semibold text-black dark:text-white">
            To Review
          </h1>
          <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
            Look over draft droplets that have been submitted for review.
          </p>
        </div>

        {!drafts || drafts.length === 0 ? (
          <EmptyState
            icon={
              <IconClipboardList
                className="h-7 w-7 text-[#475569] dark:text-slate-400"
                stroke={1.5}
              />
            }
            title="Nothing to review"
            message="No draft droplets are currently submitted for review."
          />
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
