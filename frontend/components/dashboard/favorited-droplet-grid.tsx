import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { EnrolledDropletsGridClient } from "./enrolled-droplets-grid-client";
import { Lesson } from "@/types";

export async function FavoriteDropletsGrid({ sortKey }: { sortKey?: string }) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);

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
      <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
        <MessageHeader subtitle="No Results" title="No Favorited Droplets" />
        <MessageDescription>
          You haven&apos;t favorited any Droplets yet.
        </MessageDescription>
      </Message>
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
    />
  );
}
