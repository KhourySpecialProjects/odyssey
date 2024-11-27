import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { getPlaylistsByAuthor } from "@/lib/requests/playlist";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { StudentProgressList } from "./student-progress-list";

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

  const author = await getAuthorByAuthorizedUserEmail(user.email);
  if (!author) return null;

  const playlists = await getPlaylistsByAuthor(author.id, {
    filters: {
      isPublic: false
    },
    populate: {
      authorized_users: {
        fields: ['id', 'email']
      },
      droplets: {
        populate: {
          lessons: {
            fields: ['id']
          }
        }
      }
    }
  });

  // Calculate progress for each user in each playlist
  const playlistsWithProgress = await Promise.all(
    playlists.map(async (playlist) => {
      const usersWithProgress = await Promise.all(
        (playlist.authorized_users || []).map(async (user: AuthorizedUser) => {
          const enrollments = await getEnrollmentsByAuthorizedUser(user.id);
          const completedLessonIds = enrollments.flatMap(enrollment => 
            enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || []
          );

          const allLessonIds = playlist.droplets?.flatMap(d => 
            d.lessons?.map((l: Lesson) => l.id) || []
          ) || [];

          const progress = allLessonIds.length > 0
            ? Math.round((completedLessonIds.filter(id => allLessonIds.includes(id)).length / allLessonIds.length) * 100)
            : 0;

          return {
            ...user,
            progress
          };
        })
      );

      return {
        ...playlist,
        authorized_users: usersWithProgress
      };
    })
  );

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Student Progress</h2>
        <p className="text-gray-500">Track student progress in your private playlists</p>
      </div>
      <StudentProgressList playlists={playlistsWithProgress} />
    </div>
  );
} 