import { Suspense } from "react";
import { AccessManager } from "@/components/shared/access-manager/access-manager";
import { AdminSelector } from "@/components/shared/selector";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserFaculty } from "@/lib/utils";
import { AuthorizedUsers } from "@/components/admin/users/authorized-users";
import { Droplets } from "@/components/admin/droplets/droplets";
import { Playlists } from "@/components/admin/playlists/playlists";
import { Reports } from "@/components/admin/reports/reports";
import { Groups } from "@/components/admin/groups/groups";
import { Loader2 } from "lucide-react";

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}

export default async function Page() {
  const user = await getCurrentUser();

  if (!user || !isAuthorizedUserFaculty(user.roles)) return notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Faculty
        </h1>
      </div>
      {/* <Session /> */}
      <AdminSelector
        content={{
          Users: (
            <Suspense fallback={<TabFallback />}>
              <AuthorizedUsers />
            </Suspense>
          ),
          Droplets: (
            <Suspense fallback={<TabFallback />}>
              <Droplets />
            </Suspense>
          ),
          Playlists: (
            <Suspense fallback={<TabFallback />}>
              <Playlists />
            </Suspense>
          ),
          Groups: (
            <Suspense fallback={<TabFallback />}>
              <Groups />
            </Suspense>
          ),
          "Access Manager": (
            <Suspense fallback={<TabFallback />}>
              <AccessManager user={user} />
            </Suspense>
          ),
          Reports: (
            <Suspense fallback={<TabFallback />}>
              <Reports />
            </Suspense>
          ),
        }}
      />
    </div>
  );
}
