import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCachedUserDashboardFull,
  getCachedEnrollmentsFavorites,
} from "@/lib/requests/cached";
import { EnrolledDropletsGridClient } from "./enrolled-droplets-grid-client";
import { Lesson } from "@/types";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { IconHeart } from "@tabler/icons-react";

export async function FavoriteDropletsGrid({ sortKey }: { sortKey?: string }) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getCachedUserDashboardFull(user.email);
  const enrollments = await getCachedEnrollmentsFavorites(authorizedUser.id);

  // Fixed: Added return and compare IDs instead of objects
  const filteredEnrollments = enrollments.filter((e) =>
    e.droplet.usersFavorited?.some((user) => user.id === authorizedUser.id),
  );

  const completedLessonIds = filteredEnrollments.flatMap(
    (enrollment) =>
      enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
  );

  const dropletsWithCompletion = filteredEnrollments.map((enrollment) => {
    const droplet = enrollment.droplet;
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
      currentUser={authorizedUser}
      isAdmin={isAuthorizedUserAdmin(user?.roles)}
    />
  );
}
