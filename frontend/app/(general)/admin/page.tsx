import { AccessManager } from "@/components/shared/access-manager/access-manager";
import { Reports } from "@/components/admin/reports/reports";
import { AdminSelector } from "@/components/shared/selector";
import { AuthorizedUsers } from "@/components/admin/users/authorized-users";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { fetchAuthorizedUsersMetadata } from "@/lib/requests/authorized-user";
import { fetchDroplets } from "@/lib/requests/data";
import { Droplets } from "@/components/admin/droplets/droplets";
import { Groups } from "@/components/admin/groups/groups";
import { Playlists } from "@/components/admin/playlists/playlists";
import { ComponentDropdown } from "@/components/shared/component-dropdown";
import { getRetentionData } from "@/lib/requests/analytics";
import {
  fetchDailyActiveUsers,
  fetchUniquePageview,
  fetchWeeklyActiveUsers,
} from "@/lib/requests/posthog";
import { DailyActiveUsersChart } from "@/components/admin/daily-active-users-chart";
import { Droplet } from "@/types";
import { StatisticsSelector } from "@/components/admin/statistics-selector";
import { WeeklyActiveUsersChart } from "@/components/admin/weekly-active-users-chart";
import { UniquePageviewChart } from "@/components/admin/unique-pageview";
import { CreationRequestManager } from "@/components/shared/creation-request-manager/creation-manager";

export default async function Page() {
  const user = await getCurrentUser();

  const [
    authorizedUsers,
    droplets,
    dailyActiveUsers,
    weeklyActiveUsers,
    pageviewCount,
    retentionData,
  ] = await Promise.all([
    fetchAuthorizedUsersMetadata(),
    fetchDroplets(),
    fetchDailyActiveUsers(),
    fetchWeeklyActiveUsers(),
    fetchUniquePageview(),
    getRetentionData(),
  ]);

  const { retentionRate, totalEnrollments, incompleteEnrollments } =
    retentionData;

  if (!user || !isAuthorizedUserAdmin(user.roles)) return notFound();

  // Content for admin section
  const pageContent = {
    Users: <AuthorizedUsers />,
    Droplets: <Droplets />,
    Playlists: <Playlists />,
    Groups: <Groups />,
    "Access Manager": <AccessManager user={user} />,
    "Creators Manager": <CreationRequestManager user={user} />,
    Reports: <Reports />,
  };

  // Content for statistics section
  const statisticsContent = {
    "General Statistics": (
      <GeneralStatistics
        droplets={droplets}
        authorizedUsersLength={authorizedUsers.meta.pagination.total}
        totalEnrollments={totalEnrollments}
        retentionRate={retentionRate}
        incompleteEnrollments={incompleteEnrollments}
      />
    ),
    "Daily Active Users": <DailyActiveUsersChart data={dailyActiveUsers} />,
    "Weekly Active Users": <WeeklyActiveUsersChart data={weeklyActiveUsers} />,
    "Daily Unique Pageviews": <UniquePageviewChart data={pageviewCount} />,
  };

  // Main render
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="light:text-slate-900 text-3xl font-bold tracking-tight sm:text-4xl">
          Admin
        </h1>
        <p className="light:text-slate-600 mt-4 text-balance text-lg leading-normal">
          View Odyssey statistics and edit existing information.
        </p>
      </div>

      <Separator />

      <div className="hidden p-4 sm:flex sm:flex-col">
        <StatisticsSelector content={statisticsContent} />
      </div>

      <div className="flex flex-col p-4 sm:hidden">
        <ComponentDropdown content={statisticsContent} />
      </div>

      <Separator />

      <div className="hidden p-4 sm:flex sm:flex-col">
        <AdminSelector content={pageContent} />
      </div>

      <div className="flex flex-col p-4 sm:hidden">
        <ComponentDropdown content={pageContent} />
      </div>
    </div>
  );
}

// General Statistics Component
function GeneralStatistics({
  authorizedUsersLength,
  droplets,
  totalEnrollments,
  retentionRate,
}: {
  authorizedUsersLength: number;
  droplets: Droplet[];
  totalEnrollments: number;
  retentionRate: number;
  incompleteEnrollments: number;
}) {
  return (
    <div className="flex items-center justify-center gap-x-8 gap-y-6 text-center sm:flex-row">
      <div className="flex flex-row items-center justify-center space-x-3 pt-2">
        <div className="flex items-center space-x-3">
          <div>
            <div className="font-medium dark:text-slate-300">
              Total Number of Users
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {authorizedUsersLength}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div>
            <div className="font-medium dark:text-slate-300">
              Total Number of Droplets
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {droplets.length}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div>
            <div className="font-medium dark:text-slate-300">
              Total Number of Enrollments
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {totalEnrollments}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div>
            <div className="font-medium dark:text-slate-300">
              Retention Rate
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {retentionRate}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
