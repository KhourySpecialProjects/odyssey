import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getDroplets } from "@/lib/requests/droplet";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { DropletTile } from "../droplets/droplet-tile";

export async function DropletsGrid({
  sortKey,
  searchValue,
  type,
  focusArea,
  tags,
}: {
  searchValue?: string;
  sortKey?: string;
  type?: string;
  focusArea?: string;
  tags?: string;
}) {
  const droplets = await getDroplets({
    sort: sortKey,
    filters: {
      $and: [
        { status: { $eq: "published" } },
        { isHidden: false },
        searchValue ? { name: { $containsi: searchValue } } : {},
        type
          ? { $or: type.split(",").map((val) => ({ type: { $eq: val } })) }
          : {},
        focusArea
          ? {
              $or: focusArea
                .split(",")
                .map((val) => ({ focusArea: { $eq: val } })),
            }
          : {},
        tags
          ? {
              $or: tags
                .split(",")
                .map((val) => ({ tags: { slug: { $eq: val } } })),
            }
          : {},
      ],
    },
    populate: {
      tags: true,
      lessons: {
        fields: ['id', 'name', 'slug']
      }
    },
  });

  const user = await getCurrentUser();
  let enrolledDropletIds: number[] = [];
  let completedLessonIds: number[] = [];

  if (user?.email) {
    const authorizedUser = await getAuthorizedUserByEmail(user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
    enrolledDropletIds = enrollments.map(e => e.droplet.id);
    completedLessonIds = enrollments.flatMap(enrollment => 
      enrollment.viewedLessons?.map(lesson => lesson.id) || []
    );
  }

  if (!droplets || droplets.length === 0) {
    return (
      <Message className="mb-8 border border-dashed rounded-md border-slate-200">
        <MessageHeader subtitle="No Results" title="No Droplets Found" />
        <MessageDescription>
          There are no Droplets that match &quot;{searchValue}&quot;.
        </MessageDescription>
      </Message>
    );
  }

  return (
    <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {droplets.map((droplet) => (
        <DropletTile 
          key={droplet.id} 
          droplet={droplet}
          isEnrolled={enrolledDropletIds.includes(droplet.id)}
          completedLessonIds={completedLessonIds}
        />
      ))}
    </ul>
  );
}
