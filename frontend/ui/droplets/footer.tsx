"use client";

import { cn } from "@/lib/utils";
import { Button } from "@lemonsqueezy/wedges";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
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
    <div className="mt-8 border-t border-t-purple-100 pt-8 max-w-prose mx-auto flex flex-col md:flex-row gap-2 md:justify-between">
      {previous ? (
        <PaginationLinkWrapper link={previous.link}>
          <ArrowLeftIcon />
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
          <ArrowRightIcon />
        </PaginationLinkWrapper>
      ) : (
        <div className="flex-1"></div>
      )}
    </div>
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
    className="leading-tight bg-purple-50 hover:bg-purple-100 p-4 rounded-md flex-1 transition-colors"
  >
    <div
      className={cn(
        "inline-flex items-center gap-2 text-purple-700",
        className
      )}
    >
      {children}
    </div>
  </Link>
);
