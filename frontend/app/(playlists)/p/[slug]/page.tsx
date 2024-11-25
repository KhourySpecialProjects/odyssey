import { getPlaylistBySlug } from "@/lib/requests/playlist";
import { DropletsGrid } from "@/components/explore/droplets-grid";
import { notFound } from "next/navigation";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getAuthorizedUserActivity } from "@/lib/requests/authorized-user-activity";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";

export default async function PlaylistPage({
  params,
}: {
  params: { slug: string };
}) {
  const playlist = await getPlaylistBySlug(params.slug, {
    populate: {
      droplets: {
        populate: {
          tags: true,
          lessons: {
            fields: ['id', 'name', 'slug']
          }
        }
      }
    }
  });
  if (!playlist) {
    notFound();
  }

  const user = await getCurrentUser();
  let enrolledDropletIds: number[] = [];
  let completedLessonIds: number[] = [];

  if (user?.email) {
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
    enrolledDropletIds = enrollments.map(e => e.droplet.id);
    
    const activity = await getAuthorizedUserActivity(authorizedUser.id);
    completedLessonIds = activity?.lessons?.map(l => l.id) || [];
  }

  // Get all lesson IDs from the playlist's droplets
  const playlistLessonIds = playlist.droplets?.flatMap(droplet => 
    droplet.lessons?.map(lesson => lesson.id) || []
  ) || [];

  // Filter completed lessons to only include those from this playlist
  const playlistCompletedLessonIds = completedLessonIds.filter(id => 
    playlistLessonIds.includes(id)
  );

  // Calculate total lessons and completed lessons
  const totalLessons = playlistLessonIds.length;
  const completedLessons = playlistCompletedLessonIds.length;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">{playlist.name}</h1>
          <div className="flex justify-center gap-4 mb-6">
            <Badge variant="secondary">
              {playlist.duration[0].toUpperCase() + playlist.duration.slice(1)}
            </Badge>
            <Badge variant="secondary">
              {totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}
            </Badge>
          </div>
          {playlist.description && (
            <p className="text-lg text-slate-600 mb-4">{playlist.description}</p>
          )}
          {user && (
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>Progress</span>
                <span>{progressPercentage}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </div>

        {playlist.droplets && playlist.droplets.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {playlist.droplets.map((droplet) => (
              <DropletTile 
                key={droplet.id} 
                droplet={droplet}
                isEnrolled={enrolledDropletIds.includes(droplet.id)}
                completedLessonIds={completedLessonIds}
              />
            ))}
          </ul>
        ) : (
          <p className="text-center text-slate-600">No droplets in this playlist yet.</p>
        )}
      </div>
    </div>
  );
} 