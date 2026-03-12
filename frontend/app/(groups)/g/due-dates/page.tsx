import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { notFound, redirect } from "next/navigation";
import { getGroupBySlugV2 } from "@/lib/requests/groups";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { GroupDueDateDashboard } from "@/components/group/due-date-dashboard";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function GroupDueDatesPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/");

  const p = await searchParams;
  const groupSlug = p?.slug as string;

  const [authorizedUser, group] = await Promise.all([
    getCachedUser(user.email),
    getGroupBySlugV2(groupSlug),
  ]);
  if (!authorizedUser) redirect("/");

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
    <div className="mx-auto w-full max-w-4xl p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Due Dates
        </h1>
        <p className="mt-4 text-lg leading-normal text-balance text-slate-600 dark:text-slate-300">
          Assign and manage due dates
        </p>
      </div>
      {group && (
        <GroupDueDateDashboard existingGroup={group} searchParams={p} />
      )}
    </div>
  );
}
