import { getCurrentUser } from "@/lib/auth/session";
import {
  getCachedUser,
  getCachedEnrollmentsWithLessonIds,
} from "@/lib/requests/cached";
import { AuthorizedUser, DueDate, Playlist } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { IconLayoutList } from "@tabler/icons-react";
import { getUserDueDates } from "@/lib/requests/groups";
import { SortedPlaylistsGrid } from "./sorted-playlists-grid";

interface PlaylistsGridProps {
  playlists: Playlist[];
  sortKey?: string;
}

interface Lesson {
  id: number;
  name: string;
  slug: string;
}

interface Droplet {
  id: number;
  name: string;
  slug: string;
  lessons?: Lesson[];
}

export async function PlaylistsGrid({
  playlists,
  sortKey,
}: PlaylistsGridProps) {
  const user = await getCurrentUser();
  let completedLessonIds: number[] = [];
  let authorizedUser: AuthorizedUser | null = null;
  let dueDates: DueDate[] = [];

  if (user?.email) {
    authorizedUser = (await getCachedUser(user.email)) as AuthorizedUser;
    const [enrollments, userDueDates] = await Promise.all([
      getCachedEnrollmentsWithLessonIds(authorizedUser.id),
      getUserDueDates(authorizedUser.id),
    ]);
    completedLessonIds = enrollments.flatMap(
      (enrollment) =>
        enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
    );
    dueDates = userDueDates;
  }

  const playlistsWithCompletion = playlists?.map((playlist) => {
    const allLessonIds =
      playlist.droplets?.flatMap(
        (d: Droplet) => d.lessons?.map((l: Lesson) => l.id) || [],
      ) || [];
    const completedLessons = completedLessonIds.filter((id) =>
      allLessonIds.includes(id),
    );
    const completionPercentage =
      allLessonIds.length > 0
        ? (completedLessons.length / allLessonIds.length) * 100
        : 0;

    return {
      ...playlist,
      completionPercentage,
    };
  });

  if (sortKey) {
    const [field, direction] = sortKey.split(":");
    if (field === "name") {
      playlistsWithCompletion?.sort((a, b) => {
        return direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
    } else if (field === "completion") {
      playlistsWithCompletion?.sort((a, b) => {
        return direction === "asc"
          ? a.completionPercentage - b.completionPercentage
          : b.completionPercentage - a.completionPercentage;
      });
    }
  }

  if (!playlistsWithCompletion || playlistsWithCompletion.length === 0) {
    return (
      <EmptyState
        icon={
          <IconLayoutList
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No playlists available"
        message="There are no public playlists available at this time."
      />
    );
  }

  return (
    <SortedPlaylistsGrid
      playlistsWithCompletion={playlistsWithCompletion}
      dueDates={dueDates}
    />
  );
}
