import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { notFound } from "next/navigation";
import { GroupManagementForm } from "@/components/group/group-management-form";
import { getGroupBySlugV2 } from "@/lib/requests/groups";
import { Badge } from "@/components/ui/badge";
import {
  isAuthorizedUserAdmin,
  isAuthorizedUserFaculty,
  isContentCreator,
} from "@/lib/utils";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function GroupManagementPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (
    !user ||
    !user?.email ||
    (!isContentCreator(user.roles) &&
      !isAuthorizedUserAdmin(user.roles) &&
      !isAuthorizedUserFaculty(user.roles))
  )
    return notFound();

  const p = await searchParams;
  const groupSlug = p?.slug as string | undefined;

  const [authorizedUser, group] = await Promise.all([
    getCachedUser(user.email),
    groupSlug ? getGroupBySlugV2(groupSlug) : Promise.resolve(null),
  ]);
  if (!authorizedUser) return notFound();

  if (group) {
    const isCreator = group.creator?.id === authorizedUser.id;
    const isAdmin = group.admins?.some(
      (admin) => admin.id === authorizedUser.id,
    );
    if (
      !isCreator &&
      !isAdmin &&
      !isAuthorizedUserAdmin(user.roles) &&
      !isAuthorizedUserFaculty(user.roles) &&
      !isContentCreator(user.roles)
    ) {
      notFound();
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-12 bg-slate-100 p-8 dark:bg-slate-800">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {group ? "Edit Group" : "Create New Group"}
        </h1>
        <p className="mt-4 text-lg leading-normal text-balance text-slate-600 dark:text-slate-300">
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
