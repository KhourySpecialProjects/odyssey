import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getUserGroups } from "@/lib/requests/groups";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { UsersIcon, StarIcon} from "lucide-react";
import { Group } from "@/types";
import { GroupsSelector } from "./group-selector";
import { Message, MessageHeader, MessageDescription } from "@/components/message";
import { redirect } from "next/navigation";
import { GroupCard } from "@/components/group/group-card"

type GroupWithRole = {
  group: Group;
  role: "creator" | "admin" | "manager" | "member";
};

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function GroupsPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!params) {
    redirect("/dashboard");
  }
  const tab = params.tab || "favorites";
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser) return null;

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
    } else if (group.admins?.some((admin) => admin.id === authorizedUser.id)) {
      groupsByRole.admin.push({ group, role: "admin" });
    } else if (group.managers?.some((manager) => manager.id === authorizedUser.id)) {
      groupsByRole.manager.push({ group, role: "manager" });
    } else if (group.members?.some((member) => member.id === authorizedUser.id)) {
      groupsByRole.member.push({ group, role: "member" });
    }
  });

  const roleColors = {
    creator: "bg-purple-100 text-purple-800",
    admin: "bg-yellow-100 text-yellow-800",
    manager: "bg-blue-100 text-blue-800",
    member: "bg-green-100 text-green-800",
  };

  return (
    <div className="w-full max-w-7xl p-8 mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          My Groups
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          View and manage your group memberships
        </p>
      </div>

      <GroupsSelector />

      <div className="mt-6">
        {tab === "favorites" ? (
          <Message className="mb-8 border border-dashed rounded-md border-slate-200">
            <MessageHeader title="Favorites Coming Soon" subtitle="Future enhancements on the way!" />
            <MessageDescription>
              The ability to favorite groups will be available in a future update.
            </MessageDescription>
          </Message>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupsByRole[tab as keyof typeof groupsByRole]?.map(({ group, role }) => (
              <GroupCard 
                key={group.id}
                group={group}
                role={role}
                roleColors={roleColors}
              />
          
              // <Card key={group.id} className="hover:shadow-md transition-shadow">
              //   <CardHeader>
              //     <div className="flex items-start justify-between">
              //       <h3 className="text-lg font-semibold">{group.groupName}</h3>
              //       <Badge className={roleColors[role]}>{role}</Badge>
              //     </div>
              //   </CardHeader>
              //   <CardContent>
              //     {(role === "creator" || role === "admin" || role === "manager") && (
              //       <div className="flex items-center gap-4 text-sm text-slate-600">
              //         <UsersIcon className="h-4 w-4" />
              //         <div className="flex gap-3">
              //           <span>Admins: {group.admins?.length || 0}</span>
              //           <span>Managers: {group.managers?.length || 0}</span>
              //           <span>Members: {group.members?.length || 0}</span>
              //         </div>
              //       </div>
              //     )}
              //   </CardContent>
              // </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

