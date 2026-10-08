import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
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
import { getVoyageEnrollmentsForGroupMembers } from "@/lib/requests/voyage-enrollment";
import { AuthorizedUser, DueDate, Enrollment } from "@/types";
import { getCachedEnrollmentsWithLessonIds } from "@/lib/requests/cached";
import { hasDroplet } from "@/lib/enrollment-completion";
import { withViewableGroupDroplets } from "@/lib/droplet-visibility";
import { DateTime } from "luxon";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function GroupDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const p = await params;
  const [authorizedUser, group] = await Promise.all([
    getCachedUser(user.email),
    getGroupBySlugV2(p?.slug),
  ]);
  if (!authorizedUser) return null;
  if (!group) {
    return notFound();
  }

  const isCreator = group.creator?.id === authorizedUser.id;
  const canEdit = isCreator || isAuthorizedUserAdmin(user.roles);

  const dueDatesPromise = getGroupDueDates(group);
  dueDatesPromise.catch(() => {});

  let sortedMembers: AuthorizedUser[] = [];
  const completionStatuses: Record<
    string,
    { completionPercentage: number; completionDate: Date | undefined }
  > = {};
  const voyageStatuses: Record<string, { completionPercentage: number }> = {};

  // Progress uses the unfiltered group, so hidden droplets are still counted.
  const voyageDropletIds =
    group.voyages?.flatMap(
      (v) =>
        v.voyage_nodes?.flatMap(
          (n) => n.playlist?.droplets?.map((d) => d.id) || [],
        ) || [],
    ) || [];

  const allDropletIds = [
    ...new Set([
      ...(group.droplets?.map((d) => d.id) || []),
      ...(group.playlists?.flatMap((p) => p.droplets?.map((d) => d.id) || []) ||
        []),
      ...voyageDropletIds,
    ]),
  ];

  const voyageIds = group.voyages?.map((v) => v.id) || [];
  const viewerIsMember = !!group.members?.some(
    (m) => m.id === authorizedUser.id,
  );
  let membersFetchFailed = false;
  let allEnrollments: Enrollment[] = [];

  if (group.members && (allDropletIds.length > 0 || voyageIds.length > 0)) {
    sortedMembers = [...group.members].sort((a, b) => {
      const aValue = a.lastName || a.email;
      const bValue = b.lastName || b.email;
      return aValue.localeCompare(bValue);
    });

    try {
      const memberIds = sortedMembers.map((m) => m.id);

      const [memberEnrollments, voyageEnrollments] = await Promise.all([
        allDropletIds.length > 0
          ? getEnrollmentsForGroupMembers(memberIds, allDropletIds)
          : Promise.resolve([]),
        voyageIds.length > 0
          ? getVoyageEnrollmentsForGroupMembers(memberIds, voyageIds)
          : Promise.resolve([]),
      ]);
      allEnrollments = memberEnrollments;

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

      voyageEnrollments.forEach((enrollment) => {
        if (!enrollment.authorizedUser || !enrollment.voyage) return;
        const key = `${enrollment.authorizedUser.id}-${enrollment.voyage.id}`;
        voyageStatuses[key] = {
          completionPercentage: enrollment.completionPercentage ?? 0,
        };
      });
    } catch (error) {
      membersFetchFailed = true;
      console.error("Error fetching completion statuses:", error);
    }
  }

  // Viewer's enrolled droplets: members reuse the loaded rows, others fetch.
  let viewerEnrollments: Enrollment[] = [];
  if (viewerIsMember) {
    viewerEnrollments = membersFetchFailed
      ? []
      : allEnrollments.filter(
          (e) => e.authorizedUser?.id === authorizedUser.id,
        );
  } else {
    viewerEnrollments = await getCachedEnrollmentsWithLessonIds(
      authorizedUser.id,
    ).catch(() => []);
  }
  const enrolledIds = new Set(
    viewerEnrollments.filter(hasDroplet).map((e) => e.droplet.id),
  );
  const visibleGroup = withViewableGroupDroplets(
    group,
    { id: authorizedUser.id, roles: user.roles },
    enrolledIds,
  );
  const visibleDropletIds = new Set([
    ...(visibleGroup.droplets?.map((d) => d.id) || []),
    ...(visibleGroup.playlists?.flatMap(
      (p) => p.droplets?.map((d) => d.id) || [],
    ) || []),
    ...(visibleGroup.voyages?.flatMap(
      (v) =>
        v.voyage_nodes?.flatMap(
          (n) => n.playlist?.droplets?.map((d) => d.id) || [],
        ) || [],
    ) || []),
  ]);
  const dueDates = (await dueDatesPromise).filter(
    (d) => !d.droplet || visibleDropletIds.has(d.droplet.id),
  );

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
        </div>
      </div>

      <Separator />

      <GroupDashboard
        group={visibleGroup}
        progressGroup={group}
        canEdit={canEdit}
        authUser={authorizedUser}
        dueDates={dueDates}
        statuses={completionStatuses}
        voyageStatuses={voyageStatuses}
        data-testid="group-edit-controls"
      />
    </div>
  );
}
