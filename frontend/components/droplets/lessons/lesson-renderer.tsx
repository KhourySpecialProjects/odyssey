"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  extractHeadings,
  isAuthorizedUserAdmin,
  parseSandpackFiles,
} from "@/lib/utils";
import { User, Droplet, Lesson, AuthorizedUser } from "@/types";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { ArrowDownFromLineIcon } from "lucide-react";
import { QuizBlock } from "./quiz";
import GenericBlockRenderer from "./generic-block-renderer";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockIcon } from "lucide-react";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { OpenEndedQuizBlock } from "./open-ended-quiz";
import { toast } from "sonner";
import { Highlight } from "@/types";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import {
  createHighlight,
  deleteHighlight,
  getHighlights,
  getHighlightsForLesson,
} from "@/lib/requests/highlights";
import { Block } from "@/types";
import { GenericBlock } from "@/components/draft/lesson/blocks/generic";
import { markLessonAsComplete } from "@/lib/requests/lesson";
import posthog from "posthog-js";
import "katex/dist/katex.min.css";
import { CodeBlockViewer } from "@/components/draft/lesson/code-block-viewer";
import { NotebookCodeViewer } from "@/components/notebook/notebook-code-viewer";
import { PyodideProvider } from "@/lib/pyodide/pyodide-context";
import { DatasetProvider } from "@/lib/contexts/dataset-context";
import dynamic from "next/dynamic";

const SandpackViewer = dynamic(
  () =>
    import("@/components/draft/lesson/sandpack-viewer").then(
      (mod) => mod.SandpackViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="my-4 h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
    ),
  },
);
import { convertBlockNoteToV1Blocks } from "@/lib/blocknote/convert-blocks";

interface LessonRendererProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "lessons" | "name" | "datasets">;
  enrollmentId?: string;
  completedLessonIds: number[];
  user?: User | null;
  author?: boolean;
  authUser?: AuthorizedUser;
  onUpdate: () => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export interface Heading {
  text: string;
  level: number;
}

interface HighlightResponseItem {
  id: number;
  attributes: {
    text: string;
    position: number;
    color: string;
  };
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

  // Move all hooks before any early returns
  useEffect(() => {
    const fetchHighlights = async () => {
      const response = await getHighlightsForLesson(lesson.id);
      if (response.data) {
        const formattedHighlights = response.data.map(
          (item: HighlightResponseItem) => ({
            ...item.attributes,
            id: item.id,
          }),
        );
        setHighlights(formattedHighlights);
      }
    };
    fetchHighlights();
  }, [lesson.id]);

  const displayBlocks =
    lesson.blocksVersion === "v2" && lesson.blocksV2
      ? convertBlockNoteToV1Blocks(lesson.blocksV2)
      : lesson.blocks;

  let headings: Heading[] = [];
  displayBlocks
    .filter((b: Block) => b.__component === "droplets.generic")
    .forEach((b: Block) => {
      headings = headings.concat(extractHeadings((b as GenericBlock).content));
    });

  const [canProceed, setCanProceed] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | undefined>(
    displayBlocks[0]?.id,
  );

