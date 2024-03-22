import { fetchAPI, flattenAttributes } from "@/lib/utils";
import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: {
    slug: string;
    lessonSlug: string;
  };
};

async function getLessonBySlug(lessonSlug: string) {
  const path = `/lessons`;
  const urlParamsObject = {
    filters: { slug: lessonSlug },
    populate: "*",
  };
  return await fetchAPI(path, urlParamsObject);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getLessonBySlug(params.lessonSlug);
  if (res.data.length === 0) return {};
  const lesson = flattenAttributes(res.data)[0];

  return {
    title: lesson.title,
  };
}

export default async function DropletRoute({ params }: Props) {
  const res = await getLessonBySlug(params.lessonSlug);
  if (res.data.length === 0) return notFound();
  const lesson = flattenAttributes(res)[0];

  return <LessonRenderer lesson={lesson} />;
}
