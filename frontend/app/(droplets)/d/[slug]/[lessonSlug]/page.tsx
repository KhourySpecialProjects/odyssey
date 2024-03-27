import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { Lesson } from "@/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
    lessonSlug: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = await getLessonBySlug<Pick<Lesson, "title">>(
    params.lessonSlug,
    { fields: ["title"], populate: undefined }
  );
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
