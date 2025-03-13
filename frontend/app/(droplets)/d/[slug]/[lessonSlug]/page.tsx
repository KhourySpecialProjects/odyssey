import { Metadata } from "next";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { getServerSession } from "next-auth";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { DropletLessonWrapper } from "@/components/droplets/lessons/droplet-lesson-wrapper";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
  lessonSlug: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const lesson = await getLessonBySlug(p.lessonSlug);
  if (!lesson) return {};

  return {
    title: lesson.name,
  };
}

export default async function Page({ params }: Props) {
  const p = await params;
  const { slug, lessonSlug } = p;

  const droplet = await getDropletBySlug(slug, {
    populate: {
      authorized_users: { populate: "*" },
      droplet_lessons: {
        populate: ["lesson"],
        sort: ["orderIndex:asc"],
      },
    },
  });

  const lesson = await getLessonBySlug(lessonSlug);

  //TODO: Clean up this section - there are too many accesses to
  // user functions

  // Get completed lessons
  const session = await getServerSession();
  let completedLessonIds: number[] = [];
  let enrollmentId: string | undefined;

  if (session?.user?.email) {
    const user = await getAuthorizedUserByEmail(session.user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(user.id);
    console.log("enrollments", enrollments);

    const enrollment = enrollments.find((e) => e.droplet.id === droplet.id);

    if (enrollment) {
      enrollmentId = enrollment.id;
      completedLessonIds =
        enrollment.viewedLessons?.map((l: { id: number }) => l.id) || [];
    }
  }

  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser?.email) return notFound();
  const authUser = await getAuthorizedUserByEmail(currentUser.email);

  const isAuthor =
    droplet.authorized_users &&
    droplet.authorized_users.map((author) => author.id).includes(authUser.id);

  return (
    <div className="flex flex-row w-full h-full">
      <div className="w-full">
        <DropletLessonWrapper
          lesson={lesson}
          droplet={droplet}
          enrollmentId={enrollmentId}
          completedLessonIds={completedLessonIds}
          user={currentUser}
          author={isAuthor || false}
          authUser={authUser}
          userId={authUser.id}
        />
      </div>
    </div>
  );
}
