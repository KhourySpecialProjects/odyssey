import { AccessManager } from "@/components/shared/access-manager/access-manager";
import { Reports } from "@/components/admin/reports/reports";
import { Session } from "@/components/shared/session";
import { AdminSelector } from "@/components/shared/selector";
import { AuthorizedUsers } from "@/components/admin/users/authorized-users";
import { StudentProgress } from "@/components/admin/progress/student-progress";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { fetchDroplets } from "@/lib/requests/data";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { Droplets } from "@/components/admin/droplets/droplets";
import { Playlists } from "@/components/admin/playlists/playlists";

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

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Admin
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          View Odyssey statistics and edit existing information.
        </p>
      </div>
        <h2 className="text-lg mb-2 mt-4">Statistics</h2>
        <Separator orientation="horizontal" className="mt-2 mb-4" />
      <CardContent className="flex flex-col items-start gap-x-8 text-center gap-y-6 sm:flex-row">
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium">
                Number of Users
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {authorizedUsers.length}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium">Number of Total Droplets</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {droplets.length}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium">Number of Enrollments</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {totalEnrollments}
              </div>
            </div>
          </div>
        </CardContent>
        <Separator orientation="horizontal" className="mt-2 mb-4" />
      <Session />
      <AdminSelector
        content={{
          "Users": <AuthorizedUsers />,
          "Droplets": <Droplets />,
          "Playlists": <Playlists />,
          "Access Manager": <AccessManager user={user} />,
          Reports: <Reports />,
        }}
      />
    </div>
  );
}
