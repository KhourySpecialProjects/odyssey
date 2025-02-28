import { DropletTile } from "@/components/droplets/droplet-tile";
import { getDropletBySlug, getDroplets } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import { GoalIcon, HighlighterIcon, Link2Icon, NotebookPen } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StarRating } from "@/components/ui/rating-stars";
import { Confetti } from "./confetti";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getServerSession } from "next-auth";
import { CompletedDropletBlock } from "@/components/droplets/completed-droplet-block";
import { getNotesByAuthorizedUserAndLesson, getNotesByDroplet } from "@/lib/requests/notes";
import { getHighlightsByDroplet } from "@/lib/requests/highlights";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const droplet = await getDropletBySlug<Droplet>(p.slug, {
    fields: ["*"],
    populate: {
      learningObjectives: { populate: "*" },
      tags: { populate: "*" },
      nextSteps: { populate: "*" },
      lessons: {
        fields: ["id", "name", "slug"],
      },
      droplet_lessons: {
        populate: {
          lesson: {
            fields: ["id", "name", "slug"],
          },
        },
      },
    },
  });

  if (!droplet) {
    console.error("not found");
    return notFound();
  }

  return {
    title: `Recap | ${droplet.name}`,
  };
}

export default async function DropletRecapRoute({ params }: Props) {
  const p = await params;
  const droplet = await getDropletBySlug<Droplet>(p.slug, {
    fields: ["*"],
    populate: {
      learningObjectives: { populate: "*" },
      tags: { populate: "*" },
      nextSteps: { populate: "*" },
    },
  });
  if (!droplet) {
    console.error("not found");
    return notFound();
  }

  const dropletRecommendations = await getDroplets({
    fields: ["*"],
    filters: {
      $and: [
        { slug: { $nei: p.slug } },
        droplet.tags && {
          tags: { slug: { $in: droplet.tags.map((tag) => tag.slug) } },
        },
      ],
    },
    pagination: {
      page: 1,
      pageSize: 4,
    },
    populate: { tags: { populate: "*" } },
  });

  const session = await getServerSession();
  if (session?.user?.email) {
    const user = await getAuthorizedUserByEmail(session.user.email);
    const enrollments = await getEnrollmentsByAuthorizedUser(user.id, {
      populate: {
        viewedLessons: {
          fields: ["id", "name", "slug"],
        },
        droplet: {
          populate: {
            lessons: {
              fields: ["id", "name", "slug"],
            },
          },
        },
      },
    });


  const authUser = await getAuthorizedUserByEmail(user.email);
  let enrollID: string = "";
  const highlights = await getHighlightsByDroplet(authUser.id, droplet.id);
  const notes = await getNotesByDroplet(authUser.id, droplet.id)

    const enrollment = enrollments.find((e) => e.droplet.id === droplet.id);

    if (enrollment) {
      enrollID = enrollment.id;
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

        <div className="max-w-2xl mx-auto">
          <h1 className="mt-3 text-6xl font-black text-slate-900 dark:text-white">
            Recap
          </h1>
        </div>
        <div className="w-full max-w-2xl py-8 mx-auto space-y-8 md:space-y-12">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Learning Objectives
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
              Now that you have completed this Droplet, you should:
            </p>

            <div className="mt-4 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500">
              <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                {droplet.learningObjectives.map((objective) => (
                  <li
                    key={objective.id}
                    className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                  >
                    <GoalIcon className="w-5 h-5 mr-0.5 shrink-0" />
                    {objective.objective}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {enrollID && <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Notes
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
              A collection of notes and highlights that you created throughout this droplet:
            </p>

            {(notes.length > 0 || highlights.length > 0) ? (<div className="mt-4 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500">
              <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                {droplet.droplet_lessons?.map(async (lesson) => (
                  <>
                  {((await getNotesByAuthorizedUserAndLesson(user.id, lesson.lesson.slug)).length > 0 
                  || highlights.filter(highlight => highlight.lesson.droplet_lessons[0].id === lesson.id).length > 0) 
                  && <p className="pl-4 font-bold">{lesson.lesson.name}</p>}
                  {(highlights.filter((highlight) => highlight.lesson.droplet_lessons[0].id === lesson.id).map((highlight) => (
                    <li
                      key={highlight.id}
                      className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                    >
                      <HighlighterIcon className="w-5 h-5 mr-0.5 shrink-0" />
                      <span className={`bg-[${highlight.color}] px-1 rounded dark:text-black`}>
                        {highlight.text}
                      </span>
                    </li>
                  )))}
                  {(await getNotesByAuthorizedUserAndLesson(user.id, lesson.lesson.slug)).map((note) => (
                    <li
                      key={note.id}
                      className="inline-flex items-center gap-2 px-4 py-3 leading-snug dark:text-slate-300"
                    >
                      <NotebookPen className="w-5 h-5 mr-0.5 shrink-0" />
                      <span>
                        {note.highlight ? (
                          <>
                            <span className={`bg-[${note.highlight.color}] px-1 rounded dark:text-black`}>
                              {note.highlight.text} 
                            </span>{" "}
                            {note.content}
                          </>
                        ) : (
                          note.content
                        )}
                      </span>
                    </li>
                  ))}
                    
                  </>
                ))}
              </ul>
            </div>) : (
              <div className="border-t dark:border-slate-500 pt-2 mt-1">
                You have no saved notes.
              </div>
            )}
          </section>}

          {droplet.nextSteps && droplet.nextSteps.length > 0 ? (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Next Steps
              </h2>
              <p className="text-slate-500 dark:text-slate-300">
                To further your understanding, we recommend exploring:
              </p>

              <div className="mt-4 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500">
                <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                  {droplet.nextSteps.map((resource) => (
                    <li key={resource.id}>
                      <Link
                        href={resource.url}
                        className="inline-flex items-center gap-2 px-4 py-3 dark:text-slate-300 leading-snug transition-colors hover:text-sky-700"
                      >
                        <Link2Icon className="w-5 h-5 mr-0.5 shrink-0" />
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

              <ul className="grid grid-flow-row grid-cols-1 gap-4 mt-4 sm:grid-cols-2">
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
              <h2 className="mb-3 text-2xl font-bold text-slate-900">
                Rate this Droplet!
              </h2>
              <StarRating value={0} enrollmentID={enrollID} average={false} />
            </section>
          ) : null}
        </div>
      </>
    );
  }
}
