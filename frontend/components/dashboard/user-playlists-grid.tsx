import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { PlaylistCard } from "../playlists/playlist-card";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { Group } from "@/types";
import { useMemo } from "react";
import { getUserDueDates } from "@/lib/requests/groups";

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

interface Playlist {
  id: number;
  name: string;
  slug: string;
  droplets?: Droplet[];
  duration: "short" | "medium" | "long";
  isPublic: boolean;
}

export async function UserPlaylistsGrid() {
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

  // Get completion data if available
  const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
  const completedLessonIds = enrollments.flatMap(
    (enrollment) =>
      enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
  );

  // Map all playlists and calculate completion
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

  // Separate playlists into public and custom
  const publicPlaylists = allPlaylists.filter((p: Playlist) => p.isPublic);
  const customPlaylists = allPlaylists.filter((p: Playlist) => !p.isPublic);

  if (!allPlaylists || allPlaylists.length === 0) {
    return (
      <Message className="mb-8 border border-dashed rounded-md border-slate-200">
        <MessageHeader subtitle="No Results" title="No Saved Playlists" />
        <MessageDescription>
          You haven&apos;t saved any playlists yet. Browse the explore page to
          find playlists to save.
        </MessageDescription>
      </Message>
    );
  }

  //Handle due dates

  const dueDates = await getUserDueDates(authorizedUser.id);

  console.log("due dates are", dueDates)

  const allDueDates = (authorizedUser.groups || [])
    .flatMap((group: any) => group.playlistDueDates || [])
    .reduce(
      (acc: any, curr: any) => {
        if (
          !acc[curr.playlistId] ||
          new Date(curr.baseDueDate) < new Date(acc[curr.playlistId])
        ) {
          acc[curr.playlistId] = curr.baseDueDate;
        }
        return acc;
      },
      {} as Record<number, string>,
    );

  return (
    <div className="space-y-8">
      {customPlaylists.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 dark:text-slate-300">
            Custom Playlists
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customPlaylists.map((playlist: Playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                completedLessonIds={completedLessonIds}
              />
            ))}
          </div>
        </section>
      )}

      {publicPlaylists.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Public Playlists</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {publicPlaylists.map((playlist: Playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                completedLessonIds={completedLessonIds}
                dueDate={dueDates?.find(
                  (dueDate) => dueDate.playlist?.id === playlist.id,
                )?.dueDate || ""}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
