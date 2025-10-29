import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { EnrolledDropletsGridClient } from "./enrolled-droplets-grid-client";
import { getUserDueDates } from "@/lib/requests/groups";

interface Lesson {
  id: number;
  name: string;
  slug: string;
}

export async function EnrolledDropletsGrid({
  sortKey,
  tags,
  type,
  focusArea,
}: {
  sortKey?: string;
  tags?: string[] | string;
  type?: string | string[];
  focusArea?: string | string[];
}) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
  
  const uniqueEnrollments = enrollments.filter((enrollment, index, self) =>
    index === self.findIndex((e) => e.droplet === enrollment.droplet)
  );

  const filteredEnrollments = enrollments.filter((e) => e.isArchived !== true);

  const completedLessonIds = filteredEnrollments.flatMap(
    (enrollment) =>
      enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
  );

  const dropletsWithCompletion = filteredEnrollments.map((enrollment) => {
    const droplet = enrollment.droplet;
    const dropletLessonIds = droplet.lessons?.map((l: Lesson) => l.id) || [];
    const completedLessonsInDroplet = completedLessonIds.filter((id) =>
      dropletLessonIds?.includes(id),
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

  const ratingsMap = new Map<number, number>(
    dropletsWithCompletion.map((d) => [d.id, d.averageRating ?? 0]),
  );

  if (!dropletsWithCompletion || dropletsWithCompletion.length === 0) {
    return (
      <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
        <MessageHeader subtitle="No Results" title="No Enrolled Droplets" />
        <MessageDescription>
          You haven&apos;t enrolled in any Droplets yet.
        </MessageDescription>
      </Message>
    );
  }

  const dueDates = await getUserDueDates(authorizedUser.id);

  return (
    <EnrolledDropletsGridClient
      dropletsWithCompletion={dropletsWithCompletion}
      completedLessonIds={completedLessonIds}
      isArchived={false}
      dueDates={dueDates}
      sortKey={sortKey}
      ratingsMap={ratingsMap}
      tags={tags}
      type={type}
      focusArea={focusArea}
      currentUser={authorizedUser}
    />
  );
}
