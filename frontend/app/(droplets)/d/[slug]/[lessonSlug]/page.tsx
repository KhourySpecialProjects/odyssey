import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getAuthorizedUserActivity } from "@/lib/requests/authorized-user-activity";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { getServerSession } from "next-auth";

export default async function LessonPage({ 
  params 
}: { 
  params: { slug: string; lessonSlug: string } 
}) {
  const session = await getServerSession();
  let activityId: number | undefined;
  let completedLessonIds: number[] = [];

  if (session?.user?.email) {
    const user = await getAuthorizedUserByEmail(session.user.email);
    const activity = await getAuthorizedUserActivity(user.id);
    if (activity) {
      activityId = activity.id;
      completedLessonIds = activity.lessons?.map(l => l.id) || [];
    } else {
      // Create a new activity record if one doesn't exist
      const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/authorized-user-activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            authorized_user: user.id,
            lessons: []
          }
        })
      });

      if (response.ok) {
        const newActivity = await response.json();
        activityId = newActivity.data.id;
      }
    }
  }

  const lesson = await getLessonBySlug(params.lessonSlug);

  return (
    <LessonRenderer 
      lesson={lesson} 
      activityId={activityId}
      completedLessonIds={completedLessonIds}
    />
  );
}
