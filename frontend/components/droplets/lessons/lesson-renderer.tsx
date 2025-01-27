"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractHeadings, isAuthorizedUserAdmin } from "@/lib/utils";
import { User, Droplet, Lesson } from "@/types";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { ArrowDownFromLineIcon } from "lucide-react";
import { QuizBlock } from "./quiz";
import GenericBlockRenderer from "./GenericBlockRenderer";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLessonAsComplete } from "@/lib/actions";
import { LockIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

interface LessonRendererProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "droplet_lessons">;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author?: boolean;
}

export function LessonRenderer({
  lesson,
  droplet,
  enrollmentId,
  completedLessonIds,
  user,
  author = false,
}: LessonRendererProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Find the current lesson's position in this droplet
  const currentLessonOrder = droplet.droplet_lessons.find(
    (dl) => dl.lesson.id === lesson.id,
  )?.orderIndex;

  // Find the previous lesson in this droplet
  const previousLesson = droplet.droplet_lessons.find(
    (dl) => dl.orderIndex === (currentLessonOrder as number) - 1,
  )?.lesson;

  // Check if this lesson should be locked
  const isLocked =
    previousLesson &&
    !completedLessonIds.includes(previousLesson.id) &&
    !author &&
    !(user && isAuthorizedUserAdmin(user.roles));

  if (isLocked) {
    return (
      <div className="w-full mx-auto lg:py-8 max-w-prose">
        <div className="p-6 text-center border rounded-md bg-slate-50 border-slate-200">
          <LockIcon className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900">Lesson Locked</h2>
          <p className="mt-2 text-slate-600">
            Complete {previousLesson.name} to unlock this content.
          </p>
        </div>
      </div>
    );
  }

  async function handleMarkAsComplete() {
    if (!enrollmentId) {
      console.log("no enrollment")
      return;
    }

    startTransition(async () => {
      const success = await markLessonAsComplete(
        enrollmentId,
        completedLessonIds,
        lesson.id,
      );
      console.log("enrollment for mark as complete", enrollmentId)
      console.log("completedlessonids for mark as complete", completedLessonIds)
      console.log("lesson id for mark as complete", lesson.id)
      if (success) {
        router.refresh();
      }
      // } else {
      //   alert("no success");
      // }
    });
  }
  let headings: any[] = [];
  lesson.blocks
    .filter((b: any) => b.__component === "droplets.generic")
    .forEach((b: any) => {
      headings = headings.concat(extractHeadings(b.content));
    });

  return (
    <div className="w-full mx-auto lg:py-8 max-w-prose">
      <h1 className="text-4xl font-extrabold text-balance">{lesson.name}</h1>

      {headings.length > 2 && (
        <div className="p-6 mt-8 border rounded-md md:px-8 lg:-mx-8 bg-slate-50 border-slate-200">
          <h2 className="text-xl font-bold">Contents</h2>
          <ul className="mt-3 ml-4 list-disc list-inside">
            {headings.map((heading, index) => (
              <li
                key={index}
                style={{ marginLeft: `${(heading.level - 2) * 25}px` }}
              >
                {heading.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 space-y-12">
        {lesson.blocks.map((b: any, i: number) => (
          <LessonBlockRenderer key={i} block={b} />
        ))}
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={handleMarkAsComplete}
          disabled={
            isPending || !enrollmentId || completedLessonIds.includes(lesson.id)
          }
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
        >
          {isPending
            ? "Marking as complete..."
            : completedLessonIds.includes(lesson.id)
              ? "Completed"
              : "Mark as complete"}
        </button>
      </div>
    </div>
  );
}

function LessonBlockRenderer({ block }: { block: any }) {
  switch (block.__component) {
    case "droplets.generic":
      return <GenericBlockRenderer block={block} />;

    case "droplets.video":
      return (
        <div className="mx-auto md:-mx-8">
          <iframe
            width="100%"
            height="400"
            src={block.url}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded YouTube video"
            className="rounded-md"
          />
        </div>
      );

    case "droplets.quiz":
      return <QuizBlock data={block} />;

    case "droplets.callout":
      return (
        <div className="px-6 py-6 border rounded-md md:-mx-8 bg-sky-50 border-sky-200">
          <div className="mx-auto prose prose-sky">
            <BlocksRenderer content={block.content} />
          </div>
        </div>
      );

    case "droplets.expandable":
      return (
        <Collapsible className="w-full p-4 border rounded-md border-slate-200">
          <CollapsibleTrigger className="inline-flex flex-row items-center gap-2 font-bold text-sky-600">
            {block.title}
            <ArrowDownFromLineIcon className="w-4 h-4 text-sky-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 mt-4 border-t border-t-slate-200">
            <div
              className="prose prose-sky"
              dangerouslySetInnerHTML={{ __html: block.content }}
            ></div>
          </CollapsibleContent>
        </Collapsible>
      );

    default:
      return null;
  }
}
