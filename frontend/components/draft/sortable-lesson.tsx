import React from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Lesson, Droplet } from "@/types";
import { GripVertical, Hammer, FilePieChart, BookText } from "lucide-react";

interface SortableLessonProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">;
  pathname: string;
  classes: string;
}

export function SortableLesson({
  lesson,
  droplet,
  pathname,
  classes,
}: SortableLessonProps) {
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg transition-colors",
        isDragging && "shadow-lg z-10",
      )}
    >
      <div className="flex items-center">
        {/* Handle - only this element gets drag listeners */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
        </div>

        {/* Link - no drag behavior */}
        <Link
          href={`/draft/d/${droplet.slug}/${lesson.slug}`}
          className={cn(classes, "flex-grow flex items-center")}
          passHref
        >
          {lesson.type === "activity" ? (
            <Hammer className="shrink-0" />
          ) : lesson.type === "caseStudy" ? (
            <FilePieChart className="w-5 h-5 mr-0.5 shrink-0" />
          ) : (
            <BookText className="shrink-0" />
          )}
          <span className="leading-snug ml-3">{lesson.name}</span>
        </Link>
      </div>
    </li>
  );
}
