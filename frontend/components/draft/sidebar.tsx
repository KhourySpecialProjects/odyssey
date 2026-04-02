"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import { cn, getPath } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Droplet, Lesson, User } from "@/types";
import {
  IconArrowLeft,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconEye,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useLayoutEffect, useState, useEffect } from "react";
import { Separator } from "../ui/separator";
import { AddLesson } from "@/components/draft/add-lesson";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableLesson } from "@/components/draft/sortable-lesson";
import { useLessonOrder } from "./metadata/hooks/useLessonOrder";
import { Button } from "../ui/button";
import { createDropletAnnouncement } from "@/lib/requests/feed";

import { MantineProvider } from "@mantine/core";

export function Sidebar({
  user,
  droplet,
  availableDroplets,
}: {
  user: User;
  droplet: Pick<
    Droplet,
    | "id"
    | "name"
    | "slug"
    | "lessons"
    | "status"
    | "inReview"
    | "afterReview"
    | "focusArea"
    | "learningObjectives"
    | "isHidden"
    | "type"
    | "originalDropletId"
  >;
  availableDroplets: Pick<Droplet, "id" | "name" | "slug" | "lessons">[];
}) {
  const [expanded, setExpanded] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(69);
  const pathname = usePathname();

  const {
    dropletLessons,
    handleLessonReorder,
    updateDropletLessons,
    isProcessing,
  } = useLessonOrder(droplet);

  const [isOpen, setIsOpen] = useState(false);
  const lessons = (dropletLessons || [])
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);

  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector<HTMLElement>(".sticky.top-0.z-50");
      if (header) setHeaderHeight(header.getBoundingClientRect().height);
    };

    const handleResize = () => {
      // Auto-collapse sidebar on mobile screens
      if (window.innerWidth < 1280) {
        setExpanded(false);
      }
      updateHeaderHeight();
    };

    updateHeaderHeight();
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDropletPost = async () => {
    try {
      await createDropletAnnouncement(droplet.name, droplet.id);
      router.push(`/my-content`);
    } catch (error) {
      console.error("Failed to make playlist announcement: ", error);
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const classes = {
    link: "relative flex h-[44px] w-full items-center rounded-[78px] transition-colors hover:bg-slate-200 dark:hover:bg-slate-700",
    activeLink: "bg-[#2D7597] text-white",
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = lessons.findIndex((item) => item.id === active.id);
      const newIndex = lessons.findIndex((item) => item.id === over?.id);
      const newLessons = arrayMove(lessons, oldIndex, newIndex).map((l, i) => ({
        ...l,
        orderIndex: i,
      }));
      handleLessonReorder(newLessons);
    }
  };

  const addLessonCallback = (newLesson: Lesson) => {
    updateDropletLessons([
      ...dropletLessons,
      {
        ...newLesson,
        orderIndex: dropletLessons.length,
      },
    ]);
  };

  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!user) return <UnauthorizedRoute />;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/50 transition-opacity xl:hidden dark:bg-slate-900/80",
          expanded ? "z-30 opacity-100" : "-z-10 opacity-0",
        )}
        onClick={() => setExpanded(false)}
      />

      <div className="z-20 inline-flex w-full items-center gap-2 border-b border-b-slate-200 px-3 py-2 text-sm xl:hidden">
        <button
          aria-controls="sidebar"
          type="button"
          className="z-20 inline-flex items-center rounded-lg p-2 text-sm text-slate-500 hover:bg-slate-100 focus:ring-2 focus:ring-slate-200 focus:outline-none xl:hidden dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
          onClick={() => setExpanded(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <IconLayoutSidebarLeftExpand
            className="dark:text-white"
            data-testid="sidebar-overlay"
            stroke={1.8}
          />
        </button>
        <Link
          href={getPath("droplet", droplet.slug)}
          className="z-20 text-lg font-bold"
        >
          {droplet.name}
        </Link>
      </div>
      {!expanded && (
        <button
          aria-controls="sidebar"
          type="button"
          className="fixed top-[120px] left-3 z-40 hidden items-center rounded-lg bg-white p-2 text-slate-800 shadow-md transition-all hover:bg-slate-100 focus:ring-2 focus:ring-slate-200 focus:outline-none xl:inline-flex dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
          onClick={() => setExpanded(true)}
        >
          <IconLayoutSidebarLeftExpand
            className="h-5 w-5 dark:text-white"
            stroke={1.8}
          />
        </button>
      )}
      <aside
        id="sidebar"
        className={cn(
          "fixed left-0 z-40 w-64 transition-transform",
          expanded ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ top: headerHeight, height: `calc(100vh - ${headerHeight}px)` }}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col overflow-y-auto bg-[#FCFCFD] py-4 shadow-[0px_4px_4px_rgba(0,0,0,0.25)] xl:justify-between xl:pb-0 dark:bg-slate-900">
          <div className="px-3">
            <div className="flex flex-row items-center justify-between pb-2">
              <button
                type="button"
                data-testid="home"
                onClick={() =>
                  droplet.status !== "draft"
                    ? setIsOpen(true)
                    : router.push(`/my-content`)
                }
                className="flex flex-1 items-center p-2"
              >
                <IconArrowLeft className="h-5 w-5 flex-shrink-0" stroke={1.8} />
              </button>
              <Link
                href={`/d/${droplet.slug}`}
                title="Preview droplet"
                className="p-2 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <IconEye className="h-5 w-5" stroke={1.8} />
              </Link>
              <button
                onClick={() => setExpanded(false)}
                className="p-2 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <IconLayoutSidebarLeftCollapse
                  className="h-5 w-5"
                  stroke={1.8}
                />
              </button>
            </div>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
              <DialogContent className="sm:max-w-[825px]">
                <DialogHeader>
                  <DialogTitle>
                    Would you like to announce these changes to everyone
                    enrolled in this droplet?
                  </DialogTitle>
                </DialogHeader>

                <div className="mt-4 flex flex-col gap-4">
                  <Button onClick={handleDropletPost}>Share</Button>
                  <Button onClick={() => router.push(`/my-content`)}>
                    Not Now
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex flex-col space-y-1.5">
              <p className="px-4 pb-3 text-xl leading-7 font-extrabold">
                {droplet.name}
              </p>

              <Link
                href={`/draft/d/${droplet.slug}`}
                className={cn(
                  "relative flex h-[44px] w-full items-center rounded-[78px] transition-colors",
                  pathname === `/draft/d/${droplet.slug}`
                    ? classes.activeLink
                    : "hover:bg-slate-200 dark:hover:bg-slate-700",
                )}
              >
                <IconSearch
                  className={cn(
                    "ml-4 h-5 w-5 shrink-0",
                    pathname === `/draft/d/${droplet.slug}` ? "text-white" : "",
                  )}
                  stroke={1.8}
                />
                <span
                  className={cn(
                    "ml-2 text-lg leading-none font-medium",
                    pathname === `/draft/d/${droplet.slug}`
                      ? "text-white"
                      : "text-black dark:text-white",
                  )}
                >
                  Overview
                </span>
              </Link>

              <div className="h-1" />

              {/* Add lesson section */}
              <div>
                <MantineProvider>
                  <AddLesson
                    droplet={droplet}
                    onAddLesson={addLessonCallback}
                    availableDroplets={availableDroplets}
                    currentLessonCount={dropletLessons.length}
                  />
                </MantineProvider>
              </div>

              {/* Sortable lessons list */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={lessons.map((lesson) => lesson.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1.5">
                    {lessons.map((lesson) => (
                      <SortableLesson
                        key={lesson.id}
                        lesson={lesson}
                        droplet={droplet}
                        pathname={pathname}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

              {isProcessing && (
                <div className="p-2 text-center text-sm text-slate-500 dark:text-slate-400">
                  Updating lesson order...
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
