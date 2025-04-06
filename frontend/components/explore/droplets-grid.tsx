import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import {
  getDropletAverageRating,
  getEnrollmentsByAuthorizedUser,
} from "@/lib/requests/enrollment";
import { DropletTile } from "../droplets/droplet-tile";
import { SortedDropletsGrid } from "./sorted-droplets-grid";
import { Droplet, DueDate, Enrollment } from "@/types";
import { getUserDueDates } from "@/lib/requests/groups";

interface Lesson {
  id: number;
  name: string;
  slug: string;
}

export async function DropletsGrid({
  sortKey,
  completion,
  droplets,
}: {
  sortKey?: string;
  completion?: boolean;
  droplets: Droplet[];
}) {
  const user = await getCurrentUser();
  let enrolledDropletIds: number[] = [];
  let completedDropletIds: number[] = [];
  let completedLessonIds: number[] = [];

  let enrollments: Enrollment[] = [];
  let dueDates: DueDate[] = [];

  if (user?.email) {
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);

    enrolledDropletIds = enrollments.map((e) => e.droplet.id);
    completedLessonIds = enrollments.flatMap(
      (enrollment) =>
        enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
    );
    completedDropletIds = enrollments
      .filter((e) => e.viewedLessons.length === e.droplet.lessons?.length)
      .map((d) => d.droplet.id);
    dueDates = await getUserDueDates(authorizedUser.id);
  }

  let dropletsWithCompletion = droplets.map((droplet) => {
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
      <Message className="mb-8 border border-dashed rounded-md border-slate-200 dark:border-slate-500 dark:bg-slate-800">
        <MessageHeader subtitle="No Results" title="No Droplets Found" />
        <MessageDescription>
          There are no droplets that match those filters.
        </MessageDescription>
      </Message>
    );
  }

  const ratingsMap = new Map();
  await Promise.all(
    dropletsWithCompletion.map(async (droplet) => {
      const rating = await getDropletAverageRating(droplet);
      ratingsMap.set(droplet.id, rating);
    }),
  );

  if (completion) {
    const completedDroplets = dropletsWithCompletion.filter(
      (droplet) => droplet.completionPercentage === 100,
    );
    if (completedDroplets.length === 0) {
      return (
        <div className="text-black dark:text-slate-300">
          You haven&apos;t completed any Droplets yet.
        </div>
      );
    }
    return (
      <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {completedDroplets.map((droplet) => (
          <DropletTile
            key={droplet.id}
            droplet={droplet}
            isEnrolled={enrolledDropletIds.includes(droplet.id)}
            completedLessonIds={completedLessonIds}
            profilePage={true}
            dueDate={
              dueDates?.find((dueDate) => dueDate.droplet?.id === droplet.id)
                ?.dueDate || ""
            }
          />
        ))}
      </ul>
    );
  }

  return (
    <SortedDropletsGrid
      droplets={dropletsWithCompletion}
      sortKey={sortKey}
      completedLessonIds={completedLessonIds}
      enrolledDropletIds={enrolledDropletIds}
      ratingsMap={ratingsMap}
      dueDates={dueDates}
    />
  );
}
