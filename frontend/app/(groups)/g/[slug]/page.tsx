import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import { getGroupBySlugV2 } from "@/lib/requests/groups";
import { notFound } from "next/navigation";
import { MemberList } from "@/components/group/member-list";
import { ContentSection } from "@/components/group/content-section";
import { GroupHeader } from "@/components/group/group-header";
import { Separator } from "@/components/ui/separator";
import createDOMPurifier from "isomorphic-dompurify";
import { GroupDashboard } from "@/components/group/group-management-dashboard";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import DueDateAnnouncements from "@/components/group/due-date-announcements";
import { getGroupDueDates } from "@/lib/requests/groups";
import { getEnrollmentsForGroupMembers } from "@/lib/requests/enrollment";
import { AuthorizedUser, DueDate } from "@/types";
import { DateTime } from "luxon";

export const fetchCache = "force-no-store";
export const revalidate = 0;

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function GroupDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(
    user.email,
    USER_POPULATES.profile,
  );
  if (!authorizedUser) return null;

  const p = await params;
  const group = await getGroupBySlugV2(p?.slug);
  if (!group) {
    return notFound();
  }

  const isCreator = group.creator?.id === authorizedUser.id;
  const canEdit = isCreator || isAuthorizedUserAdmin(user.roles);

  const dueDates = await getGroupDueDates(group);

  const filteredDueDates = dueDates.reduce(
    (acc, curr) => {
      if (!curr.dueDate) return acc;

      const itemId = curr.droplet?.id || curr.playlist?.id;
      const itemType = curr.droplet ? "droplet" : "playlist";
      const key = `${itemType}-${itemId}`;

      if (!acc[key] || new Date(curr.dueDate) < new Date(acc[key].dueDate)) {
        acc[key] = curr;
      }
      return acc;
    },
    {} as Record<string, (typeof dueDates)[0]>,
  );

  const uniqueDueDates = Object.values(filteredDueDates);
  const getDaysUntil = (dueDate: DueDate) => {
    let daysUntil = "0";
    if (dueDate && dueDate.dueDate !== "") {
      const dueDateObject = DateTime.fromISO(dueDate.dueDate);
      const today = DateTime.local().startOf("day");
      const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
      daysUntil = String(Math.ceil(diffDays));
    }
    return daysUntil;
  };

  const processedDueDates = uniqueDueDates.filter((dueDate) => {
    return Number(getDaysUntil(dueDate)) >= 0;
  });

  let sortedMembers: AuthorizedUser[] = [];
  const completionStatuses: Record<
    string,
    { completionPercentage: number; completionDate: Date | undefined }
  > = {};

  if (group.members && group.droplets) {
    sortedMembers = [...group.members].sort((a, b) => {
      const aValue = a.lastName || a.email;
      const bValue = b.lastName || b.email;
      return aValue.localeCompare(bValue);
    });

    try {
      const memberIds = sortedMembers.map((m) => m.id);
      const dropletIds = group.droplets.map((d) => d.id);

      const allEnrollments = await getEnrollmentsForGroupMembers(
        memberIds,
        dropletIds,
      );

      allEnrollments.forEach((enrollment) => {
        if (!enrollment.droplet || !enrollment.authorizedUser) return;

        const memberId = enrollment.authorizedUser.id;
        const completedLessons =
          enrollment.viewedLessons?.map((lesson) => lesson.id) || [];
        const dropletLessons = enrollment.droplet?.lessons?.length || 1;
        const percentCompleted =
          (completedLessons.length / dropletLessons) * 100 || 0;

        const key = `${memberId}-${enrollment.droplet.id}`;
        if (!completionStatuses[key]) {
          completionStatuses[key] = {
            completionPercentage: 0,
            completionDate: undefined,
          };
        }

        completionStatuses[key].completionPercentage = percentCompleted;
        if (enrollment.completionDate) {
          completionStatuses[key].completionDate = enrollment.completionDate;
        }
      });
    } catch (error) {
      console.error("Error fetching completion statuses:", error);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 p-8">
      {canEdit && <GroupHeader group={group} canEdit={canEdit} />}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Group Leadership</h2>
            <div className="space-y-6">
              <MemberList
                title="Creator"
                members={group.creator ? [group.creator] : []}
                variant="creator"
              />
              <MemberList
                title="Administrators"
                members={group.admins || []}
                variant="admin"
              />
              {/* <MemberList
                title="Managers"
                members={group.managers || []}
                variant="manager"
              /> */}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold">Group Details</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-100">Semester</dt>
                <dd className="font-medium dark:text-slate-400">
                  {group.semester}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-100">
                  Total Members
                </dt>
                <dd className="font-medium dark:text-slate-400">
                  {group.members?.length || 0}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <ContentSection
            title="Group Description"
            content={createDOMPurifier.sanitize(
              group.description || "No Description Provided.",
            )}
          />
          {dueDates && processedDueDates.length > 0 && (
            <>
              <Separator />
              <DueDateAnnouncements
                dueDates={processedDueDates}
                data-testid="due-date-announcements"
              />
            </>
          )}

          <Separator />

          <ContentSection title="">
            <GroupDashboard
              group={group}
              canEdit={canEdit}
              authUser={authorizedUser}
              dueDates={dueDates}
              statuses={completionStatuses}
              data-testid="group-edit-controls"
            />
          </ContentSection>
        </div>
      </div>
    </div>
  );
}
