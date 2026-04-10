import { getCurrentUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { IconArchive } from "@tabler/icons-react";
import {
  getCachedUserDashboardFull,
  getCachedEnrollmentsFavorites,
} from "@/lib/requests/cached";
import { EnrolledDropletsGridClient } from "./enrolled-droplets-grid-client";

interface Lesson {
  id: number;
  name: string;
  slug: string;
}

export async function ArchivedDropletsGrid({ sortKey }: { sortKey?: string }) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getCachedUserDashboardFull(user.email);
  const enrollments = await getCachedEnrollmentsFavorites(authorizedUser.id);

  const filteredEnrollments = enrollments.filter((e) => e.isArchived === true);

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
          <IconArchive
            className="h-7 w-7 text-[#475569] dark:text-slate-400"
            stroke={1.5}
          />
        }
        title="No archived droplets"
        message="You haven't archived any droplets yet."
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
      isArchived={true}
      ratingsMap={ratingsMap}
      sortKey={sortKey}
      currentUser={authorizedUser}
    />
  );
}
