import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import { getCachedEnrollmentsFavorites } from "@/lib/requests/cached";
import { getDroplets, getFavoritedDropletIds } from "@/lib/requests/droplet";
import { ENROLLMENT_POPULATES } from "@/lib/requests/enrollment-populates";
import { EnrolledDropletsGridClient } from "./enrolled-droplets-grid-client";
import { Lesson } from "@/types";
import { hasDroplet } from "@/lib/enrollment-completion";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { IconHeart } from "@tabler/icons-react";

const FAVORITE_DROPLET_POPULATE =
  ENROLLMENT_POPULATES.favorites.droplet.populate;

export async function FavoriteDropletsGrid({ sortKey }: { sortKey?: string }) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const userId = await getAuthorizedUserId(user);
  if (!userId) return null;

  // Favorites live on the droplet relation, not on enrollments, so a droplet
  // favorited without enrolling still appears. Enrollments only add progress.
  const [favoritedIds, enrollments] = await Promise.all([
    getFavoritedDropletIds(userId),
    getCachedEnrollmentsFavorites(userId),
  ]);

  const favoritedDroplets =
    favoritedIds.length > 0
      ? await getDroplets({
          filters: { id: { $in: favoritedIds } },
          populate: FAVORITE_DROPLET_POPULATE,
          pagination: { pageSize: favoritedIds.length, page: 1 },
        })
      : [];

  const enrollmentsWithDroplet = enrollments.filter(hasDroplet);
  const completedLessonIds = enrollmentsWithDroplet.flatMap(
    (enrollment) =>
      enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
  );

  const dropletsWithCompletion = favoritedDroplets.map((droplet) => {
    const dropletLessonIds = droplet.lessons?.map((l: Lesson) => l.id) || [];
    const completedLessonsInDroplet = completedLessonIds.filter((id) =>
      dropletLessonIds.includes(id),
    );
    const completionPercentage =
      dropletLessonIds.length > 0
        ? (completedLessonsInDroplet.length / dropletLessonIds.length) * 100
        : 0;

    return {
      ...droplet,
      completionPercentage,
    };
  });

  if (!dropletsWithCompletion || dropletsWithCompletion.length === 0) {
    return (
      <EmptyState
        icon={
          <IconHeart
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No favorited droplets"
        message="You haven't favorited any droplets yet."
        className="min-h-[calc(100vh-var(--header-h)-196px)]"
      />
    );
  }

  const ratingsMap = new Map<number, number>(
    dropletsWithCompletion.map((d) => [d.id, d.averageRating ?? 0]),
  );

  return (
    <EnrolledDropletsGridClient
      dropletsWithCompletion={dropletsWithCompletion}
      completedLessonIds={completedLessonIds}
      isArchived={false}
      isFavorited={true}
      ratingsMap={ratingsMap}
      sortKey={sortKey}
      currentUserId={userId}
      isAdmin={isAuthorizedUserAdmin(user?.roles)}
    />
  );
}
