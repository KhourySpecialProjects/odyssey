import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { DropletTile } from "../droplets/droplet-tile";

interface Lesson {
  id: number;
  name: string;
  slug: string;
}

export async function EnrolledDropletsGrid() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id, {
    populate: {
      droplet: {
        populate: {
          tags: true,
          lessons: {
            fields: ["id", "name", "slug"],
          },
        },
      },
      viewedLessons: {
        fields: ["id", "name", "slug"],
      },
    },
  });
  console.log("user id is ", authorizedUser.id);
  console.log("droplet grid is filled with :", enrollments);

  const completedLessonIds = enrollments.flatMap(
    (enrollment) =>
      enrollment.viewedLessons?.map((lesson: Lesson) => lesson.id) || [],
  );

  const dropletsWithCompletion = enrollments.map((enrollment) => {
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
      <Message className="mb-8 border border-dashed rounded-md border-slate-200">
        <MessageHeader subtitle="No Results" title="No Enrolled Droplets" />
        <MessageDescription>
          You haven&apos;t enrolled in any Droplets yet.
        </MessageDescription>
      </Message>
    );
  }

  return (
    <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {dropletsWithCompletion.map((droplet) => (
        <DropletTile
          key={droplet.id}
          droplet={droplet}
          isEnrolled={true}
          completedLessonIds={completedLessonIds}
        />
      ))}
    </ul>
  );
}
