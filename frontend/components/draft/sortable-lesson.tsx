import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Lesson, Droplet } from "@/types";
import { IconGripVertical } from "@tabler/icons-react";

interface SortableLessonProps {
  lesson: Lesson;
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">;
  pathname: string;
}

export function SortableLesson({
  lesson,
  droplet,
  pathname,
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
      <div
        className={cn(
          "flex min-h-[44px] items-center rounded-xl px-1 transition-colors",
          pathname === `/draft/d/${droplet.slug}/${lesson.slug}`
            ? "bg-[#287697]/10 text-[#287697] dark:bg-[#287697]/20 dark:text-[#4AABCF]"
            : "text-[#344054] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        )}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab px-1 active:cursor-grabbing"
        >
          <IconGripVertical
            className={cn(
              "h-4 w-4 shrink-0",
              pathname === `/draft/d/${droplet.slug}/${lesson.slug}`
                ? "text-[#287697] dark:text-[#4AABCF]"
                : "text-slate-400",
            )}
            stroke={1.8}
          />
        </div>

        <Link
          href={`/draft/d/${droplet.slug}/${lesson.slug}`}
          onClick={handleLessonClick}
          className="flex flex-grow py-2.5"
          passHref
        >
          <span className="pl-1 text-sm leading-snug font-medium">
            {lesson.name}
          </span>
        </Link>
      </div>
    </li>
  );
}
