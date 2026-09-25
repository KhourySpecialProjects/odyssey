import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import {
  getCachedUserDashboardFull,
  getCachedEnrollmentsFavorites,
  getCachedUserDueDates,
} from "@/lib/requests/cached";
import { UserPlaylistsClient } from "./user-playlists-client";
import { EmptyState } from "@/components/ui/empty-state";
import { IconArchive } from "@tabler/icons-react";
import { Lesson, Playlist } from "@/types";

export async function ArchivedPlaylistsGrid({ sortKey }: { sortKey?: string }) {
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

  const allArchivedPlaylists = allPlaylists.filter(
    (playlist) => playlist.isArchived,
  );

  if (!allArchivedPlaylists || allArchivedPlaylists.length === 0) {
    return (
      <EmptyState
        icon={
          <IconArchive
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No archived playlists"
        message="You haven't archived any playlists yet."
      />
    );
  }

  return (
    <UserPlaylistsClient
      sortKey={sortKey}
      customPlaylists={allArchivedPlaylists}
      publicPlaylists={[]}
      dueDates={dueDates}
      isArchived={true}
      dashboardPage={true}
    />
  );
}
