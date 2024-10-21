import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { type Lesson } from "@/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
    lessonSlug: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = await getLessonBySlug<Pick<Lesson, "name">>(
    params.lessonSlug,
    { fields: ["name"], populate: undefined },
  );
  if (!lesson) return {};

  return {
    title: lesson.name,
  };
}

export default async function Lesson({ params }: Props) {
  const lesson = await getLessonBySlug(params.lessonSlug, {
    populate: {
      blocks: {
        on: {
          "droplets.generic": {
            populate: "*",
          },
          "droplets.video": {
            populate: "*",
          },
          "droplets.quiz": {
            populate: {
              questions: {
                populate: { answerOptions: "*" },
              },
            },
          },
          "droplets.callout": {
            populate: "*",
          },
          "droplets.expandable": {
            populate: "*",
          },
        },
      },
    },
  });
  if (!lesson) return notFound();
  return (
    <>
      <LessonRenderer lesson={lesson} dropletSlug={params.slug}/>
    </>
  );
}
