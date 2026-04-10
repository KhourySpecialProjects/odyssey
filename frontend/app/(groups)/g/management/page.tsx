import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { notFound } from "next/navigation";
import { GroupManagementForm } from "@/components/group/group-management-form";
import { getGroupBySlugV2 } from "@/lib/requests/groups";
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
    <div className="bg-white px-4 pt-4 pb-8 md:px-[300px] md:pt-8 md:pb-16 dark:bg-zinc-950">
      <div className="flex w-full flex-col">
        <h1 className="mb-7 text-4xl font-semibold text-black dark:text-white">
          {group ? "Edit Group" : "Create a Group"}
        </h1>
        <GroupManagementForm
          currentUser={authorizedUser}
          existingGroup={group}
        />
      </div>
    </div>
  );
}
