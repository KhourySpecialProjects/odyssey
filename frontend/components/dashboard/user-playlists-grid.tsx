import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import {
  getCachedUserDashboardFull,
  getCachedEnrollmentsFavorites,
  getCachedUserDueDates,
} from "@/lib/requests/cached";
import { UserPlaylistsClient } from "./user-playlists-client";
import { EmptyState } from "@/components/ui/empty-state";
import { IconLayoutList } from "@tabler/icons-react";
import { Lesson, Playlist } from "@/types";

export async function UserPlaylistsGrid({ sortKey }: { sortKey?: string }) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const userId = await getAuthorizedUserId(user);
  if (!userId) return null;

  const [authorizedUser, enrollments, dueDates] = await Promise.all([
    getCachedUserDashboardFull(user.email),
    getCachedEnrollmentsFavorites(userId),
    getCachedUserDueDates(userId),
  ]);
  const completedLessonIds = enrollments.flatMap(
    (enrollment) =>
      enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
  );

  const allPlaylists = (authorizedUser.playlists || []).map(
    (playlist: Playlist) => {
      const allLessonIds =
        playlist.droplets?.flatMap((d) => d.lessons?.map((l) => l.id) || []) ||
        [];

      const completionPercentage =
        allLessonIds.length > 0
          ? (completedLessonIds.filter((id) => allLessonIds.includes(id))
              .length /
              allLessonIds.length) *
            100
          : 0;

      return {
        ...playlist,
        completionPercentage,
      };
    },
  );

  const activePlaylists = allPlaylists.filter((p: Playlist) => !p.isArchived);
  const publicPlaylists = activePlaylists.filter((p: Playlist) => p.isPublic);
  const customPlaylists = activePlaylists.filter((p: Playlist) => !p.isPublic);

  if (activePlaylists.length === 0) {
    return (
      <EmptyState
        icon={
          <IconLayoutList
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No saved playlists"
        message="You haven't saved any playlists yet. Browse the explore page to find playlists to save."
        className="min-h-[calc(100vh-var(--header-h)-196px)]"
      />
    );
  }

  return (
    <UserPlaylistsClient
      sortKey={sortKey}
      customPlaylists={customPlaylists}
      publicPlaylists={publicPlaylists}
      dueDates={dueDates}
      dashboardPage={true}
      isArchived={false}
    />
  );
}
