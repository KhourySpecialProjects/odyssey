import { Metadata } from "next";
import {
  getCachedUser,
  getCachedEnrollmentsWithLessonIds,
  getCachedDropletBySlug,
  getCachedLessonBySlug,
} from "@/lib/requests/cached";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserId } from "@/lib/auth/current-user-id";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { getHighlightsByAuthorizedUserAndLesson } from "@/lib/requests/highlights";
import { notFound } from "next/navigation";
import { Highlight, Note } from "@/types";
import { DropletLessonWrapper } from "@/components/droplets/lessons/droplet-lesson-wrapper";
import { CompletionBackfill } from "@/components/droplets/completion-backfill";
import { enrollmentNeedsCompletionBackfill } from "@/lib/enrollment-completion";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
  lessonSlug: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const lesson = await getCachedLessonBySlug(p.lessonSlug);
  if (!lesson) return {};

  return {
    title: lesson.name,
  };
}

export default async function Page({ params }: Props) {
  const p = await params;
  const { slug, lessonSlug } = p;

  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser?.email) return notFound();
  const userId = await getAuthorizedUserId(currentUser);
  if (!userId) return notFound();

  // Notes and highlights are keyed by lesson slug so they load alongside the
  // lesson. A failed read shows none instead of failing the whole lesson.
  const [droplet, lesson, authUser, enrollments, notes, highlights] =
    await Promise.all([
      getCachedDropletBySlug(slug),
      getCachedLessonBySlug(lessonSlug),
      getCachedUser(currentUser.email),
      getCachedEnrollmentsWithLessonIds(userId),
      getNotesByAuthorizedUserAndLesson(userId, lessonSlug).catch(
        (): Note[] => [],
      ),
      getHighlightsByAuthorizedUserAndLesson(userId, lessonSlug).catch(
        (): Highlight[] => [],
      ),
    ]);

  let completedLessonIds: number[] = [];
  let enrollmentId: string | undefined;

  if (!droplet || !lesson || !authUser) return notFound();

  const enrollment = enrollments.find((e) => e.droplet.id === droplet.id);

  if (enrollment) {
    enrollmentId = enrollment.id;
    completedLessonIds =
      enrollment.viewedLessons?.map((l: { id: number }) => l.id) || [];
  }

  const isAuthor =
    droplet.authorized_users &&
    droplet.authorized_users.map((author) => author.id).includes(authUser.id);

  return (
    <div className="flex h-full w-full flex-row">
      {enrollment && enrollmentNeedsCompletionBackfill(enrollment) && (
        <CompletionBackfill enrollmentId={enrollment.id} />
      )}
      <div className="w-full">
        {/* Keyed by lesson so notes/highlight state never carries over */}
        <DropletLessonWrapper
          key={lesson.id}
          lesson={lesson}
          droplet={droplet}
          enrollmentId={enrollmentId}
          completedLessonIds={completedLessonIds}
          user={currentUser}
          author={isAuthor || false}
          authUser={authUser}
          userId={authUser.id}
          initialNotes={notes ?? []}
          initialHighlights={highlights ?? []}
        />
      </div>
    </div>
  );
}
