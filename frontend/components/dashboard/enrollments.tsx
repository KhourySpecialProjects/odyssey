import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { notFound } from "next/navigation";
import { DropletTile } from "../droplets/droplet-tile";

export async function Enrollments() {
  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  const enrollments = await getEnrollmentsByAuthorizedUser(authorizedUser.id, {
    populate: {
      droplet: {
        populate: {
          tags: true,
          lessons: {
            fields: ['id', 'name', 'slug']
          }
        }
      },
      viewedLessons: {
        fields: ['id', 'name', 'slug']
      }
    }
  });

  return (
    <ul className="grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {enrollments.map((enrollment) => {
        const completedLessonIds = enrollment.viewedLessons?.map(l => l.id) || [];
        return (
          <DropletTile 
            key={enrollment.id} 
            droplet={enrollment.droplet} 
            isEnrolled={true}
            completedLessonIds={completedLessonIds}
          />
        );
      })}
    </ul>
  );
}
