import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getGroupBySlugV2 } from "@/lib/requests/groups";
import { notFound } from "next/navigation";
import { MemberList } from "@/components/group/member-list";
import { ContentSection } from "@/components/group/content-section";
import { GroupHeader } from "@/components/group/group-header";
import { Separator } from "@/components/ui/separator";
import { GroupDropletTile } from "@/components/group/group-droplet-tile";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import createDOMPurifier from "isomorphic-dompurify";
type Props = {
  params: {
    slug: string;
  };
};

export default async function GroupDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser) return null;

  const p = await params;
  const group = await getGroupBySlugV2(p.slug);
  if (!group) notFound();

  const isCreator = group.creator?.id === authorizedUser.id;
  const isAdmin = group.admins?.some((admin) => admin.id === authorizedUser.id);
  const canEdit = isCreator || isAdmin;

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
        <div className="lg:col-span-2 space-y-12">
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

          <Separator />

          <ContentSection
            title="Droplets"
            emptyMessage="No droplets have been added to this group yet."
          >
            {/* Droplet components will go here */}
            {group.droplets && group.droplets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {group.droplets.map((droplet) => (
                  <GroupDropletTile key={droplet.id} droplet={droplet} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
                No droplets have been added to this group yet.
              </div>
            )}
          </ContentSection>

          <Separator />

          <ContentSection
            title="Playlists"
            emptyMessage="No playlists have been added to this group yet."
          >
            {group.playlists && group.playlists.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {group.playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    completedLessonIds={[]} // We'll need to implement this later
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 border border-dashed rounded-lg">
                No playlists have been added to this group yet.
              </div>
            )}
          </ContentSection>
        </div>
      </div>
    </div>
  );
}
