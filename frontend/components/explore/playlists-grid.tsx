import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getPlaylists } from "@/lib/requests/playlist";
import { PlaylistCard } from "../playlists/playlist-card";

interface PlaylistsGridProps {
  searchValue?: string;
  sortKey?: string;
}

export async function PlaylistsGrid({ searchValue, sortKey }: PlaylistsGridProps) {
  // Only use server-side sorting for name
  const [field, direction] = (sortKey || '').split(':');
  const serverSortKey = field === 'name' ? sortKey : undefined;

  const playlists = await getPlaylists({
    sort: serverSortKey,
    filters: {
      $and: [
        { isPublic: true },
        searchValue ? { name: { $containsi: searchValue } } : {},
      ],
    },
    populate: {
      droplets: {
        populate: {
          lessons: {
            fields: ['id', 'name', 'slug']
          }
        }
      }
    }
  });

  // Get user completion data
  const user = await getCurrentUser();
  let completedLessonIds: number[] = [];

  if (user?.email) {
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
    completedLessonIds = enrollments.flatMap(enrollment => 
      enrollment.viewedLessons?.map(lesson => lesson.id) || []
    );
  }

  // Calculate completion percentage for each playlist
  let playlistsWithCompletion = playlists.map(playlist => {
    const allLessonIds = playlist.droplets?.flatMap(d => d.lessons?.map(l => l.id) || []) || [];
    const completedLessons = completedLessonIds.filter(id => allLessonIds.includes(id));
    const completionPercentage = allLessonIds.length > 0 
      ? (completedLessons.length / allLessonIds.length) * 100 
      : 0;
    
    return {
      ...playlist,
      completionPercentage
    };
  });

  // Sort playlists
  if (sortKey) {
    const [field, direction] = sortKey.split(':');
    if (field === 'name') {
      playlistsWithCompletion.sort((a, b) => {
        return direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
    } else if (field === 'completion') {
      playlistsWithCompletion.sort((a, b) => {
        return direction === 'asc'
          ? a.completionPercentage - b.completionPercentage
          : b.completionPercentage - a.completionPercentage;
      });
    }
  }

  if (!playlistsWithCompletion || playlistsWithCompletion.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No public playlists available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {playlistsWithCompletion.map((playlist) => (
        <PlaylistCard 
          key={playlist.id} 
          playlist={playlist} 
          completedLessonIds={completedLessonIds}
        />
      ))}
    </div>
  );
} 