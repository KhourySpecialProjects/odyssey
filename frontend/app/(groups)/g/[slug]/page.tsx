import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
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
type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function GroupDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser) return null;

  const p = await params;
  const group = await getGroupBySlugV2(p?.slug);
  if (!group) notFound();

  const isCreator = group.creator?.id === authorizedUser.id;
  const isAdmin = group.admins?.some((admin) => admin.id === authorizedUser.id);
  const canEdit = isCreator || isAdmin || isAuthorizedUserAdmin(user.roles);

  return (
    <div className="w-full max-w-7xl p-8 mx-auto space-y-12">
      <GroupHeader group={group} canEdit={canEdit} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar with member information */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Group Leadership</h2>
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
              <MemberList
                title="Managers"
                members={group.managers || []}
                variant="manager"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Group Details</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Semester</dt>
                <dd className="font-medium">{group.semester}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total Members</dt>
                <dd className="font-medium">{group.members?.length || 0}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          <ContentSection
            title="Group Description"
            content={createDOMPurifier.sanitize(
              group.description || "No Description Provided.",
            )}
            // content={
            //   <div
            //     dangerouslySetInnerHTML={{
            //       __html: group.description || "No description provided.",
            //     }}
            //   />
            // }
          />
          {((group.dropletDueDates && group.dropletDueDates.length > 0) ||
            (group.playlistDueDates && group.playlistDueDates.length > 0)) && (
            <>
              <Separator />
              <DueDateAnnouncements group={group} />
            </>
          )}

          <Separator />

          <ContentSection title="">
            <GroupDashboard
              group={group}
              canEdit={canEdit}
              authUser={authorizedUser}
            />
          </ContentSection>

          <Separator />
        </div>
      </div>
    </div>
  );
}
