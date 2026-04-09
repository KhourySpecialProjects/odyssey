"use client";
import { cn } from "@/lib/utils";
import { Droplet, Lesson } from "@/types";
import { IconArrowLeft, IconArrowRight, IconLock } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateViewedLessons } from "@/lib/requests/enrollment";
import { markLessonAsComplete } from "@/lib/requests/lesson";
import {
  isLessonQuizCompleted,
  markLessonQuizCompleted,
} from "@/lib/quiz-storage";

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

  const handleNextClick = async () => {
    if (enrollmentId && currentLessonId && droplet.lessons) {
      const allDropletLessonIds = droplet.lessons.map((l) => l.id);

      await updateViewedLessons(
        enrollmentId,
        currentLessonId,
        allDropletLessonIds,
      );
    }
  };

  const handleMarkAsComplete = () => {
    if (!enrollmentId || !currentLessonId) return;
    startTransition(async () => {
      const success = await markLessonAsComplete(
        enrollmentId,
        completedLessonIds,
        currentLessonId,
      );
      if (success) {
        await router.refresh();
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

  const isCompleted =
    currentLessonId !== undefined &&
    completedLessonIds.includes(currentLessonId);

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
              onClick={handleNextClick}
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
}: {
  link: string;
  className?: string;
  children: React.ReactNode;
  canProceed: boolean;
  onClick?: () => Promise<void>;
}) => {
  const router = useRouter();

  const handleClick = async () => {
    if (onClick) {
      await onClick();
    }
    router.push(link);
  };

  return canProceed ? (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-[14px] text-[14px] font-medium text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
        className,
      )}
    >
      {children}
    </button>
  ) : (
    <div className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-[14px] text-[14px] font-medium text-[#344054] opacity-40 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <IconLock className="h-4 w-4" />
      Complete all quizzes to proceed
    </div>
  );
};
