import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCachedDropletBySlug,
  getCachedLessonBySlug,
  getCachedUser,
  getCachedEnrollmentsWithLessonIds,
} from "@/lib/requests/cached";
import {
  isAuthorizedUserAdmin,
  stripHtmlTags,
  uppercaseFirstChar,
} from "@/lib/utils";
import { PresentationShell } from "@/components/presentation/presentation-shell";
import { NoPresentationWarning } from "@/components/presentation/no-presentation-warning";
import { splitBlocksIntoSlides, Slide } from "@/components/presentation/utils";
import { Lesson } from "@/types";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PresentationPage({ params }: Props) {
  const { slug } = await params;

  const [user, droplet] = await Promise.all([
    getCurrentUser(),
    getCachedDropletBySlug(slug),
  ]);

  if (!droplet) return notFound();
  if (!user) return notFound();

  const authorizedUser = user.email ? await getCachedUser(user.email) : null;

  const isAdmin = isAuthorizedUserAdmin(user.roles);
  const isAuthor =
    droplet.authorized_users
      ?.map((au: { id: number }) => au.id)
      .includes(authorizedUser?.id ?? -1) ?? false;

  let isEnrolled = false;
  if (authorizedUser) {
    const enrollments = await getCachedEnrollmentsWithLessonIds(
      authorizedUser.id,
    );
    isEnrolled = enrollments.some((e) => e.droplet?.id === droplet.id);
  }

  if (!isAdmin && !isAuthor && !isEnrolled) return notFound();

  const tags = [
    uppercaseFirstChar(droplet.focusArea),
    uppercaseFirstChar(droplet.type),
    ...(droplet.tags?.map((t: { name: string }) => t.name) ?? []),
  ];

  const sortedLessons = [...(droplet.lessons ?? [])].sort(
    (a: { orderIndex: number }, b: { orderIndex: number }) =>
      a.orderIndex - b.orderIndex,
  );

  const lessonNames = sortedLessons.map((l: { name: string }) => l.name);

  return (
    <Suspense
      fallback={
        <PresentationShell
          dropletName={droplet.name}
          dropletSlug={slug}
          dropletDescription={
            droplet.description ? stripHtmlTags(droplet.description) : undefined
          }
          dropletTags={tags}
          dropletOverview={droplet.overview || undefined}
          dropletObjectives={
            droplet.learningObjectives?.map(
              (o: { objective: string }) => o.objective,
            ) ?? []
          }
          dropletAuthors={
            droplet.authorized_users?.map(
              (a: { firstName: string; lastName: string }) => ({
                firstName: a.firstName,
                lastName: a.lastName,
              }),
            ) ?? []
          }
          allSlides={[]}
          lessonNames={[]}
        />
      }
    >
      <LessonContentLoader
        droplet={droplet}
        slug={slug}
        tags={tags}
        sortedLessons={sortedLessons}
        lessonNames={lessonNames}
      />
    </Suspense>
  );
}

/** Async component that fetches all lessons — streams in via Suspense */
async function LessonContentLoader({
  droplet,
  slug,
  tags,
  sortedLessons,
  lessonNames,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  droplet: any;
  slug: string;
  tags: string[];
  sortedLessons: { slug: string; name: string }[];
  lessonNames: string[];
}) {
  const lessonContents: Lesson[] = await Promise.all(
    sortedLessons.map((l) => getCachedLessonBySlug(l.slug)),
  );

  const allSlides: Slide[][] = lessonContents.map((lesson, idx) =>
    splitBlocksIntoSlides(lesson, idx),
  );

  const nonEmptySlides = allSlides.filter((slides) => slides.length > 0);
  const nonEmptyLessonNames = lessonContents
    .map((l, idx) => ({ name: l.name, hasSlides: allSlides[idx].length > 0 }))
    .filter((l) => l.hasSlides)
    .map((l) => l.name);

  if (nonEmptySlides.length === 0) {
    return <NoPresentationWarning dropletSlug={slug} />;
  }

  return (
    <PresentationShell
      dropletName={droplet.name}
      dropletSlug={slug}
      dropletDescription={
        droplet.description ? stripHtmlTags(droplet.description) : undefined
      }
      dropletTags={tags}
      dropletOverview={droplet.overview || undefined}
      dropletObjectives={
        droplet.learningObjectives?.map(
          (o: { objective: string }) => o.objective,
        ) ?? []
      }
      dropletAuthors={
        droplet.authorized_users?.map(
          (a: { firstName: string; lastName: string }) => ({
            firstName: a.firstName,
            lastName: a.lastName,
          }),
        ) ?? []
      }
      allSlides={nonEmptySlides}
      lessonNames={
        nonEmptyLessonNames.length > 0 ? nonEmptyLessonNames : lessonNames
      }
    />
  );
}
