// base-enrolled-droplets-grid.tsx
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
import { getFavorites } from "@/lib/requests/favorite";

interface Lesson {
  id: number;
  name: string;
  slug: string;
}

type EnrollmentFilter = 
  | { type: "active" }
  | { type: "archived" }
  | { type: "favorited" };

interface AbstractEnrollmentsGridProps {
  sortKey?: string;
  tags?: string[] | string;
  type?: string | string[];
  focusArea?: string | string[];
  filter: EnrollmentFilter;
  emptyStateConfig: {
    title: string;
    subtitle: string;
    description: string;
  };
}

export async function AbstractEnrollmentsGrid({
  sortKey,
  tags,
  type,
  focusArea,
  filter,
  emptyStateConfig,
}: AbstractEnrollmentsGridProps) {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);

  // For favorited filter, fetch favorites and create a Set of favorited droplet IDs
  let favoritedDropletIds: Set<number> | null = null;
  if (filter.type === "favorited") {
    const favorites = await getFavorites();
    favoritedDropletIds = new Set(favorites.map((fav) => fav.droplet.id));
  }

  // Apply filter based on type
  const filteredEnrollments = enrollments.filter((e) => {
    switch (filter.type) {
      case "active":
        return e.isArchived !== true;
      case "archived":
        return e.isArchived === true;
      case "favorited":
        return favoritedDropletIds?.has(e.droplet.id) ?? false;
      default:
        return true;
    }
  });

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
        <MessageHeader
          subtitle={emptyStateConfig.subtitle}
          title={emptyStateConfig.title}
        />
        <MessageDescription>{emptyStateConfig.description}</MessageDescription>
      </Message>
    );
  }

  // Only fetch due dates for active enrollments
  const dueDates = await getUserDueDates(authorizedUser.id)

  // Build props conditionally
  const clientProps = {
    dropletsWithCompletion,
    completedLessonIds,
    sortKey,
    ratingsMap,
    tags,
    type,
    focusArea,
    ...(filter.type === "active" && { isArchived: false, dueDates }),
    ...(filter.type ===  "archived" && { isArchived: true }),
    ...(filter.type === "favorited" && { isFavorited: true }),
  };

  if (filter.type == "archived") {
    return (
        <EnrolledDropletsGridClient
          dropletsWithCompletion={dropletsWithCompletion}
          completedLessonIds={completedLessonIds}
          isArchived={true}
          ratingsMap={ratingsMap}
          sortKey={sortKey}
        />
      );
  } else if (filter.type == "active") {
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
    />
  );
  }
}