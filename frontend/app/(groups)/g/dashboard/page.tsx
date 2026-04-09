import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser, getCachedUserGroups } from "@/lib/requests/cached";
import { Group } from "@/types";
import { GroupsSelector } from "./group-selector";
import { redirect } from "next/navigation";
import { GroupCard } from "@/components/group/group-card";
import { Suspense } from "react";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { IconUsers } from "@tabler/icons-react";
import { EmptyState } from "@/components/ui/empty-state";

type GroupWithRole = {
  group: Group;
  role: "creator" | "admin" | "manager" | "member";
};

type Props = {
  searchParams:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | undefined;
};

export default async function GroupsPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!params) {
    redirect("/dashboard");
  }
  const tab = params.tab || "member";

  const user = await getCurrentUser();
  if (!user || !user.email) {
    redirect("/unauthorized");
  }

  const authorizedUser = await getCachedUser(user.email);
  if (!authorizedUser) {
    redirect("/unauthorized");
  }

  const allGroups = await getCachedUserGroups(authorizedUser.id);
  const groupsByRole: Record<string, GroupWithRole[]> = {
    creator: [],
    admin: [],
    manager: [],
    member: [],
  };

  allGroups.forEach((group) => {
    if (group.creator?.id === authorizedUser.id) {
      groupsByRole.creator.push({ group, role: "creator" });
    }
    if (group.admins?.some((admin) => admin.id === authorizedUser.id)) {
      groupsByRole.admin.push({ group, role: "admin" });
    }
    if (group.managers?.some((manager) => manager.id === authorizedUser.id)) {
      groupsByRole.manager.push({ group, role: "manager" });
    }
    if (group.members?.some((member) => member.id === authorizedUser.id)) {
      groupsByRole.member.push({ group, role: "member" });
    }
  });

  const roleColors = {
    creator:
      "bg-purple-100 text-purple-800 dark:hover:bg-purple-100 hover:bg-purple-100",
    admin:
      "bg-yellow-100 text-yellow-800 dark:hover:bg-yellow-100 hover:bg-yellow-100",
    manager:
      "bg-blue-100 text-blue-800 dark:hover:bg-blue-100 hover:bg-blue-100",
    member:
      "bg-green-100 text-green-800 dark:hover:bg-green-100 hover:bg-green-100",
  };

  const roleMessages = {
    creator: "You haven't created any groups yet.",
    admin: "You aren't an administrator of any groups.",
    manager: "You aren't a manager of any groups.",
    member: "You aren't a member of any groups.",
    favorites: "You haven't added any groups to favorites yet.",
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <h1 className="text-4xl leading-tight font-semibold text-black dark:text-white">
          Groups
        </h1>
        <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
          View and manage your group information
        </p>
      </div>

      <div className="mb-6">
        <GroupsSelector />
      </div>

      <div>
        {tab === "favorites" ? (
          <EmptyState
            icon={
              <IconUsers
                className="h-7 w-7 text-[#475569] dark:text-slate-400"
                stroke={1.5}
              />
            }
            title="Favorites coming soon"
            message="The ability to favorite groups will be available in a future update."
          />
        ) : tab === "creator" && groupsByRole.creator.length === 0 ? (
          <EmptyState
            icon={
              <IconUsers
                className="h-7 w-7 text-[#475569] dark:text-slate-400"
                stroke={1.5}
              />
            }
            title="No groups here"
            message={roleMessages.creator}
          />
        ) : (
          <div>
            {groupsByRole[tab as keyof typeof groupsByRole].length > 0 ? (
              <Suspense fallback={<DropletsSkeleton />}>
                <div className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupsByRole[tab as keyof typeof groupsByRole].map(
                    ({ group, role }) => (
                      <div key={`group-${group.id}`} className="h-full">
                        <GroupCard
                          key={group.id}
                          group={group}
                          role={role}
                          roleColors={roleColors}
                          isArchived={false}
                          dashboardPage={false}
                        />
                      </div>
                    ),
                  )}
                </div>
              </Suspense>
            ) : (
              <EmptyState
                icon={
                  <IconUsers
                    className="h-7 w-7 text-[#475569] dark:text-slate-400"
                    stroke={1.5}
                  />
                }
                title="No groups here"
                message={roleMessages[tab as keyof typeof roleMessages]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
