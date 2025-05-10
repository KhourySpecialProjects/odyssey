import { AccessManager } from "@/components/shared/access-manager/access-manager";
import { Reports } from "@/components/admin/reports/reports";
import { AdminSelector } from "@/components/shared/selector";
import { AuthorizedUsers } from "@/components/admin/users/authorized-users";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { fetchDroplets } from "@/lib/requests/data";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { Droplets } from "@/components/admin/droplets/droplets";
import { Groups } from "@/components/admin/groups/groups";
import { Playlists } from "@/components/admin/playlists/playlists";
import { ComponentDropdown } from "@/components/shared/component-dropdown";
import { LineChartIcon } from "lucide-react";

export default async function Page() {
  const user = await getCurrentUser();
  const authorizedUsers = await fetchAuthorizedUsers();
  const droplets = await fetchDroplets();
  let totalEnrollments = 0;
  for (const user of authorizedUsers) {
    const enrollments = await getEnrollmentsByAuthorizedUser(user.id);
    totalEnrollments += enrollments.length;
  }
  if (!user || !isAuthorizedUserAdmin(user.roles)) return notFound();

  const pageContent = {
    Users: <AuthorizedUsers />,
    Droplets: <Droplets />,
    Playlists: <Playlists />,
    Groups: <Groups />,
    "Access Manager": <AccessManager user={user} />,
    Reports: <Reports />,
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="light:text-slate-900 text-3xl font-bold tracking-tight sm:text-4xl">
          Admin
        </h1>
        <p className="light:text-slate-600 mt-4 text-lg leading-normal text-balance">
          View Odyssey statistics and edit existing information.
        </p>
      </div>
      <div className="flex w-full flex-col items-center">
        <h2 className="mt-4 mb-2 flex gap-2 text-lg dark:text-slate-300">
          Statistics <LineChartIcon className="inline" />
        </h2>
        <Separator orientation="horizontal" className="mt-2 mb-4" />
        <CardContent className="flex flex-col items-center gap-x-8 gap-y-6 text-center sm:flex-row">
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium dark:text-slate-300">
                Number of Users
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {authorizedUsers.length}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium dark:text-slate-300">
                Number of Total Droplets
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {droplets.length}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium dark:text-slate-300">
                Number of Enrollments
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {totalEnrollments}
              </div>
            </div>
          </div>
        </CardContent>
        <Separator orientation="horizontal" className="mt-2 mb-4" />
      </div>

      {/* <Session /> */}
      <div className="hidden p-4 sm:flex sm:flex-col">
        <AdminSelector content={pageContent} />
      </div>

      <div className="flex flex-col p-4 sm:hidden">
        <ComponentDropdown content={pageContent} />
      </div>
    </div>
  );
}
