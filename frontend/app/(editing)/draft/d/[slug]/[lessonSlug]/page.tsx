import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { type Lesson } from "@/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCachedDraftDropletBySlug } from "@/lib/requests/cached";

type Props = {
  params: Promise<Params>;
};

type Params = {
  slug: string;
  lessonSlug: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const lesson = await getLessonBySlug<Pick<Lesson, "name">>(p.lessonSlug, {
    fields: ["name"],
    populate: {},
  });
  if (!lesson) return {};

  return {
    title: lesson.name,
  };
}

export default async function Lesson({ params }: Props) {
  const p = await params;

  // Fetch lesson and droplet in parallel (both are independent). The droplet
  // query is request-deduplicated with the draft layout's.
  const [lesson, droplet] = await Promise.all([
    getLessonBySlug(
      p.lessonSlug,
      {
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
                    populate: { content: "*" },
                  },
                },
              },
              "droplets.callout": {
                populate: "*",
              },
              "droplets.expandable": {
                populate: "*",
              },
              "droplets.open-ended-quiz": {
                populate: {
                  questions: {
                    populate: { content: "*" },
                  },
                },
              },
            },
          },
        },
      },
      { fresh: true },
    ),
    getCachedDraftDropletBySlug(p.slug),
  ]);
  if (!lesson) return notFound();

  // Datasets are populated by the draft droplet query (no extra request).
  return (
    <div className="pb-16">
      <LessonRenderer
        lesson={lesson}
        dropletSlug={p.slug}
        datasets={droplet?.datasets ?? []}
      />
    </div>
  );
}
