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
import type { Block as BlockNoteBlock } from "@blocknote/core";
import { GenericBlock } from "@/components/draft/lesson/blocks/generic";
import { markLessonAsComplete } from "@/lib/requests/lesson";
import posthog from "posthog-js";

interface LessonRendererProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "lessons">;
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

// Helper function to convert inline content to HTML
function convertInlineContentToHtml(inlineContent: any[]): string {
  return (
    inlineContent
      .map((contentItem: any) => {
        if (contentItem.type === "text") {
          let text = contentItem.text ?? "";
          // Apply styles
          if (contentItem.styles?.bold) text = `<strong>${text}</strong>`;
          if (contentItem.styles?.italic) text = `<em>${text}</em>`;
          if (contentItem.styles?.underline) text = `<u>${text}</u>`;
          if (contentItem.styles?.code) text = `<code>${text}</code>`;
          return text;
        }
        return "";
      })
      .join("") || ""
  );
}

// Helper function to convert a numbered list item and its children recursively
function convertNumberedListItem(item: any, depth: number = 0): string {
  const inlineContent = (item.content ?? []) as any[];
  const textContent = convertInlineContentToHtml(inlineContent);

  // Check if this item has children (nested list items)
  // BlockNote stores nested items in the children array
  const children = (item.children ?? []) as any[];

  // Filter for numbered list items and also check for any blocks that might represent nested lists
  const nestedListItems = children.filter(
    (child: any) => child.type === "numberedListItem",
  );

  // Also check if there are any other blocks that might be nested (like paragraphs containing lists)
  // Sometimes BlockNote might wrap nested content differently
  let nestedListHtml = "";
  if (nestedListItems.length > 0) {
    // Recursively convert nested list items
    const nestedListContent = nestedListItems
      .map((nestedItem: any) => convertNumberedListItem(nestedItem, depth + 1))
      .join("");
    nestedListHtml = `<ol class="list-decimal list-outside ml-6 my-1">${nestedListContent}</ol>`;
  } else if (children.length > 0) {
    // If there are children but they're not numbered list items, check if they contain nested lists
    // This handles cases where BlockNote might wrap nested items in paragraph blocks
    const allChildrenContent = children
      .map((child: any) => {
        if (child.type === "numberedListItem") {
          return convertNumberedListItem(child, depth + 1);
        }
        // For other block types, convert their content
        if (child.content) {
          return convertInlineContentToHtml(child.content);
        }
        return "";
      })
      .filter((content: string) => content.length > 0)
      .join("");

    if (allChildrenContent) {
      // If we have content from children, wrap it appropriately
      nestedListHtml = allChildrenContent;
    }
  }

  return `<li>${textContent}${nestedListHtml}</li>`;
}

// Helper function to convert a bullet list item and its children recursively
function convertBulletListItem(item: any, depth: number = 0): string {
  const inlineContent = (item.content ?? []) as any[];
  const textContent = convertInlineContentToHtml(inlineContent);

  // Check if this item has children (nested list items)
  // BlockNote stores nested items in the children array
  const children = (item.children ?? []) as any[];

  // Filter for bullet list items and also check for any blocks that might represent nested lists
  const nestedListItems = children.filter(
    (child: any) => child.type === "bulletListItem",
  );

  // Also check if there are any other blocks that might be nested (like paragraphs containing lists)
  // Sometimes BlockNote might wrap nested content differently
  let nestedListHtml = "";
  if (nestedListItems.length > 0) {
    // Recursively convert nested list items
    const nestedListContent = nestedListItems
      .map((nestedItem: any) => convertBulletListItem(nestedItem, depth + 1))
      .join("");
    nestedListHtml = `<ul class="list-disc list-outside ml-6 my-1">${nestedListContent}</ul>`;
  } else if (children.length > 0) {
    // If there are children but they're not bullet list items, check if they contain nested lists
    // This handles cases where BlockNote might wrap nested items in paragraph blocks
    const allChildrenContent = children
      .map((child: any) => {
        if (child.type === "bulletListItem") {
          return convertBulletListItem(child, depth + 1);
        }
        // For other block types, convert their content
        if (child.content) {
          return convertInlineContentToHtml(child.content);
        }
        return "";
      })
      .filter((content: string) => content.length > 0)
      .join("");

    if (allChildrenContent) {
      // If we have content from children, wrap it appropriately
      nestedListHtml = allChildrenContent;
    }
  }

  return `<li>${textContent}${nestedListHtml}</li>`;
}

