import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { notFound, redirect } from "next/navigation";
import { GroupManagementForm } from "@/components/group/group-management-form";
import { getDueDates, getGroupBySlugV2 } from "@/lib/requests/groups";
import { Badge } from "@/components/ui/badge";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { GroupDueDateDashboard } from "@/components/group/due-date-dashboard";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function GroupDueDatesPage({ searchParams }: Props) {
  
  const user = await getCurrentUser();
  if (!user?.email) redirect("/");

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser) redirect("/");

  // If we have a group slug, fetch the group for editing
  const p = await searchParams;
  const groupSlug = p?.slug as string;
  const group = await getGroupBySlugV2(groupSlug);

  // Only allow editing if user is creator or admin
  if (group) {
    const isCreator = group.creator?.id === authorizedUser.id;
    const isAdmin = group.admins?.some(
      (admin) => admin.id === authorizedUser.id,
    );
    if (!isCreator && !isAdmin && !isAuthorizedUserAdmin(user.roles)) {
      notFound();
    }

  }





  return (
    <div className="w-full max-w-4xl p-8 mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Due Dates
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          Manage due dates and extensions
        </p>
        {group && (
          <Badge variant="outline">
            Group created by: {group.creator?.email || "Unknown"}
          </Badge>
        )}
      </div>
      {group && 
      <GroupDueDateDashboard 
        currentUser={authorizedUser} 
        existingGroup={group} 
        searchParams={p} 
        user={user} />
      }
    </div>
  );
}
