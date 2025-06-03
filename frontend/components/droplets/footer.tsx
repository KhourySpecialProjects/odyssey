"use client";

import { cn } from "@/lib/utils";
import { Droplet, DropletLesson } from "@/types";
import { ArrowLeftIcon, ArrowRightIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type PaginationProps = {
  link: string;
  name: string;
};

export default function DropletFooter({
  droplet,
}: {
  droplet: Pick<Droplet, "slug" | "droplet_lessons">;
}) {
  const pathname = usePathname();
  const [canProceed, setCanProceed] = useState(false);

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
      {/* {pathSegments.length > 3 &&
        pathSegments.at(-1)?.toLowerCase() !== "introduction" &&
        !pathSegments.at(-1)?.toLowerCase().includes("recap") && (
          <div className="flex flex-col items-center w-full gap-4 p-8 mx-auto mt-8 border rounded-md max-w-prose border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">
              Was this lesson informative?
            </h2>
            <div className="flex gap-2">
              <Button size="lg" variant="outline" before={<ThumbsUpIcon />}>
                Yes
              </Button>
              <Button size="lg" variant="outline" after={<ThumbsDownIcon />}>
                No
              </Button>
            </div>
          </div>
        )} */}

      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 pb-2 md:flex-row md:justify-between xl:w-full">
        {previous ? (
          <PaginationLinkWrapper link={previous.link} canProceed={true}>
            <div className="rounded-full bg-sky-100 dark:bg-sky-700 p-2">
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
          >
            <div>
              <p className="font-bold">Next</p>
              <p className="text-sm">{next.name}</p>
            </div>
            <div className="rounded-full bg-sky-100 p-2">
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
}: {
  link: string;
  className?: string;
  children: React.ReactNode;
  canProceed: boolean;
}) =>
  canProceed ? (
    <Link
      href={link}
      className="flex-1 rounded-md border border-sky-200 bg-sky-50 p-4 leading-tight transition-colors hover:bg-sky-100 dark:bg-sky-800 dark:hover:bg-sky-700"
    >
      <div
        className={cn(
          "inline-flex h-full items-center gap-3 text-sky-700 dark:text-sky-100",
          className,
        )}
      >
        {children}
      </div>
    </Link>
    ) : (
    <div
      className="flex-1 rounded-md border border-red-200 bg-red-50 p-4 leading-tight transition-colors dark:bg-red-800"
    >
      <div
        className="flex h-full items-center justify-center gap-3 text-red-700 dark:text-red-50"
      >
        Answer all quiz questions correctly to move on
        <div className="rounded-full bg-red-100 dark:bg-red-700 p-2 dark:text-white">
          <LockIcon />
        </div>
      </div>
    </div>
  );
