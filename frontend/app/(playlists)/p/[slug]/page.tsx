import { getPlaylistBySlug } from "@/lib/requests/playlist";
import { DropletsGrid } from "@/components/explore/droplets-grid";
import { notFound } from "next/navigation";
import { DropletTile } from "@/components/droplets/droplet-tile";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getAuthorizedUserActivity } from "@/lib/requests/authorized-user-activity";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";

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

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">{playlist.name}</h1>
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
        <p className="text-muted-foreground">No droplets in this playlist yet.</p>
      )}
    </div>
  );
} 