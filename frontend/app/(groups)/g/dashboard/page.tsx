import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getUserGroups } from "@/lib/requests/groups";
import { Group } from "@/types";
import { GroupsSelector } from "./group-selector";
import {
  Message,
  MessageHeader,
  MessageDescription,
} from "@/components/message";
import { redirect } from "next/navigation";
import { GroupCard } from "@/components/group/group-card";
import { Suspense } from "react";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";

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

  const allGroups = await getUserGroups(authorizedUser.id);
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
    <div className="mx-auto my-4 w-full max-w-7xl space-y-6 pt-8">
      <div className="text-center">
        <h1 className="light:text-slate-900 text-3xl font-bold tracking-tight sm:text-4xl">
          Groups
        </h1>
        <p className="light:text-slate-600 mt-4 text-lg leading-normal text-balance">
          View and manage your group information
        </p>
      </div>

      <GroupsSelector />

      <div>
        {tab === "favorites" ? (
          <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
            <MessageHeader
              title="Favorites Coming Soon"
              subtitle="Future enhancements on the way!"
            />
            <MessageDescription>
              The ability to favorite groups will be available in a future
              update.
            </MessageDescription>
          </Message>
        ) : tab === "creator" && groupsByRole.creator.length === 0 ? (
          <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500">
            <MessageHeader
              title="Create Your First Group"
              subtitle="Get started with Khoury Odyssey groups!"
            />
            <MessageDescription>
              Groups help you organize and share content with others. Create
              your first group today to get started.
            </MessageDescription>
          </Message>
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
              <div className="light:text-slate-500 rounded-lg border border-dashed p-8 text-center dark:border-slate-500">
                <p className="text-lg dark:text-slate-300">
                  {roleMessages[tab as keyof typeof roleMessages]}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
