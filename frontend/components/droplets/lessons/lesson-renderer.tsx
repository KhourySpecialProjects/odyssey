"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractHeadings, isAuthorizedUserAdmin } from "@/lib/utils";
import { User, Droplet, Lesson, AuthorizedUser } from "@/types";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { ArrowDownFromLineIcon } from "lucide-react";
import { QuizBlock } from "./quiz";
import GenericBlockRenderer from "./GenericBlockRenderer";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createHighlight,
  deleteHighlight,
  getHighlightsForLesson,
  markLessonAsComplete,
} from "@/lib/actions";
import { LockIcon } from "lucide-react";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { OpenEndedQuizBlock } from "./open-ended-quiz";
import { toast } from "sonner";
import { Highlight } from "@/types";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import { getHighlights } from "@/lib/requests/highlights";

interface LessonRendererProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "droplet_lessons">;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author?: boolean;
  authUser?: AuthorizedUser;
  onUpdate: () => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export function LessonRenderer({
  lesson,
  droplet,
  enrollmentId,
  completedLessonIds,
  user,
  author = false,
  authUser,
  onUpdate,
  expanded,
  setExpanded,
}: LessonRendererProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    const fetchHighlights = async () => {
      const response = await getHighlightsForLesson(lesson.id);
      if (response.data) {
        const formattedHighlights = response.data.map((item: any) => ({
          ...item.attributes,
          id: item.id,
        }));
        setHighlights(formattedHighlights);
      }
    };
    fetchHighlights();
  }, [lesson.id]);

  const handleHighlight = async (highlight: any, isWithNote?: boolean) => {
    console.log("is with note", isWithNote);
    const response = await createHighlight({
      data: {
        text: highlight.text,
        position: highlight.position,
        color: highlight.color,
        lesson: lesson.id,
        authorized_user: authUser?.id,
      },
    });

    if (response.data) {
      const formattedHighlight = {
        ...response.data.attributes,
        id: response.data.id,
      };
      setHighlights((prev) => [...prev, formattedHighlight]);
      if (!(isWithNote === true)) {
        toast.success("Highlight saved");
      }
    } else {
      toast.error("Failed to save highlight");
    }
  };

  const handleDeleteHighlight = async (highlightId: number) => {
    const response = await deleteHighlight(highlightId);
    if (response && !response.error) {
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
      toast.success("Highlight removed");
    } else {
      toast.error("Failed to remove highlight");
    }
  };

  const handleCreateNote = async (notePos: number, text: string) => {
    const enrollment = await getEnrollByID(String(enrollmentId));

    //code that takes the text and notePos and gets the highlight
    console.log("text", text);
    if (authUser) {
      const highlight = await getHighlights(authUser.id, text);
      const result = await createNote(
        lesson,
        enrollment,
        notePos,
        highlight[0],
      );
      if (result.success) {
        toast.success("Note created");
      } else {
        toast.error("Failed to create note");
      }
    }

    onUpdate();
  };

  const currentLessonOrder = droplet.droplet_lessons.find(
    (dl) => dl.lesson.id === lesson.id,
  )?.orderIndex;

  const previousLesson = droplet.droplet_lessons.find(
    (dl) => dl.orderIndex === (currentLessonOrder as number) - 1,
  )?.lesson;

  const isLocked =
    previousLesson &&
    !completedLessonIds.includes(previousLesson.id) &&
    !author &&
    !(user && isAuthorizedUserAdmin(user.roles));

  if (isLocked) {
    return (
      <div className="w-full xl:py-8 max-w-prose mx-auto">
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
      return;
    }

    startTransition(async () => {
      const success = await markLessonAsComplete(
        enrollmentId,
        completedLessonIds,
        lesson.id,
      );
      if (success) {
        completedLessonIds.push(lesson.id);
        await router.refresh();
      }
    });
  }

  let headings: any[] = [];
  lesson.blocks
    .filter((b: any) => b.__component === "droplets.generic")
    .forEach((b: any) => {
      headings = headings.concat(extractHeadings(b.content));
    });

  let genericBlocks = lesson.blocks
    .filter((b: any) => b.__component === "droplets.generic")
    .map((b) => b.id);

  return (
    <>
      <div className="w-full min-w-[300px] md:min-w-[700px] mx-auto py-8 max-w-prose">
        <div className="w-full mx-auto xl:py-8 max-w-prose relative">
          <h1 className="text-4xl font-extrabold text-balance">
            {lesson.name}
          </h1>

          {headings.length > 2 && (
            <div className="p-6 mt-8 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-500">
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
              <LessonBlockRenderer
                key={i}
                block={b}
                highlights={highlights}
                onHighlight={handleHighlight}
                onDeleteHighlight={handleDeleteHighlight}
                onNote={handleCreateNote}
                genericBlocks={genericBlocks}
                enrollmentId={enrollmentId}
                expanded={expanded}
                setExpanded={setExpanded}
              />
            ))}
          </div>
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={handleMarkAsComplete}
              disabled={
                isPending ||
                !enrollmentId ||
                completedLessonIds.includes(lesson.id)
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
      </div>
    </>
  );
}

function LessonBlockRenderer({
  block,
  highlights,
  onHighlight,
  onDeleteHighlight,
  onNote,
  genericBlocks,
  enrollmentId,
  expanded,
  setExpanded,
}: {
  block: any;
  highlights: any[];
  onHighlight: (highlight: any, isWithNote?: boolean) => void;
  onDeleteHighlight: (id: number) => void;
  onNote: (notePos: number, text: string) => void;
  genericBlocks: number[];
  enrollmentId: string | undefined;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}) {
  switch (block.__component) {
    case "droplets.generic":
      return (
        <GenericBlockRenderer
          block={block}
          highlights={highlights}
          onHighlight={onHighlight}
          onDeleteHighlight={onDeleteHighlight}
          onNote={onNote}
          genericBlocks={genericBlocks}
          enrollmentId={enrollmentId}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      );

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

    case "droplets.open-ended-quiz":
      return <OpenEndedQuizBlock data={block} />;

    case "droplets.callout":
      return (
        <div
          className={`flex flex-col items-center space-y-4 dark:border-slate-500 px-6 py-6 border rounded-md md:-mx-8 ${block.color || "bg-sky-50 dark:bg-sky-200"}`}
        >
          {block?.iconEnabled && (
            <div className="">
              <CalloutIcon color={block.color || "bg-sky-300"}></CalloutIcon>
            </div>
          )}

          <div className="">
            <div className="mx-auto prose prose-sky  prose-headings:text-inherit prose-code:text-inherit prose-strong:text-inherit justify-left prose-li:marker:text-slate-700">
              <BlocksRenderer content={block.content} />
            </div>
          </div>
        </div>
      );

    case "droplets.expandable":
      return (
        <Collapsible className="w-full p-4 border rounded-md border-slate-200 dark:border-slate-500">
          <CollapsibleTrigger className="inline-flex flex-row items-center gap-2 font-bold text-sky-600">
            {block.title}
            <ArrowDownFromLineIcon className="w-4 h-4 text-sky-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 mt-4 border-t border-t-slate-200 dark:border-slate-500">
            <div
              className="prose prose-sky dark:text-slate-300 prose-headings:text-inherit prose-strong:text-inherit prose-code:text-inherit"
              dangerouslySetInnerHTML={{ __html: block.content }}
            ></div>
          </CollapsibleContent>
        </Collapsible>
      );

    default:
      return null;
  }
}
