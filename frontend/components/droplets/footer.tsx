"use client";

import { cn } from "@/lib/utils";
import { Droplet } from "@/types";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";

type PaginationProps = {
  link: string;
  name: string;
};

export default function DropletFooter({ droplet }: { droplet: Droplet }) {
  const pathname = usePathname();

  if (!droplet.lessons || droplet.lessons.length === 0) return null;

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
        name: prevLesson.name,
      };
    }

    if (currentLessonSlugIndex === droplet.lessons.length - 1) {
      next = null;
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

  return (
    <>
      {pathSegments.length > 3 &&
      pathSegments.at(-1)?.toLowerCase() !== "introduction" &&
      !pathSegments.at(-1)?.toLowerCase().includes("recap") ? (
        <div className="flex flex-col items-center w-full gap-4 p-8 mx-auto mt-8 border rounded-md max-w-prose border-sky-200">
          <h2 className="text-lg font-bold text-sky-700">
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
      ) : null}

      <div className="flex flex-col gap-2 pb-2 mx-auto mt-8 max-w-prose md:flex-row md:justify-between">
        {previous ? (
          <PaginationLinkWrapper link={previous.link}>
            <div className="p-2 rounded-full bg-sky-100">
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
          >
            <div>
              <p className="font-bold">Next</p>
              <p className="text-sm">{next.name}</p>
            </div>
            <div className="p-2 rounded-full bg-sky-100">
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
    className="flex-1 p-4 leading-tight transition-colors border rounded-md bg-sky-50 hover:bg-sky-100 border-sky-200"
  >
    <div
      className={cn(
        "inline-flex items-center h-full gap-3 text-sky-700",
        className
      )}
    >
      {children}
    </div>
  </Link>
);
