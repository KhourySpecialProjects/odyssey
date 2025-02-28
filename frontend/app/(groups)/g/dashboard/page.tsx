import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
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
  if (!user?.email) {
    redirect("/not-found");
    return null;
  }

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser) {
    redirect("/not-found");
    return null;
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
    creator: "bg-purple-100 text-purple-800 dark:hover:bg-purple-100",
    admin: "bg-yellow-100 text-yellow-800 dark:hover:bg-yellow-100",
    manager: "bg-blue-100 text-blue-800 dark:hover:bg-blue-100",
    member: "bg-green-100 text-green-800 dark:hover:bg-green-100",
  };

  const roleMessages = {
    creator: "You haven't created any groups yet.",
    admin: "You aren't an administrator of any groups.",
    manager: "You aren't a manager of any groups.",
    member: "You aren't a member of any groups.",
    favorites: "You haven't added any groups to favorites yet.",
  };

  return (
    <div className="w-full max-w-7xl p-8 mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight light:text-slate-900 sm:text-4xl">
          My Groups
        </h1>
        <p className="mt-4 text-lg leading-normal light:text-slate-600 text-balance">
          View and manage your group memberships
        </p>
      </div>

      <GroupsSelector />

      <div className="mt-6">
        {tab === "favorites" ? (
          <Message className="mb-8 border border-dashed rounded-md border-slate-200 dark:border-slate-500 dark:bg-slate-800">
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
          <Message className="mb-8 border border-dashed rounded-md border-slate-200 dark:border-slate-500">
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
              <div className="grid grid-flow-row grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                {groupsByRole[tab as keyof typeof groupsByRole].map(
                  ({ group, role }) => (
                    <div className="h-full"> 
                      <GroupCard
                        key={group.id}
                        group={group}
                        role={role}
                        roleColors={roleColors}
                      />
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="p-8 text-center light:text-slate-500 border border-dashed dark:border-slate-500 rounded-lg">
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
