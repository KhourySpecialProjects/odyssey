import { getDropletBySlug } from "@/lib/requests/droplet";
import { Droplet } from "@/types";
import {HighlighterIcon, NotebookPen } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getServerSession } from "next-auth";
import { getNotesByAuthorizedUserAndLesson, getNotesByDroplet } from "@/lib/requests/notes";
import { getHighlightsByDroplet } from "@/lib/requests/highlights";
import { Card } from "@/components/ui/card";

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
            droplet_lessons: {
              populate: {  // Add this nested populate
                lesson: {
                  fields: ["id", "name", "slug"]
                }
              }
            },
          },
        },
      },
    });

  const authUser = await getAuthorizedUserByEmail(user.email);

  const allNotes = await Promise.all(
    enrollments.map(async (enrollment) => {
      const dropletNotes = await getNotesByDroplet(authUser.id, enrollment.droplet.id);
      const dropletHighlights = await getHighlightsByDroplet(authUser.id, enrollment.droplet.id);
      return {
        dropletId: enrollment.droplet.id,
        notes: dropletNotes,
        highlights: dropletHighlights
      };
    })
  );

    return (
      <>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className=" text-6xl font-black text-slate-900 dark:text-white">
            Saved Notes
          </h1>
          <p className="dark:text-slate-300">A collection of notes and highlights that you have created</p>
        </div>
        <div className="w-full max-w-2xl py-8 mx-auto space-y-4 ">

            {enrollments.map((enrollment, index) => {
              const dropletData = allNotes[index];
              const dropletNotes = dropletData.notes;
              const dropletHighlights = dropletData.highlights;
              
              return (
                <Link href={`/d/${enrollment.droplet.slug}`} className="p-2">
                <Card className="dark:bg-slate-800 p-2">
                    <div>
                        {enrollment.droplet.name}
                    </div>
                    {(dropletHighlights.length > 0 || dropletNotes.length > 0) ? (
                    <div className="mt-4 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500">
                    <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-500">
                    {enrollment.droplet.droplet_lessons?.map(async (lesson) => {
                        console.log("droplet lesson", enrollment.droplet)
                      const lessonNotes = (await getNotesByAuthorizedUserAndLesson(user.id, lesson.lesson.slug))
                      const lessonHighlights = dropletHighlights.filter(highlight => highlight.lesson.droplet_lessons[0].id === lesson.id)
                      console.log("lesson notes", lessonNotes)
                      console.log("lesson highlights", lessonHighlights)
                      return (
                        <>
                        {(lessonNotes.length > 0 
                        || lessonHighlights.length > 0) 
                        && <p className="pl-4 font-bold">{lesson.lesson.name}</p>}
                        {(lessonHighlights.map((highlight) => (
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
                        {lessonNotes.map((note) => (
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
                                <div>
                                    {note.content}
                                </div>
                                </>
                            ) : (
                                note.content
                            )}
                            </span>
                        </li>
                        ))}
                        
                        </>
                    )})}
                    </ul>
                    </div>) : (
                    <div className="border-t dark:border-slate-500 pt-2 mt-1">
                    You have no saved notes or highlights for this droplet.
                    </div>
                    )}
                </Card>
                </Link>
                )})}
        </div>
      </>
    );
  }
}
