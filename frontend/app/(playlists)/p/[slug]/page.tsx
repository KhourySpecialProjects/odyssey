import { getPlaylistBySlug } from "@/lib/requests/playlist";
import { DropletsGrid } from "@/components/explore/droplets-grid";
import { notFound } from "next/navigation";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";

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
    
    // Get completed lessons from enrollments
    completedLessonIds = enrollments.flatMap(enrollment => 
      enrollment.viewedLessons?.map(lesson => lesson.id) || []
    );
  }

  // Get all lesson IDs from the playlist's droplets
  const playlistLessonIds = playlist.droplets?.flatMap(droplet => 
    droplet.lessons?.map(lesson => lesson.id) || []
  ) || [];

  // Calculate completion status for each droplet while preserving order
  const dropletStatus = playlist.droplets?.map((droplet, index) => {
    const dropletLessonIds = droplet.lessons?.map(l => l.id) || [];
    const completedLessonsInDroplet = completedLessonIds.filter(id => 
      dropletLessonIds.includes(id)
    );
    return {
      droplet,
      index,
      isComplete: dropletLessonIds.length > 0 && 
                  completedLessonsInDroplet.length === dropletLessonIds.length,
      progress: dropletLessonIds.length > 0 ? 
                (completedLessonsInDroplet.length / dropletLessonIds.length) * 100 : 0
    };
  }) || [];

  // Organize droplets by status while preserving original order
  const completedDroplets = dropletStatus.filter(d => d.isComplete);
  const incompleteDroplets = dropletStatus.filter(d => !d.isComplete)
    .sort((a, b) => a.index - b.index);

  // The first incomplete droplet is "Up Next"
  const upNextDroplet = incompleteDroplets[0];
  // The rest are "Upcoming"
  const upcomingDroplets = incompleteDroplets.slice(1);

  // Calculate overall progress
  const totalLessons = playlistLessonIds.length;
  const completedLessons = completedLessonIds.filter(id => 
    playlistLessonIds.includes(id)
  ).length;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/explore?contentType=playlists" className="block mb-8">
          <Image
            src="/logo.svg"
            alt="Khoury Odyssey Logo"
            width={165}
            height={45}
            priority
          />
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">{playlist.name}</h1>
          <div className="flex justify-center gap-4 mb-6">
            <Badge variant="outline" className="capitalize bg-slate-100">
              {playlist.duration}
            </Badge>
            <Badge variant="outline" className="bg-slate-100">
              {totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}
            </Badge>
          </div>
          {user && (
            <div className="max-w-md mx-auto mb-4">
              <div className="flex justify-center text-sm text-slate-600 mb-2">
                <span>{progressPercentage}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
          {playlist.description && (
            <p className="text-lg text-slate-600 mb-4">{playlist.description}</p>
          )}
        </div>

        {playlist.droplets && playlist.droplets.length > 0 ? (
          <div className="space-y-8">
            {upNextDroplet && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Up Next</h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <DropletTile 
                    key={upNextDroplet.droplet.id} 
                    droplet={upNextDroplet.droplet}
                    isEnrolled={enrolledDropletIds.includes(upNextDroplet.droplet.id)}
                    completedLessonIds={completedLessonIds}
                  />
                </ul>
              </section>
            )}

            {upcomingDroplets.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Upcoming Droplets</h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {upcomingDroplets.map(({ droplet }) => (
                    <DropletTile 
                      key={droplet.id} 
                      droplet={droplet}
                      isEnrolled={enrolledDropletIds.includes(droplet.id)}
                      completedLessonIds={completedLessonIds}
                    />
                  ))}
                </ul>
              </section>
            )}

            {completedDroplets.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Completed Droplets</h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {completedDroplets.map(({ droplet }) => (
                    <DropletTile 
                      key={droplet.id} 
                      droplet={droplet}
                      isEnrolled={enrolledDropletIds.includes(droplet.id)}
                      completedLessonIds={completedLessonIds}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <p className="text-center text-slate-600">No droplets in this playlist yet.</p>
        )}
      </div>
    </div>
  );
} 