  useEffect(() => {
    const checkQuizAnswers = () => {
      const questions = document.querySelectorAll('[role="question"]');
      if (!questions) {
        setCanProceed(true);
        return;
      }
      const completedQuizQuestions =
        document.querySelectorAll('[role="status"]');
      if (questions.length !== completedQuizQuestions.length) {
        setCanProceed(false);
        return;
      }

      const allAnsweredCorrectly = Array.from(completedQuizQuestions).every(
        (question) => {
          const resultBadge = question.textContent;
          return resultBadge?.toLowerCase().includes("right");
        },
      );

      setCanProceed(allAnsweredCorrectly);
    };

    checkQuizAnswers();
    const observer = new MutationObserver(checkQuizAnswers);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "id"],
    });

    return () => observer.disconnect();
  }, []);

  const isAdmin = user && isAuthorizedUserAdmin(user.roles);
  const isNotEnrolled = !enrollmentId && !author && !isAdmin;

  useEffect(() => {
    if (typeof window !== "undefined" && !window.posthog) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      });

      window.posthog = posthog;

      if (authUser?.id) {
        posthog.identify(authUser.id.toString());
      }
    }
  }, [authUser?.id]);

  if (isNotEnrolled) {
    return (
      <div className="mx-auto w-full max-w-prose xl:py-8">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <LockIcon className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Enrollment Required
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            You must enroll in this droplet to access lessons.
          </p>
        </div>
      </div>
    );
  }

  const handleHighlight = async (
    highlight: Highlight,
    isWithNote?: boolean,
  ) => {
    const response = await createHighlight({
      data: {
        text: highlight.text,
        position: highlight.position,
        color: highlight.color,
        lesson: lesson.id,
        authorized_user: authUser?.id,
        blockId: highlight.blockId,
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
    const response = await deleteHighlight(highlightId, authUser!.id);
    if (response && !response.error) {
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
      toast.success("Highlight removed");
    } else {
      toast.error("Failed to remove highlight");
    }
  };

  const handleCreateNote = async (notePos: number, text: string) => {
    setExpanded(true);
    const enrollment = await getEnrollByID(String(enrollmentId), {
      fields: ["id"],
      populate: {},
    });

    if (authUser) {
      const highlight = await getHighlights(authUser.id, text);
      const result = await createNote(
        lesson,
        enrollment,
        notePos,
        authUser.id,
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

  const currentLessonOrder = (droplet.lessons ?? []).find(
    (dl) => dl.id === lesson.id,
  )?.orderIndex;

  const previousLesson = (droplet.lessons ?? []).find(
    (dl) => dl.orderIndex === (currentLessonOrder as number) - 1,
  );

  const isLocked =
    previousLesson &&
    !completedLessonIds.includes(previousLesson.id) &&
    !author &&
    !(user && isAuthorizedUserAdmin(user.roles));

  if (isLocked) {
    return (
      <div className="mx-auto w-full max-w-prose xl:py-8">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center">
          <LockIcon className="mx-auto mb-4 h-12 w-12 text-slate-400" />
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

    posthog.capture("mark_as_complete_clicked", {
      lesson_id: lesson.id,
      lesson_name: lesson.name,
      droplet_id: droplet.id,
      enrollment_id: enrollmentId,
      user_id: authUser?.id,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    startTransition(async () => {
      const success = await markLessonAsComplete(
        enrollmentId,
        completedLessonIds,
        lesson.id,
      );
      if (success) {
        completedLessonIds.push(lesson.id);

        posthog.capture("lesson_completed", {
          lesson_id: lesson.id,
          lesson_name: lesson.name,
          droplet_id: droplet.id,
          enrollment_id: enrollmentId,
          user_id: authUser?.id,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        });

        await router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto w-full min-w-[300px] py-8 md:min-w-[700px]">
      <div className="relative mx-auto w-full max-w-2xl xl:py-8">
        <h1 className="text-6xl font-extrabold text-balance">{lesson.name}</h1>

        <DatasetProvider datasets={droplet.datasets ?? []}>
          <PyodideProvider>
            <div className="mt-8 space-y-2">
              {displayBlocks.map((b: Block, i: number) => (
                <LessonBlockRenderer
                  key={i}
                  block={b}
                  lessonId={lesson.id}
                  dropletId={droplet.id}
                  dropletName={droplet.name}
                  lessonName={lesson.name}
                  userId={authUser?.id}
                  highlights={highlights}
                  onHighlight={handleHighlight}
                  onDeleteHighlight={handleDeleteHighlight}
                  onNote={handleCreateNote}
                  enrollmentId={enrollmentId}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  activeBlock={activeBlock}
                  setActiveBlock={(id: number) => setActiveBlock(id)}
                  author={author}
                />
              ))}
            </div>
          </PyodideProvider>
        </DatasetProvider>
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleMarkAsComplete}
            disabled={
              isPending ||
              !enrollmentId ||
              completedLessonIds.includes(lesson.id) ||
              !canProceed
            }
            className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
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
  );
}

function LessonBlockRenderer({
  block,
  lessonId,
  dropletId,
  dropletName,
  lessonName,
  userId,
  highlights,
  onHighlight,
  onDeleteHighlight,
  onNote,
  enrollmentId,
  expanded,
  setExpanded,
  activeBlock,
  setActiveBlock,
  author,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  block: any;
  lessonId: number;
  dropletId: number;
  dropletName?: string;
  lessonName: string;
  userId?: number;
  highlights: Highlight[];
  onHighlight: (highlight: Highlight, isWithNote?: boolean) => void;
  onDeleteHighlight: (id: number) => void;
  onNote: (notePos: number, text: string) => void;
  enrollmentId: string | undefined;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  activeBlock: number | undefined;
  setActiveBlock: (id: number) => void;
  author: boolean;
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
          enrollmentId={enrollmentId}
          expanded={expanded}
          setExpanded={setExpanded}
          activeBlock={activeBlock}
          setActiveBlock={setActiveBlock}
          author={author}
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
      return (
        <QuizBlock
          data={block}
          lessonId={lessonId}
          dropletId={dropletId}
          dropletName={dropletName}
          lessonName={lessonName}
          userId={userId}
        />
      );

    case "droplets.open-ended-quiz":
      return (
        <OpenEndedQuizBlock
          data={block}
          lessonId={lessonId}
          dropletId={dropletId}
          dropletName={dropletName}
          lessonName={lessonName}
          userId={userId}
        />
      );

    case "droplets.callout":
      return (
        <div
          className={`flex flex-col items-center space-y-4 rounded-md border px-6 py-6 dark:border-slate-500 ${block.color || "bg-sky-50 dark:bg-sky-800"}`}
        >
          {block?.iconEnabled && (
            <div className="">
              <CalloutIcon color={block.color || "bg-sky-300"}></CalloutIcon>
            </div>
          )}

          <div className="">
            <div className="prose prose-sky prose-headings:text-inherit prose-code:text-inherit prose-strong:text-inherit justify-left prose-li:marker:text-slate-700 mx-auto text-black">
              <BlocksRenderer content={block.content} />
            </div>
          </div>
        </div>
      );

    case "droplets.expandable":
      return (
        <Collapsible className="w-full rounded-md border border-slate-200 p-4 dark:border-slate-500">
          <CollapsibleTrigger className="inline-flex flex-row items-center gap-2 font-bold text-sky-600">
            {block.title}
            <ArrowDownFromLineIcon className="h-4 w-4 text-sky-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 border-t border-t-slate-200 pt-3 dark:border-slate-500">
            <div
              className="prose prose-sky prose-headings:text-inherit prose-strong:text-inherit prose-code:text-inherit dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: block.content }}
            ></div>
          </CollapsibleContent>
        </Collapsible>
      );

    case "droplets.code-block":
      if (block.isNotebook) {
        return (
          <NotebookCodeViewer
            code={block.code}
            language={block.language}
            editable={block.editable}
            testCode={block.testCode}
          />
        );
      }
      return (
        <CodeBlockViewer
          language={block.language}
          code={block.code}
          editable={block.editable}
          runnable={block.runnable}
        />
      );

    case "droplets.sandpack-block":
      return (
        <SandpackViewer
          template={block.template}
          files={parseSandpackFiles(block.files)}
          showPreview={block.showPreview}
          editable={block.editable}
        />
      );

    default:
      return null;
  }
}
