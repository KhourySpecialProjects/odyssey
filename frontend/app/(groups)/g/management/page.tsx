import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { notFound, redirect } from "next/navigation";
import { GroupManagementForm } from "@/components/group/group-management-form";
import { getGroupBySlugV2 } from "@/lib/requests/groups";
import { Badge } from "@/components/ui/badge";

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function GroupManagementPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/");

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser) redirect("/");

  // If we have a group slug, fetch the group for editing
  const p = await searchParams;
  const groupSlug = p?.slug as string | undefined;
  const group = groupSlug ? await getGroupBySlugV2(groupSlug) : null;

  // Only allow editing if user is creator or admin
  if (group) {
    const isCreator = group.creator?.id === authorizedUser.id;
    const isAdmin = group.admins?.some(
      (admin) => admin.id === authorizedUser.id,
    );
    if (!isCreator && !isAdmin) notFound();
  }

  return (
    <div className="w-full max-w-4xl p-8 mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {group ? "Edit Group" : "Create New Group"}
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          {group
            ? "Modify your group settings and manage members"
            : "Set up a new group and invite members"}
        </p>
        {group && (
          <Badge variant="outline">
            Created by: {group.creator?.email || "Unknown"}
          </Badge>
        )}
      </div>

      <GroupManagementForm currentUser={authorizedUser} existingGroup={group} />
    </div>
  );
}
