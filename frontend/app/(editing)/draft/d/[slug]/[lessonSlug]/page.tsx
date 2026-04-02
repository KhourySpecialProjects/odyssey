import { LessonRenderer } from "@/components/draft/lesson/lesson-renderer";
import { getLessonBySlug } from "@/lib/requests/lesson";
import { type Lesson } from "@/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCachedDraftDropletBySlug } from "@/lib/requests/cached";
import { getDatasetsByDropletId } from "@/lib/requests/dataset";

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

  // Fetch lesson and droplet in parallel (both are independent)
  const [lesson, droplet] = await Promise.all([
    getLessonBySlug(p.lessonSlug, {
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
    }),
    getCachedDraftDropletBySlug(p.slug),
  ]);
  if (!lesson) return notFound();

  const datasets = droplet ? await getDatasetsByDropletId(droplet.id) : [];

  return (
    <div>
      <LessonRenderer
        lesson={lesson}
        dropletSlug={p.slug}
        datasets={datasets}
      />
    </div>
  );
}
