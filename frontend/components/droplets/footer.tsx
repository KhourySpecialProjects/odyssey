"use client";

import { cn } from "@/lib/utils";
import { Button } from "@lemonsqueezy/wedges";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type PaginationProps = {
  link: string;
  name: string;
};

export default function DropletFooter({ droplet }: { droplet: any }) {
  const pathname = usePathname();

  let previous: PaginationProps | null = null;
  let next: PaginationProps | null = null;

  const pathSegments = pathname.split("/");

  if (pathSegments.length > 3) {
    const lessonSlug = pathname.split("/").at(-1);
    const currentLessonSlugIndex = droplet.lessons
      .map((l: any) => l.slug)
      .indexOf(lessonSlug);

    if (currentLessonSlugIndex === 0) {
      previous = {
        link: `/d/${droplet.slug}`,
        name: "Overview",
      };
    } else {
      const prevLesson = droplet.lessons[currentLessonSlugIndex - 1];
      previous = {
        link: `/d/${droplet.slug}/${prevLesson.slug}`,
        name: prevLesson.title,
      };
    }

    if (currentLessonSlugIndex === droplet.lessons.length - 1) {
      next = null;
    } else {
      const nextLesson = droplet.lessons[currentLessonSlugIndex + 1];
      next = {
        link: `/d/${droplet.slug}/${nextLesson.slug}`,
        name: nextLesson.title,
      };
    }
  } else {
    const nextLesson = droplet.lessons[0];
    next = {
      link: `/d/${droplet.slug}/${nextLesson.slug}`,
      name: nextLesson.title,
    };
  }

  return (
    <>
      {pathSegments.length > 3 &&
      !pathSegments.at(-1)?.toLowerCase().includes("recap") ? (
        <div className="mt-8 flex flex-col gap-4 max-w-prose mx-auto p-8 w-full items-center rounded-md border border-cyan-200">
          <h2 className="font-bold text-lg text-cyan-700">
            Was this lesson informative?
          </h2>
          <div className="flex gap-2">
            <Button
              size="md"
              variant="outline"
              before={<ThumbsUpIcon className="w-4 h-4" />}
            >
              Yes
            </Button>
            <Button
              size="md"
              variant="outline"
              after={<ThumbsDownIcon className="w-4 h-4" />}
            >
              No
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-8 pb-2 max-w-prose mx-auto flex flex-col md:flex-row gap-2 md:justify-between">
        {previous ? (
          <PaginationLinkWrapper link={previous.link}>
            <div className="rounded-full p-2 bg-cyan-100">
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
            className="text-right float-right"
          >
            <div>
              <p className="font-bold">Next</p>
              <p className="text-sm">{next.name}</p>
            </div>
            <div className="rounded-full p-2 bg-cyan-100">
              <ArrowRightIcon />
            </div>
          </PaginationLinkWrapper>
        ) : (
          <div className="flex-1"></div>
        )}
      </div>
    </>
  );
}

const PaginationLinkWrapper = ({
  link,
  className,
  children,
}: {
  link: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <Link
    href={link}
    className="leading-tight bg-cyan-50 hover:bg-cyan-100 p-4 rounded-md flex-1 transition-colors border border-cyan-200"
  >
    <div
      className={cn("inline-flex items-center gap-3 text-cyan-700", className)}
    >
      {children}
    </div>
  </Link>
);
