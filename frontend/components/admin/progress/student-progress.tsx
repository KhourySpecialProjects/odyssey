import { getCurrentUser } from "@/lib/auth/session";
import { getEnrollmentsForGroupMembers } from "@/lib/requests/enrollment";
import { ENROLLMENT_POPULATES } from "@/lib/requests/enrollment-populates";
import { StudentProgressList } from "./student-progress-list";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

interface Lesson {
  id: number;
}

interface AuthorizedUser {
  id: number;
  email: string;
}

export async function StudentProgress() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const author = await getAuthorizedUserByEmail(user.email, {
    fields: ["id"],
    populate: {
      created_playlists: {
        fields: ["id", "name"],
        populate: {
          authorized_users: { fields: ["id", "email"] },
          droplets: {
            fields: ["id"],
            populate: {
              lessons: { fields: ["id"] },
            },
          },
        },
      },
    },
  });
  if (!author) return null;

  const playlists = author.created_playlists;
  if (!playlists) return null;

  // Collect all unique user IDs and droplet IDs across all playlists
  const allUserIds = playlists.flatMap((p) =>
    (p.authorized_users || []).map((u: AuthorizedUser) => u.id),
  );
  const allDropletIds = playlists.flatMap((p) =>
    (p.droplets || []).map((d) => d.id),
  );
  const uniqueUserIds = [...new Set(allUserIds)];
  const uniqueDropletIds = [...new Set(allDropletIds)];

  // 1-2 queries instead of N per user
  const allEnrollments =
    uniqueUserIds.length > 0 && uniqueDropletIds.length > 0
      ? await getEnrollmentsForGroupMembers(uniqueUserIds, uniqueDropletIds, {
          populate: {
            ...ENROLLMENT_POPULATES.withLessonIds,
            authorizedUser: { fields: ["id"] },
          },
          fields: ["id"],
        })
      : [];

  // Build a map: userId -> set of completed lesson IDs
  const completedByUser = new Map<number, Set<number>>();
  for (const enrollment of allEnrollments) {
    const userId = enrollment.authorizedUser?.id;
    if (!userId) continue;
    if (!completedByUser.has(userId)) {
      completedByUser.set(userId, new Set());
    }
    const set = completedByUser.get(userId)!;
    for (const lesson of enrollment.viewedLessons || []) {
      set.add(lesson.id);
    }
  }

  const playlistsWithProgress = playlists.map((playlist) => {
    const allLessonIds =
      playlist.droplets?.flatMap(
        (d) => d.lessons?.map((l: Lesson) => l.id) || [],
      ) || [];

    const usersWithProgress = (playlist.authorized_users || []).map(
      (u: AuthorizedUser) => {
        const completed = completedByUser.get(u.id) || new Set();
        const progress =
          allLessonIds.length > 0
            ? Math.round(
                (allLessonIds.filter((id) => completed.has(id)).length /
                  allLessonIds.length) *
                  100,
              )
            : 0;

        return { ...u, progress };
      },
    );

    return { ...playlist, authorized_users: usersWithProgress };
  });

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Student Progress</h2>
        <p className="text-gray-500">
          Track student progress in your private playlists
        </p>
      </div>
      <StudentProgressList playlists={playlistsWithProgress} />
    </div>
  );
}
