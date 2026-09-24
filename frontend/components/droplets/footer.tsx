"use client";
import { cn } from "@/lib/utils";
import { Droplet, Lesson } from "@/types";
import { IconArrowLeft, IconArrowRight, IconLock } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateViewedLessons } from "@/lib/requests/enrollment";
import {
  isLessonQuizCompleted,
  markLessonQuizCompleted,
} from "@/lib/quiz-storage";
import { useViewedLessonsStore } from "@/stores/viewed-lessons-store";
import { toast } from "sonner";

type PaginationProps = {
  link: string;
  name: string;
};

export default function DropletFooter({
  droplet,
  enrollmentId,
  currentLessonId,
  completedLessonIds = [],
}: {
  droplet: Pick<Droplet, "slug" | "lessons">;
  enrollmentId?: string;
  currentLessonId?: number;
  completedLessonIds?: number[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [canProceed, setCanProceed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const markViewed = useViewedLessonsStore((s) => s.markViewed);
  const unmarkViewed = useViewedLessonsStore((s) => s.unmarkViewed);
  const pendingViewedIds = useViewedLessonsStore((s) => s.pendingViewedIds);
  // Includes lessons whose save is still in flight (see viewed-lessons-store)
  const isViewed = (lessonId: number) =>
    completedLessonIds.includes(lessonId) ||
    pendingViewedIds.includes(lessonId);

  /**
   * Saves the current lesson as viewed. Returns true when server data changed
   * (the lesson was newly viewed, or the droplet became complete).
   */
  const saveLessonViewed = async (): Promise<boolean> => {
    if (!enrollmentId || !currentLessonId || !droplet.lessons) return false;
    // Already recorded: nothing to save (missing completion data on legacy
    // enrollments is filled in by <CompletionBackfill> on the page).
    if (isViewed(currentLessonId)) return false;

    const lessonId = currentLessonId;
    // Show it as viewed in the sidebar right away; see viewed-lessons-store.
    markViewed(lessonId);
    const result = await updateViewedLessons(
      enrollmentId,
      lessonId,
      droplet.lessons.map((l) => l.id),
    ).catch(() => ({ success: false as const }));

    if (!result.success) {
      unmarkViewed(lessonId);
      // Usually shown after moving on, so name the lesson it's about
      const lessonName = droplet.lessons.find((l) => l.id === lessonId)?.name;
      toast.error(
        lessonName
          ? `Failed to save progress for ${lessonName}`
          : "Failed to save lesson progress",
      );
      return false;
    }
    return !result.alreadyViewed;
  };

  // The recap page shows the droplet as completed based on this save, so
  // wait for it before going there.
  const saveBeforeRecap = async () => {
    await saveLessonViewed();
  };

  // Lesson to lesson: navigate first and save in the background, then
  // refresh so the layout (sidebar, progress) reflects the stored progress.
  // Next.js's own refresh after a navigation interrupts a pending Server
  // Action runs when the navigation finishes, which can be before the save
  // lands, so it can't be relied on for this.
  const saveInBackground = async () => {
    if (await saveLessonViewed()) router.refresh();
  };

  const handleMarkAsComplete = () => {
    if (!enrollmentId || !currentLessonId || !droplet.lessons) return;
    const allDropletLessonIds = droplet.lessons.map((l) => l.id);
    startTransition(async () => {
      // Same action as "Next" so finishing the last lesson here also records
      // the droplet's completion (isComplete + completionDate).
      // A rejected call (network drop, redeployed action) is a failure too;
      // left uncaught it would reach the lesson's error boundary
      const { success } = await updateViewedLessons(
        enrollmentId,
        currentLessonId,
        allDropletLessonIds,
      ).catch(() => ({ success: false as const }));
      // No router.refresh(): the action's revalidateTag already re-renders
      // the route, and a refresh here would be a second full server render.
      if (!success) {
        console.error("Failed to mark lesson as complete");
        toast.error("Failed to mark lesson as complete");
      }
    });
  };

  useEffect(() => {
    if (currentLessonId && isLessonQuizCompleted(currentLessonId)) {
      setCanProceed(true);
      return;
    }

    const checkQuizAnswers = () => {
      const questions = document.querySelectorAll('[role="question"]');
      if (!questions || questions.length === 0) {
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

      if (allAnsweredCorrectly && currentLessonId) {
        markLessonQuizCompleted(currentLessonId);
      }

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
  }, [currentLessonId]);

  if (!droplet.lessons || droplet.lessons.length === 0) return null;

  let previous: PaginationProps | null = null;
  let next: PaginationProps | null = null;

  const pathSegments = pathname.split("/");
  const isOnLesson = pathSegments.length > 3;

  if (isOnLesson) {
    const lessonSlug = pathname.split("/").at(-1);
    if (!lessonSlug) return null;
    const lessonSlugs = droplet.lessons.map((l: Lesson) => l.slug);
    const currentLessonSlugIndex = lessonSlugs.indexOf(lessonSlug);

    if (currentLessonSlugIndex === 0) {
      previous = {
        link: `/d/${droplet.slug}`,
        name: "Overview",
      };
    } else {
      const prevLesson = droplet.lessons[currentLessonSlugIndex - 1];
      previous = {
        link: `/d/${droplet.slug}/${prevLesson.slug}`,
        name: prevLesson.name,
      };
    }

    if (currentLessonSlugIndex === droplet.lessons.length - 1) {
      next = {
        link: `/d/${droplet.slug}/recap`,
        name: "Recap",
      };
    } else {
      const nextLesson = droplet.lessons[currentLessonSlugIndex + 1];
      next = {
        link: `/d/${droplet.slug}/${nextLesson.slug}`,
        name: nextLesson.name,
      };
    }
  } else {
    const nextLesson = droplet.lessons[0];
    next = {
      link: `/d/${droplet.slug}/${nextLesson.slug}`,
      name: nextLesson.name,
    };
  }

  const nextIsRecap = next?.link.endsWith("/recap") ?? false;

  const isCompleted =
    currentLessonId !== undefined && isViewed(currentLessonId);

  return (
    <div className="justify-left flex w-full flex-col">
      <div className="mt-2 flex w-full flex-row items-center justify-between gap-2 pb-12">
        {previous ? (
          <PaginationLinkWrapper link={previous.link} canProceed={true}>
            <IconArrowLeft className="h-4 w-4" />
            Previous
          </PaginationLinkWrapper>
        ) : (
          <div className="flex-1"></div>
        )}

        <div className="flex items-center gap-2">
          {isOnLesson && enrollmentId && (
            <button
              onClick={handleMarkAsComplete}
              disabled={isPending || isCompleted || !canProceed}
              className="flex h-10 items-center justify-center rounded-lg border border-[#2D7597] bg-[#2D7597] px-4 text-sm font-medium text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[#255e78] disabled:pointer-events-none disabled:opacity-50"
            >
              {isPending
                ? "Saving..."
                : isCompleted
                  ? "Completed"
                  : "Mark as complete"}
            </button>
          )}

          {next ? (
            <PaginationLinkWrapper
              link={next.link}
              canProceed={canProceed}
              onClick={nextIsRecap ? saveBeforeRecap : saveInBackground}
              awaitOnClick={nextIsRecap}
            >
              Next
              <IconArrowRight className="h-4 w-4" />
            </PaginationLinkWrapper>
          ) : (
            <div className="flex-1"></div>
          )}
        </div>
      </div>
    </div>
  );
}

const PaginationLinkWrapper = ({
  link,
  className,
  children,
  canProceed,
  onClick,
  awaitOnClick = false,
}: {
  link: string;
  className?: string;
  children: React.ReactNode;
  canProceed: boolean;
  onClick?: () => Promise<void>;
  awaitOnClick?: boolean;
}) => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleClick = async () => {
    if (onClick && awaitOnClick) {
      // Same "Saving..." feedback as "Mark as complete" while the save runs.
      // It stays on until the next page replaces this one.
      setIsSaving(true);
      try {
        await onClick();
      } catch (error) {
        // Stay on the lesson with the button usable so the user can retry
        console.error("Failed to save lesson progress:", error);
        toast.error("Failed to save lesson progress");
        setIsSaving(false);
        return;
      }
    } else if (onClick) {
      // Navigate right away; the save finishes in the background and onClick
      // handles its own result (see saveInBackground).
      onClick().catch((error) =>
        console.error("Failed to save lesson progress:", error),
      );
    }
    router.push(link);
  };

  return canProceed ? (
    <button
      onClick={handleClick}
      disabled={isSaving}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-[14px] text-[14px] font-medium text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
        className,
      )}
    >
      {isSaving ? "Saving..." : children}
    </button>
  ) : (
    <div className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-[14px] text-[14px] font-medium text-[#344054] opacity-40 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <IconLock className="h-4 w-4" />
      Complete all quizzes to proceed
    </div>
  );
};