function convertBlockNoteToV1Blocks(blocksV2: BlockNoteBlock[]): Block[] {
  if (!Array.isArray(blocksV2)) return [];

  // Debug: Log the block structure to understand how nested lists are stored
  // Uncomment this to debug nested list structure:
  // console.log("BlockNote blocks structure:", JSON.stringify(blocksV2, null, 2));

  // First, group consecutive numbered list items together
  const processedBlocks: Block[] = [];
  let i = 0;

  while (i < blocksV2.length) {
    const blockAny = blocksV2[i] as any;

    // Skip quote blocks (they shouldn't exist but handle them gracefully)
    if (blockAny.type === "quote") {
      // Convert quote to paragraph to avoid losing content
      const quoteContent = (blockAny.content ?? []) as any[];
      const textContent = convertInlineContentToHtml(quoteContent);
      if (textContent) {
        processedBlocks.push({
          __component: "droplets.generic",
          id: i,
          content: `<p>${textContent}</p>`,
        });
      }
      i++;
      continue;
    }

    // If this is a numbered list item, collect all consecutive ones at the same level
    if (blockAny.type === "numberedListItem") {
      const listItems: any[] = [];
      let j = i;

      // Collect consecutive numbered list items at the root level
      // Skip quote blocks that might be interspersed
      while (j < blocksV2.length) {
        const nextBlock = blocksV2[j] as any;
        if (nextBlock.type === "numberedListItem") {
          listItems.push(nextBlock);
          j++;
        } else if (nextBlock.type === "quote") {
          // Skip quote blocks - they might be incorrectly inserted
          j++;
        } else {
          break;
        }
      }

      // Convert all list items to HTML (handles nesting recursively)
      const listItemHtml = listItems
        .map((item: any) => convertNumberedListItem(item, 0))
        .join("");

      if (listItemHtml) {
        processedBlocks.push({
          __component: "droplets.generic",
          id: i,
          content: `<ol class="list-decimal list-outside ml-6 my-2 space-y-1">${listItemHtml}</ol>`,
        });
      }

      i = j; // Skip the processed items
      continue;
    }

    // If this is a bullet list item, collect all consecutive ones at the same level
    if (blockAny.type === "bulletListItem") {
      const listItems: any[] = [];
      let j = i;

      // Collect consecutive bullet list items at the root level
      // Skip quote blocks that might be interspersed
      while (j < blocksV2.length) {
        const nextBlock = blocksV2[j] as any;
        if (nextBlock.type === "bulletListItem") {
          listItems.push(nextBlock);
          j++;
        } else if (nextBlock.type === "quote") {
          // Skip quote blocks - they might be incorrectly inserted
          j++;
        } else {
          break;
        }
      }

      // Convert all list items to HTML (handles nesting recursively)
      const listItemHtml = listItems
        .map((item: any) => convertBulletListItem(item, 0))
        .join("");

      if (listItemHtml) {
        processedBlocks.push({
          __component: "droplets.generic",
          id: i,
          content: `<ul class="list-disc list-outside ml-6 my-2 space-y-1">${listItemHtml}</ul>`,
        });
      }

      i = j; // Skip the processed items
      continue;
    }

    // For non-numbered-list blocks, process normally
    const convertedBlock = convertSingleBlock(blockAny, i);
    if (convertedBlock !== null) {
      processedBlocks.push(convertedBlock);
    }
    i++;
  }

  return processedBlocks.filter((block): block is Block => block !== null);
}

