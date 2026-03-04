import { Metadata } from "next";
import {
  getCachedUser,
  getCachedEnrollmentsWithLessonIds,
  getCachedDropletBySlug,
} from "@/lib/requests/cached";
import { updateCompletionDate } from "@/lib/requests/enrollment";
import { getLessonBySlug } from "@/lib/requests/lesson";
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

  const [droplet, lesson, currentUser] = await Promise.all([
    getCachedDropletBySlug(slug),
    getLessonBySlug(lessonSlug),
    getCurrentUser(),
  ]);

  let completedLessonIds: number[] = [];
  let enrollmentId: string | undefined;

  if (!currentUser || !currentUser?.email) return notFound();

  const authUser = await getCachedUser(currentUser.email);
  const enrollments = await getCachedEnrollmentsWithLessonIds(authUser.id);

  const enrollment = enrollments.find((e) => e.droplet.id === droplet.id);

  if (enrollment) {
    enrollmentId = enrollment.id;
    completedLessonIds =
      enrollment.viewedLessons?.map((l: { id: number }) => l.id) || [];
    if (
      completedLessonIds.length === enrollment.droplet.lessons?.length &&
      !enrollment.completionDate
    ) {
      await updateCompletionDate(enrollment.id);
    }
  }

  const isAuthor =
    droplet.authorized_users &&
    droplet.authorized_users.map((author) => author.id).includes(authUser.id);

  return (
    <div className="flex h-full w-full flex-row">
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
