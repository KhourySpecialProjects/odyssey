import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import { fetchAPI } from "@/lib/utils";
import { Lesson } from "@/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
    lessonSlug: string;
  };
};

async function getLessonBySlug(lessonSlug: string): Promise<Lesson> {
  const path = `/lessons`;
  const urlParams = {
    filters: { slug: lessonSlug },
    populate: "*",
  };
  return await fetchAPI<Lesson[]>(path, { urlParams: urlParams }).then(
    (lessons) => lessons[0]
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = await getLessonBySlug(params.lessonSlug);
  if (!lesson) return {};

  return {
    title: lesson.title,
  };
}

export default async function DropletRoute({ params }: Props) {
  const lesson = await getLessonBySlug(params.lessonSlug);
  if (!lesson) return notFound();

  return <LessonRenderer lesson={lesson} />;
}
