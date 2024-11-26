import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { getServerSession } from "next-auth";

export default async function LessonPage({ 
  params 
}: { 
  params: { slug: string; lessonSlug: string } 
}) {
  const session = await getServerSession();
  let enrollmentId: string | undefined;
  let completedLessonIds: number[] = [];

  if (session?.user?.email) {
    const user = await getAuthorizedUserByEmail(session.user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(user.id);
    
    // Find the enrollment for this droplet
    const droplet = await getDropletBySlug(params.slug);
    const enrollment = enrollments.find(e => e.droplet.id === droplet.id);
    
    if (enrollment) {
      enrollmentId = enrollment.id;
      completedLessonIds = enrollment.viewedLessons?.map(l => l.id) || [];
    }
  }

  const lesson = await getLessonBySlug(params.lessonSlug);

  return (
    <LessonRenderer 
      lesson={lesson} 
      enrollmentId={enrollmentId}
      completedLessonIds={completedLessonIds}
    />
  );
}
