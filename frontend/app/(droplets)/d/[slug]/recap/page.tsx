import { DropletTile } from "@/components/droplets/droplet-tile";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getDropletBySlug, getDroplets } from "@/lib/requests/droplet";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Droplet } from "@/types";
import { GoalIcon, Link2Icon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StarRating } from "@/components/ui/rating-stars";
import {
  getCachedUser,
  getCachedEnrollmentsWithLessonIds,
  getCachedDropletBySlug,
} from "@/lib/requests/cached";
import { updateCompletionDate } from "@/lib/requests/enrollment";
import { getCurrentUser } from "@/lib/auth/session";
import { CompletedDropletBlock } from "@/components/droplets/completed-droplet-block";
import { getNotesByDroplet } from "@/lib/requests/notes";
import { getHighlightsByDroplet } from "@/lib/requests/highlights";
import { NotesContainer } from "@/components/droplets/notes-container";
import { NotesPdfButton } from "@/components/droplets/notes-pdf-button";
import { NoteSummary } from "@/components/droplets/lessons/note-taking/note-summary";
import { redirect } from "next/navigation";
import { Confetti } from "./confetti";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const droplet = await getCachedDropletBySlug(p.slug);

  if (!droplet) {
    return notFound();
  }

  return {
    title: `Recap | ${droplet.name}`,
  };
}

export default async function DropletRecapRoute({ params }: Props) {
  const p = await params;
  const [droplet, currentUser] = await Promise.all([
    getCachedDropletBySlug(p.slug),
    getCurrentUser(),
  ]);
  if (!droplet) {
    return notFound();
  }

  if (!currentUser?.email) {
    redirect(`/d/${p.slug}`);
  }

  const dropletRecommendations = await getDroplets({
    fields: ["*"],
    filters: {
      $and: [
        { slug: { $nei: p.slug } },
        droplet.tags && {
          tags: { slug: { $in: droplet.tags.map((tag) => tag.slug) } },
        },
        {
          $or: [{ status: "published" }, { status: { $null: true } }],
        },
      ],
    },
    pagination: {
      page: 1,
      pageSize: 4,
    },
    populate: { tags: { populate: "*" } },
  });

  const authUser = await getCachedUser(currentUser.email);

  const [enrollments, highlights, notes] = await Promise.all([
    getCachedEnrollmentsWithLessonIds(authUser.id),
    getHighlightsByDroplet(authUser.id, droplet.id),
    getNotesByDroplet(authUser.id, droplet.id),
  ]);

  let enrollID: string = "";
  const filteredHighlights = highlights.filter(
    (highlight) =>
      !notes.some((lesson) => lesson.highlight?.id === highlight.id),
  );

  const enrollment = enrollments.find((e) => e.droplet.id === droplet.id);

  if (enrollment) {
    enrollID = enrollment.id;
  }

  const allNotes = {
    dropletId: enrollment?.droplet.id || 1,
    notes: notes,
    highlights: filteredHighlights,
  };

  const pdfBytes = await NoteSummary({ filteredHighlights, notes, droplet });

  if (
    enrollment &&
    enrollment.isComplete === true &&
    !enrollment.completionDate
  ) {
    await updateCompletionDate(enrollment.id);
  }

  return (
    <>
      {enrollment &&
        enrollment.viewedLessons.length ===
          enrollment.droplet.lessons?.length &&
        !(enrollment.isFirstTime === false) && (
          <>
            <CompletedDropletBlock
              droplet={droplet}
              enrollment={enrollment}
              authUser={authUser}
            />
            <Confetti />
          </>
        )}

      <div className="mx-auto max-w-2xl">
        <h1 className="mt-3 text-6xl font-black text-slate-900 dark:text-white">
          Recap
        </h1>
      </div>
      <div className="mx-auto w-full max-w-2xl space-y-8 py-8 md:space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Learning Objectives
          </h2>
          <p className="text-slate-500 dark:text-slate-300">
            Now that you have completed this Droplet, you should:
          </p>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-800">
            <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
              {droplet.learningObjectives.map((objective) => (
                <li
                  key={objective.id}
                  className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                >
                  <GoalIcon className="mr-0.5 h-5 w-5 shrink-0" />
                  {objective.objective}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {enrollID && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Notes
            </h2>
            <p className="pb-2 text-slate-500 dark:text-slate-300">
              A collection of notes and highlights that you created throughout
              this droplet:
            </p>
            {(allNotes.highlights.length > 0 || allNotes.notes.length > 0) && (
              <section>
                <NotesPdfButton
                  pdfBytes={pdfBytes}
                  name={`${droplet.name.replace(/\s/g, "")}-notes`}
                  noNotes={
                    !(
                      allNotes.highlights.length > 0 ||
                      allNotes.notes.length > 0
                    )
                  }
                />
              </section>
            )}
            <NotesContainer
              allNotes={allNotes}
              dropletHighlights={filteredHighlights}
              dropletNotes={notes}
              mappedLessons={droplet.lessons || []}
            />
          </section>
        )}

        {droplet.nextSteps && droplet.nextSteps.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Learn More
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
              To further your understanding, we recommend exploring:
            </p>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-800">
              <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                {droplet.nextSteps.map((resource) => (
                  <li key={resource.id}>
                    <Link
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 leading-snug transition-colors hover:text-sky-700 dark:text-slate-300"
                    >
                      <Link2Icon className="mr-0.5 h-5 w-5 shrink-0" />
                      {resource.label ?? resource.url}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {dropletRecommendations && dropletRecommendations.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Extend Your Odyssey
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
              Have you explored these Droplets yet?
            </p>

            <ul className="mt-4 grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2">
              {dropletRecommendations.map((droplet) => (
                <DropletTile key={droplet.id} droplet={droplet} />
              ))}
            </ul>
          </section>
        ) : null}

        {/* {droplet.lessons && droplet.lessons.length > 0 ? (
          <section>
            <Button size="lg" after={<ArrowRightIcon />} asChild>
              <Link href={`/d/${droplet.slug}/${droplet.lessons[0].slug}`}>
                Begin Droplet
              </Link>
            </Button>
          </section>
        ) : null} */}

        {enrollID ? (
          <section>
            <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-300">
              Rate this Droplet!
            </h2>
            <StarRating value={0} enrollmentID={enrollID} average={false} />
          </section>
        ) : null}
      </div>
    </>
  );
}
