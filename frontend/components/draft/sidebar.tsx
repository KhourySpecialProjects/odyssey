"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import {
  cn,
  getPath,
  isAuthorizedUserAdmin,
  isContentCreator,
  isContentEditor,
} from "@/lib/utils";
import { ContentActionButton } from "@/components/draft/metadata/content-action-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  SLIDE_BREAK_MARKER,
  SLIDE_BREAK_TYPE,
} from "@/lib/blocknote/slide-break";
import { autoFormatSlides } from "@/lib/actions/auto-format-slides";
import { Droplet, Lesson, User } from "@/types";
import {
  IconArrowLeft,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLoader2,
  IconPresentation,
  IconSearch,
  IconWand,
} from "@tabler/icons-react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useLayoutEffect, useState, useEffect, useMemo } from "react";
import { AddLesson } from "@/components/draft/add-lesson";
import { AddExistingLesson } from "@/components/draft/add-existing-lesson";
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
  expanded,
  setExpanded,
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
    | "difficulty"
  >;
  availableDroplets: Pick<Droplet, "id" | "name" | "slug" | "lessons">[];
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const [headerHeight, setHeaderHeight] = useState(69);
  const pathname = usePathname();

  const {
    dropletLessons,
    handleLessonReorder,
    updateDropletLessons,
    isProcessing,
  } = useLessonOrder(droplet);

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFormatting, setIsAutoFormatting] = useState(false);
  const [hasAutoFormatted, setHasAutoFormatted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`auto-formatted-${droplet.id}`) === "true";
  });
  const [showAutoFormatConfirm, setShowAutoFormatConfirm] = useState(false);
  const lessons = (dropletLessons || [])
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const hasSlideBreaks = useMemo(
    () =>
      lessons.some((lesson) => {
        if (lesson.blocksVersion === "v2" && lesson.blocksV2) {
          return lesson.blocksV2.some(
            (b: { type?: string }) => b.type === SLIDE_BREAK_TYPE,
          );
        }
        return lesson.blocks?.some(
          (b) =>
            b.__component === "droplets.generic" &&
            b.content === SLIDE_BREAK_MARKER,
        );
      }),
    [lessons],
  );

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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createDropletAnnouncement(droplet.name, droplet.id);
      router.push(`/my-content`);
    } catch (error) {
      console.error("Failed to make playlist announcement: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const handleAutoFormat = async () => {
    setIsAutoFormatting(true);
    try {
      // Request current editor blocks via custom event
      const blocks = await new Promise<Record<string, unknown>[]>((resolve) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          if (settled) return;
          settled = true;
          window.removeEventListener("auto-format-blocks-response", handler);
          resolve([]);
        }, 2000);
        const handler = (e: Event) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          window.removeEventListener("auto-format-blocks-response", handler);
          resolve((e as CustomEvent).detail.blocks ?? []);
        };
        window.addEventListener("auto-format-blocks-response", handler);
        window.dispatchEvent(new CustomEvent("auto-format-blocks-request"));
      });

      const allBlocks: {
        index: number;
        type: string;
        textPreview: string;
        hasImage: boolean;
        imageUrl?: string;
      }[] = [];

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const content = b.content as { text?: string }[] | undefined;
        const props = b.props as { url?: string } | undefined;
        const textContent =
          content
            ?.map((c) => c.text ?? "")
            .join("")
            .slice(0, 100) ?? "";

        allBlocks.push({
          index: i,
          type: (b.type as string) ?? "unknown",
          textPreview: textContent,
          hasImage: b.type === "image",
          imageUrl: props?.url,
        });
      }

      if (allBlocks.length === 0) {
        toast.error("No content found in the editor");
        return;
      }

      const result = await autoFormatSlides(allBlocks);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      window.dispatchEvent(
        new CustomEvent("auto-format-slides", {
          detail: { operations: result.operations },
        }),
      );

      setHasAutoFormatted(true);
      localStorage.setItem(`auto-formatted-${droplet.id}`, "true");
      toast.success(
        `Auto-formatted: ${result.operations.filter((o) => o.type === "insert-slide-break").length} slide breaks inserted`,
      );
    } catch (err) {
      console.error("Auto-format error:", err);
      toast.error("Failed to auto-format slides");
    } finally {
      setIsAutoFormatting(false);
    }
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

  const addLessonsCallback = (newLessons: Lesson[]) => {
    updateDropletLessons([
      ...dropletLessons,
      ...newLessons.map((lesson, i) => ({
        ...lesson,
        orderIndex: dropletLessons.length + i,
      })),
    ]);
  };

  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!user) return <UnauthorizedRoute />;

  const showActionButton = droplet.status !== "published" && !droplet.inReview;
  const isAdmin = isAuthorizedUserAdmin(user.roles);
  const isEditor = isContentEditor(user.roles);
  const isCreator = isContentCreator(user.roles);
  const actionButtonProps =
    showActionButton && (isAdmin || isEditor)
      ? {
          actionType: (droplet.originalDropletId
            ? "publishDraft"
            : "publish") as "publishDraft" | "publish",
          buttonText: "Publish",
        }
      : showActionButton && isCreator
        ? { actionType: "requestReview" as const, buttonText: "Review" }
        : null;

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
            className="h-5 w-5 dark:text-white"
            data-testid="sidebar-overlay"
          />
        </button>
        <Link
          href={getPath("droplet", droplet.slug)}
          className="z-20 text-base font-bold"
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
          <IconLayoutSidebarLeftExpand className="h-5 w-5 dark:text-white" />
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
                <IconArrowLeft className="h-5 w-5 flex-shrink-0" />
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {hasAutoFormatted ? (
                      <button
                        aria-disabled="true"
                        onClick={(e) => e.preventDefault()}
                        className="cursor-not-allowed p-2 text-slate-400 dark:text-slate-600"
                      >
                        <IconWand className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAutoFormatConfirm(true)}
                        disabled={isAutoFormatting}
                        className="p-2 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-slate-300"
                      >
                        {isAutoFormatting ? (
                          <IconLoader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <IconWand className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {hasAutoFormatted
                      ? "Auto-format can only be used once per droplet"
                      : "Auto-Format Lesson"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {hasSlideBreaks ? (
                      <Link
                        href={`/d/${droplet.slug}/present`}
                        target="_blank"
                        className="p-2 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-500"
                      >
                        <IconPresentation className="h-5 w-5" />
                      </Link>
                    ) : (
                      <button
                        aria-disabled="true"
                        onClick={(e) => e.preventDefault()}
                        className="cursor-not-allowed p-2 text-slate-400 dark:text-slate-600"
                      >
                        <IconPresentation className="h-5 w-5" />
                      </button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {hasSlideBreaks
                      ? "Present"
                      : "No presentation blocks in sight"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <button
                onClick={() => setExpanded(false)}
                className="p-2 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <IconLayoutSidebarLeftCollapse className="h-5 w-5" />
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
                  <Button onClick={handleDropletPost} disabled={isSubmitting}>
                    Share
                  </Button>
                  <Button
                    onClick={() => router.push(`/my-content`)}
                    disabled={isSubmitting}
                  >
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
                className={
                  pathname === `/draft/d/${droplet.slug}`
                    ? "relative flex h-[44px] w-full items-center rounded-[78px] bg-[#2D7597] text-white transition-colors"
                    : "relative flex h-[44px] w-full items-center rounded-[78px] text-slate-900 transition-colors hover:bg-slate-200 dark:text-white dark:hover:bg-slate-700"
                }
              >
                <IconSearch
                  className={cn(
                    "ml-4 h-4 w-4 shrink-0",
                    pathname === `/draft/d/${droplet.slug}` ? "text-white" : "",
                  )}
                  stroke={1.8}
                />
                <span className="ml-2 text-base leading-none">Overview</span>
              </Link>
              <AlertDialog
                open={showAutoFormatConfirm}
                onOpenChange={setShowAutoFormatConfirm}
              >
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Auto-Format Lesson</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will use AI to automatically insert slide breaks and
                      set image layouts in the currently open lesson.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      This action can only be used once per droplet. You can
                      manually adjust slide breaks afterward.
                    </p>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleAutoFormat()}
                      className="bg-amber-500 text-black hover:bg-amber-600"
                    >
                      <IconWand className="mr-2 h-4 w-4" />
                      Format Slides
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Add lesson section */}
              <div>
                <MantineProvider>
                  <AddLesson
                    droplet={droplet}
                    onAddLesson={addLessonCallback}
                    onAddLessons={addLessonsCallback}
                  />
                  <AddExistingLesson
                    droplet={droplet}
                    availableDroplets={availableDroplets}
                    currentLessonCount={dropletLessons.length}
                    onAddLesson={addLessonCallback}
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

          <div className="border-t border-slate-200 p-3 dark:border-slate-700">
            <div className="flex gap-2 [&>*]:flex-1 [&>a]:flex-1 [&>button]:flex-1">
              <Link
                href={`/d/${droplet.slug}`}
                className="flex h-10 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white px-4 text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Preview
              </Link>
              {actionButtonProps && (
                <ContentActionButton
                  droplet={
                    droplet as Parameters<
                      typeof ContentActionButton
                    >[0]["droplet"]
                  }
                  actionType={actionButtonProps.actionType}
                  buttonText={actionButtonProps.buttonText}
                />
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
