import { Metadata } from "next";
import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getDropletBySlug } from "@/lib/requests/droplet";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { getServerSession } from "next-auth";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

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
      authors: { populate: "*" },
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
    const enrollment = enrollments.find((e) => e.droplet.id === droplet.id);

    if (enrollment) {
      enrollmentId = enrollment.id;
      completedLessonIds =
        enrollment.viewedLessons?.map((l: { id: number }) => l.id) || [];
    }
  }

  const currentUser = await getCurrentUser();
  if (
    !currentUser ||
    !currentUser?.email 
  )
    return redirect("/");
  const authUser = await getAuthorizedUserByEmail(currentUser.email);
  const userAuthor = await getAuthorByAuthorizedUserEmail(
    session?.user.email || "",
  );
  const isAuthor =
    userAuthor &&
    droplet.authors &&
    droplet.authors.map((author) => author.id).includes(userAuthor.id);

  return (
    <LessonRenderer
      lesson={lesson}
      droplet={droplet}
      enrollmentId={enrollmentId}
      completedLessonIds={completedLessonIds}
      user={currentUser}
      author={isAuthor || false}
      authUser={authUser}
    />
  );
}
