"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractHeadings, isAuthorizedUserAdmin } from "@/lib/utils";
import { User, Droplet, Lesson, AuthorizedUser } from "@/types";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { ArrowDownFromLineIcon, Pencil } from "lucide-react";
import { QuizBlock } from "./quiz";
import GenericBlockRenderer from "./GenericBlockRenderer";
import { useEffect, useState, useTransition } from "react";
import { redirect, useRouter } from "next/navigation";
import { createHighlight, createNote, getHighlightsForLesson, markLessonAsComplete } from "@/lib/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import {
  LockIcon,
  CircleAlert,
  CircleHelp,
  TriangleAlert,
  BookOpenText,
  BadgeInfo,
  Bell,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { OpenEndedQuizBlock } from "./open-ended-quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Highlight } from "@/types";

interface LessonRendererProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "droplet_lessons">;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author?: boolean;
  authUser?: AuthorizedUser;
}

export function LessonRenderer({
  lesson,
  droplet,
  enrollmentId,
  completedLessonIds,
  user,
  author = false,
  authUser,
}: LessonRendererProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  
  useEffect(() => {
    // Fetch highlights when component mounts
    const fetchHighlights = async () => {
      const response = await getHighlightsForLesson(lesson.id);
      if (response.data) {
        setHighlights(response.data);
      }
    };
    fetchHighlights();
  }, [lesson.id]);

  const handleHighlight = async (highlight: any) => {
    const response = await createHighlight({
      data: {
        text: highlight.text,
        position: highlight.position,
        color: highlight.color,
        lesson: lesson.id,
        authorized_user: authUser?.id
      }
    });
    
    if (response.data) {
      setHighlights(prev => [...prev, response.data]);
      toast.success("Highlight saved");
    } else {
      toast.error("Failed to save highlight");
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const handleNote = async (position: number) => {
    try {
      if (note && enrollmentId) {
        const result = await createNote(note, position, lesson.id, Number(enrollmentId));
        if (result.success) {
          toast.success("note created successfully");
        } else {
          console.error("failed to create note", result.error);
        }
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to create new note: ", error);
    }
  };

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
      console.log("no enrollment");
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
      console.log(
        "completedlessonids for mark as complete",
        completedLessonIds,
      );
    });
  }

  let headings: any[] = [];
  lesson.blocks
    .filter((b: any) => b.__component === "droplets.generic")
    .forEach((b: any) => {
      headings = headings.concat(extractHeadings(b.content));
    });

  return (
    <>
    <div className="w-full mx-auto lg:py-8 max-w-prose">
    <div className="w-full mx-auto lg:py-8 max-w-prose relative">
          
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
            <LessonBlockRenderer key={i} block={b} highlights={highlights} onHighlight={handleHighlight} />
        ))}
      </div>
      {/* <div className="fixed right-8 top-0 bottom-0 flex flex-col justify-evenly ">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
                <div className="relative group">
                  <Pencil className="text-sky-600" />
                  <span className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Take Notes
                  </span>
                </div>
              </Button>
              </div>
            ))}
          </div> */}
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[250px]">
              <DialogHeader>
                <DialogTitle>Enter your notes</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-4">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write your note here"
                />
                <Button onClick={() => handleNote(window.scrollY)}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>

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
    </div>
    </>
  );
}

function LessonBlockRenderer({ block, highlights, onHighlight }: { block: any, highlights: any[], onHighlight: (highlight: any) => void }) {
  switch (block.__component) {
    case "droplets.generic":
      return <GenericBlockRenderer block={block} highlights={highlights}
      onHighlight={onHighlight} />;

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
          className={`flex flex-row items-center px-6 py-6 border rounded-md md:-mx-8 ${block.color || "bg-sky-50"}`}
        >
          <div className="">
            <CalloutIcon color={block.color || "bg-sky-300"}></CalloutIcon>
          </div>
          <div className="">
            <div className="pl-8 mx-auto prose prose-sky text-center">
              <BlocksRenderer content={block.content} />
            </div>
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