function convertSingleBlock(blockAny: any, blockIndex: number): Block | null {
  switch (blockAny.type) {
    case "heading":
    case "paragraph": {
      const inlineContent = (blockAny.content ?? []) as any[];
      const textContent =
        inlineContent
          .map((item: any) => {
            if (item.type === "text") {
              let text = item.text ?? "";
              // Apply styles
              if (item.styles?.bold) text = `<strong>${text}</strong>`;
              if (item.styles?.italic) text = `<em>${text}</em>`;
              if (item.styles?.underline) text = `<u>${text}</u>`;
              if (item.styles?.code) text = `<code>${text}</code>`;
              return text;
            }
            return "";
          })
          .join("") || "";

      const headingLevel = Number(blockAny.props?.level) || 1;
      const htmlContent =
        blockAny.type === "heading"
          ? `<h${headingLevel}>${textContent}</h${headingLevel}>`
          : `<p>${textContent}</p>`;

      return {
        __component: "droplets.generic",
        id: blockIndex,
        content: htmlContent,
      };
    }

    case "callout": {
      const calloutColorMap: Record<string, string> = {
        warning: "bg-red-300",
        question: "bg-blue-300",
        important: "bg-orange-300",
        definition: "bg-green-300",
        "more-information": "bg-purple-300",
        caution: "bg-amber-300",
        default: "bg-sky-50 dark:bg-sky-200",
      };

      const calloutContent = (blockAny.content ?? []) as any[];
      const calloutText =
        calloutContent
          .map((item: any) => (item.type === "text" ? item.text ?? "" : ""))
          .join("") || "";

      return {
        __component: "droplets.callout",
        id: blockIndex,
        content: [
          {
            type: "paragraph",
            children: [{ type: "text", text: calloutText }],
          },
        ],
        color:
          calloutColorMap[blockAny.props?.calloutType] ||
          calloutColorMap.default,
        type: blockAny.props?.calloutType || "info",
        iconEnabled: true,
      };
    }

    case "quiz-multiple-choice": {
      const options =
        (blockAny.props?.options as
          | { text?: string; isCorrect?: boolean }[]
          | undefined) ?? [];

      return {
        __component: "droplets.quiz",
        questions: [
          {
            id: blockIndex,
            content: blockAny.props?.question || "",
            answerOptions: options.map((opt, optionIndex) => ({
              id: blockIndex * 100 + optionIndex,
              content: opt.text || "",
              isCorrect: !!opt.isCorrect,
            })),
          },
        ],
      };
    }

    case "quiz-true-false": {
      return {
        __component: "droplets.quiz",
        questions: [
          {
            id: blockIndex,
            content: blockAny.props?.question || "",
            answerOptions: [
              {
                id: blockIndex * 10 + 1,
                content: "True",
                isCorrect: blockAny.props?.correctAnswer === true,
              },
              {
                id: blockIndex * 10 + 2,
                content: "False",
                isCorrect: blockAny.props?.correctAnswer === false,
              },
            ],
          },
        ],
      };
    }

    case "quiz-open-ended": {
      return {
        __component: "droplets.open-ended-quiz",
        questions: [
          {
            id: blockIndex,
            content: blockAny.props?.question || "",
            correctAnswer: "",
          },
        ],
      };
    }

    case "video": {
      let embedUrl = blockAny.props?.url || "";

      // Convert YouTube URLs to embed format
      if (embedUrl.includes("youtube.com") || embedUrl.includes("youtu.be")) {
        // Extract video ID from various YouTube URL formats
        let videoId = "";
        if (embedUrl.includes("youtu.be/")) {
          videoId = embedUrl.split("youtu.be/")[1].split("?")[0];
        } else if (embedUrl.includes("youtube.com")) {
          const urlParams = new URLSearchParams(embedUrl.split("?")[1]);
          videoId = urlParams.get("v") || "";
        }

        if (videoId) {
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
      }

      return {
        __component: "droplets.video",
        id: blockIndex,
        url: embedUrl,
      };
    }

    case "image": {
      // Convert to generic block with img tag so it renders in GenericBlockRenderer
      return {
        __component: "droplets.generic",
        id: blockIndex,
        content: `<img src="${blockAny.props?.url || ""}" alt="${blockAny.props?.name || ""}" class="rounded-md" />`,
      };
    }

    case "table": {
      const tableContent = blockAny.content;
      if (!tableContent || !tableContent.rows) {
        return null;
      }

      const rows = tableContent.rows.map((row: any, rowIndex: number) => {
        const cells = row.cells
          .map((cell: any) => {
            const cellContent = (cell.content ?? []) as any[];
            const cellText = cellContent
              .map((item: any) => {
                if (item.type === "text") {
                  let text = item.text ?? "";
                  if (item.styles?.bold) text = `<strong>${text}</strong>`;
                  if (item.styles?.italic) text = `<em>${text}</em>`;
                  if (item.styles?.underline) text = `<u>${text}</u>`;
                  if (item.styles?.code) text = `<code>${text}</code>`;
                  return text;
                }
                return "";
              })
              .join("");

            const tag = rowIndex === 0 ? "th" : "td";
            const cellClasses =
              rowIndex === 0
                ? "px-4 py-2 text-left font-semibold bg-slate-100 dark:bg-slate-700"
                : "px-4 py-2 border-t border-slate-300 dark:border-slate-600";
            return `<${tag} class="${cellClasses}">${cellText}</${tag}>`;
          })
          .join("");

        return rowIndex === 0
          ? `<thead><tr>${cells}</tr></thead>`
          : `<tr>${cells}</tr>`;
      });

      const headerRow = rows[0];
      const bodyRows = rows.slice(1).join("");

      // Wrap table in a scrollable container
      const tableHtml = `
            <div class="overflow-x-auto -mx-4 md:mx-0">
              <table class="w-full border-collapse border border-slate-300 dark:border-slate-600 table-fixed">
                ${headerRow}
                <tbody>${bodyRows}</tbody>
              </table>
            </div>
          `;

      return {
        __component: "droplets.generic",
        id: blockIndex,
        content: tableHtml,
      };
    }

    default:
      return null;
  }
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

  const isAdmin = user && isAuthorizedUserAdmin(user.roles);
  const isNotEnrolled = !enrollmentId && !author && !isAdmin;

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).posthog) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      });

      (window as any).posthog = posthog;

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
    const response = await deleteHighlight(highlightId);
    if (response && !response.error) {
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
      toast.success("Highlight removed");
    } else {
      toast.error("Failed to remove highlight");
    }
  };

  const handleCreateNote = async (notePos: number, text: string) => {
    setExpanded(true);
    const enrollment = await getEnrollByID(String(enrollmentId));

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

  return (
    <div className="mx-auto w-full min-w-[300px] py-8 md:min-w-[700px]">
      <div className="relative mx-auto w-full max-w-2xl xl:py-8">
        <h1 className="text-6xl font-extrabold text-balance">{lesson.name}</h1>

        <div className="mt-8 space-y-12">
          {displayBlocks.map((b: Block, i: number) => (
            <LessonBlockRenderer
              key={i}
              block={b}
              lessonId={lesson.id}
              dropletId={droplet.id}
              dropletName={(droplet as any).name}
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
            />
          ))}
        </div>
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
}: {
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

    default:
      return null;
  }
}
