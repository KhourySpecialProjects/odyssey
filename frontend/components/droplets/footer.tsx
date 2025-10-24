"use client";
import { cn } from "@/lib/utils";
import { Droplet, DropletLesson } from "@/types";
import { ArrowLeftIcon, ArrowRightIcon, LockIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateViewedLessons } from "@/lib/requests/enrollment";
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
}: {
  droplet: Pick<Droplet, "slug" | "droplet_lessons">;
  enrollmentId?: string;
  currentLessonId?: number;
}) {
  const pathname = usePathname();
  const [canProceed, setCanProceed] = useState(false);

  const handleNextClick = async () => {
    if (enrollmentId && currentLessonId && droplet.droplet_lessons) {
      const allDropletLessonIds = droplet.droplet_lessons.map(
        (l) => l.lesson.id,
      );

      await updateViewedLessons(
        enrollmentId,
        currentLessonId,
        allDropletLessonIds,
      );
    }
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

  if (!droplet.droplet_lessons || droplet.droplet_lessons.length === 0)
    return null;

  let previous: PaginationProps | null = null;
  let next: PaginationProps | null = null;

  const pathSegments = pathname.split("/");

  if (pathSegments.length > 3) {
    const lessonSlug = pathname.split("/").at(-1);
    if (!lessonSlug) return null;
    const lessonSlugs = droplet.droplet_lessons.map(
      (l: DropletLesson) => l.lesson.slug,
    );
    const currentLessonSlugIndex = lessonSlugs.indexOf(lessonSlug);

    if (currentLessonSlugIndex === 0) {
      previous = {
        link: `/d/${droplet.slug}`,
        name: "Overview",
      };
    } else {
      const prevLesson = droplet.droplet_lessons[currentLessonSlugIndex - 1];
      previous = {
        link: `/d/${droplet.slug}/${prevLesson.lesson.slug}`,
        name: prevLesson.lesson.name,
      };
    }

    if (currentLessonSlugIndex === droplet.droplet_lessons.length - 1) {
      next = {
        link: `/d/${droplet.slug}/recap`,
        name: "Recap",
      };
    } else {
      const nextLesson = droplet.droplet_lessons[currentLessonSlugIndex + 1];
      next = {
        link: `/d/${droplet.slug}/${nextLesson.lesson.slug}`,
        name: nextLesson.lesson.name,
      };
    }
  } else {
    const nextLesson = droplet.droplet_lessons[0];
    next = {
      link: `/d/${droplet.slug}/${nextLesson.lesson.slug}`,
      name: nextLesson.lesson.name,
    };
  }

  return (
    <div className="justify-left flex w-full flex-col">
      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 pb-2 md:flex-row md:justify-between xl:w-full">
        {previous ? (
          <PaginationLinkWrapper link={previous.link} canProceed={true}>
            <div className="rounded-full bg-sky-100 p-2 dark:bg-sky-700">
              <ArrowLeftIcon />
            </div>
            <div>
              <p className="font-bold">Previous</p>
              <p className="text-sm">{previous.name}</p>
            </div>
          </PaginationLinkWrapper>
        ) : (
          <div className="flex-1"></div>
        )}

        {next ? (
          <PaginationLinkWrapper
            link={next.link}
            className="float-right text-right"
            canProceed={canProceed}
            onClick={handleNextClick}
          >
            <div>
              <p className="font-bold">Next</p>
              <p className="text-sm">{next.name}</p>
            </div>
            <div className="rounded-full bg-sky-100 p-2 dark:bg-sky-700">
              <ArrowRightIcon />
            </div>
          </PaginationLinkWrapper>
        ) : (
          <div className="flex-1"></div>
        )}
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
      className="w-full flex-1 rounded-md border border-sky-200 bg-sky-50 p-4 text-left leading-tight transition-colors hover:bg-sky-100 dark:bg-sky-800 dark:hover:bg-sky-700"
    >
      <div
        className={cn(
          "inline-flex h-full items-center gap-3 text-sky-700 dark:text-sky-100",
          className,
        )}
      >
        {children}
      </div>
    </button>
  ) : (
    <div className="flex-1 rounded-md border border-red-200 bg-red-50 p-4 leading-tight transition-colors dark:bg-red-800">
      <div className="flex h-full items-center justify-center gap-3 text-red-700 dark:text-red-50">
        Answer all quiz questions correctly to move on
        <div className="rounded-full bg-red-100 p-2 dark:bg-red-700 dark:text-white">
          <LockIcon />
        </div>
      </div>
    </div>
  );
};
