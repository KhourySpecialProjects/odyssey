import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getUserDueDates } from "@/lib/requests/groups";
import { UserPlaylistsClient } from "./user-playlists-client";
import { Lesson, Playlist } from "@/types";

export async function UserPlaylistsGrid({ sortKey }: { sortKey?: string }) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email, {
    populate: {
      playlists: {
        populate: {
          droplets: {
            populate: {
              lessons: {
                fields: ["id", "name", "slug"],
              },
            },
          },
          users_archived: {
            fields: ["*"],
          },
        },
      },
      groups: {
        populate: {
          playlists: {
            fields: ["id"],
          },
        },
        fields: ["id", "playlistDueDates"],
      },
    },
  });

  const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
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

  const activePlaylists = allPlaylists.filter(
    (playlist) =>
      !playlist.users_archived?.some((user) => user.id === authorizedUser.id),
  );

  const publicPlaylists = activePlaylists.filter((p: Playlist) => p.isPublic);
  const customPlaylists = activePlaylists.filter((p: Playlist) => !p.isPublic);

  if (!activePlaylists || activePlaylists.length === 0) {
    return (
      <Message className="mb-8 rounded-md border border-dashed border-slate-200">
        <MessageHeader subtitle="No Results" title="No Saved Playlists" />
        <MessageDescription>
          You haven&apos;t saved any playlists yet. Browse the explore page to
          find playlists to save.
        </MessageDescription>
      </Message>
    );
  }

  const dueDates = await getUserDueDates(authorizedUser.id);
  if (sortKey) {
    const [field, direction] = sortKey.split(":");
    if (field === "name") {
      customPlaylists?.sort((a, b) => {
        return direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
      publicPlaylists?.sort((a, b) => {
        return direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
    }
  }

  return (
    <UserPlaylistsClient
      customPlaylists={customPlaylists}
      publicPlaylists={publicPlaylists}
      dueDates={dueDates}
      dashboardPage={true}
      isArchived={false}
    />
  );
}
