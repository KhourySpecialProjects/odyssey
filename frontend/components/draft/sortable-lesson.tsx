import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, stripHtmlTags } from "@/lib/utils";
import { Lesson, Droplet } from "@/types";
import { GripVertical, Hammer, FilePieChart, BookText } from "lucide-react";

interface SortableLessonProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">;
  pathname: string;
  classes: {
    link?: string;
    activeLink?: string;
  };
}

export function SortableLesson({
  lesson,
  droplet,
  pathname,
  classes,
}: SortableLessonProps) {
  const router = useRouter();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lesson.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleLessonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/draft/d/${droplet.slug}/${lesson.slug}`);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg transition-colors",
        isDragging && "z-10 shadow-lg",
      )}
    >
      <div className="flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
        </div>

        <Link
          href={`/draft/d/${droplet.slug}/${lesson.slug}`}
          onClick={handleLessonClick}
          className={cn(
            classes.link,
            "flex flex-grow items-center",
            pathname === `/draft/d/${droplet.slug}/${lesson.slug}` &&
              classes.activeLink,
          )}
          passHref
        >
          {lesson.type === "activity" ? (
            <Hammer className="shrink-0" />
          ) : lesson.type === "caseStudy" ? (
            <FilePieChart className="mr-0.5 h-5 w-5 shrink-0" />
          ) : (
            <BookText className="shrink-0" />
          )}
          <span className="ml-3 leading-snug">{lesson.name}</span>
        </Link>
      </div>
    </li>
  );
}
