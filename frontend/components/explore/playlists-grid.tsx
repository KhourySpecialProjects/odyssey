import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { AuthorizedUser, DueDate, Playlist } from "@/types";
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
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
    completedLessonIds = enrollments.flatMap(
      (enrollment) =>
        enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
    );
    dueDates = await getUserDueDates(authorizedUser.id);
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
      <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
        <MessageHeader subtitle="No Results" title="No Public Playlists" />
        <MessageDescription>
          There are no public playlists available at this time.
        </MessageDescription>
      </Message>
    );
  }

  return (
    <SortedPlaylistsGrid
      playlistsWithCompletion={playlistsWithCompletion}
      dueDates={dueDates}
    />
  );
}
