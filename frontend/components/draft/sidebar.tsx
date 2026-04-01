"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import {
  cn,
  getPath,
  isAuthorizedUserAdmin,
  isAuthorizedUserFaculty,
  isContentCreator,
  isContentEditor,
} from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
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
  SettingsIcon,
  ArrowLeftIcon,
  PanelRightClose,
  PanelRightOpen,
  Home,
  Wand2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useLayoutEffect, useState, useEffect, useMemo } from "react";
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

import { ContentActionButton } from "./metadata/content-action-button";

import { AddExistingLesson } from "@/components/draft/add-existing-lesson";
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
    | "difficulty"
  >;
  availableDroplets: Pick<Droplet, "id" | "name" | "slug" | "lessons">[];
}) {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();

  const {
    dropletLessons,
    handleLessonReorder,
    updateDropletLessons,
    isProcessing,
  } = useLessonOrder(droplet);

  const [isOpen, setIsOpen] = useState(false);
  const [isAutoFormatting, setIsAutoFormatting] = useState(false);
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
    const handleResize = () => {
      // Auto-collapse sidebar on mobile screens
      if (window.innerWidth < 1280) {
        setExpanded(false);
      }
    };

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

  const handleAutoFormat = async () => {
    setIsAutoFormatting(true);
    try {
      const allBlocks: {
        index: number;
        type: string;
        textPreview: string;
        hasImage: boolean;
        imageUrl?: string;
      }[] = [];
      let globalIndex = 0;

      for (const lesson of lessons) {
        const blocks = lesson.blocksV2 ?? [];
        for (const block of blocks) {
          const b = block as any;
          const textContent =
            b.content
              ?.map((c: any) => c.text ?? "")
              .join("")
              .slice(0, 100) ?? "";

          allBlocks.push({
            index: globalIndex,
            type: b.type ?? "unknown",
            textPreview: textContent,
            hasImage: b.type === "image",
            imageUrl: b.props?.url,
          });
          globalIndex++;
        }
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

  const classes = {
    link: "flex items-center p-2 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 group transition-colors",
    activeLink: "font-bold dark:bg-slate-500 light:bg-sky-100",
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
          <PanelRightClose
            className="dark:text-white"
            data-testid="sidebar-overlay"
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
          className="fixed top-[120px] left-3 z-40 hidden items-center rounded-lg bg-white p-3 text-slate-800 shadow-md transition-all hover:scale-110 hover:bg-slate-100 focus:ring-2 focus:ring-slate-200 focus:outline-none xl:inline-flex dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
          onClick={() => setExpanded(true)}
        >
          <PanelRightClose className="h-6 w-6 dark:text-white" />
        </button>
      )}
      <aside
        id="sidebar"
        className={cn(
          "fixed left-0 z-40 h-screen w-64 transition-transform xl:sticky xl:top-0",
          expanded ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col overflow-y-auto bg-slate-50 py-4 xl:justify-between xl:pb-0 dark:bg-slate-800">
          <div className="px-3">
            <div className="flex flex-row justify-between pr-2">
              <Button
                type="button"
                onClick={() =>
                  droplet.status !== "draft"
                    ? setIsOpen(true)
                    : router.push(`/my-content`)
                }
                className={cn(
                  "flex items-center justify-start gap-2 bg-slate-50 text-base text-black hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700",
                )}
              >
                <div className="flex w-6 justify-center">
                  <ArrowLeftIcon className="h-5 w-5 shrink-0" />
                </div>
                <Home data-testid="home" />
              </Button>
              <div className="w-full"></div>

              <button onClick={() => setExpanded(false)}>
                <PanelRightOpen />
              </button>
            </div>
            <p className="my-2 p-2 text-lg leading-7 font-extrabold">
              {droplet.name}
            </p>

            <ul className="flex w-full flex-col items-center font-medium">
              <li className="w-full space-y-2">
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
              </li>
            </ul>
            <div className="flex w-full flex-col gap-2 pb-2">
              <Link
                className="rounded-full bg-purple-400 px-6 py-2 text-center text-black hover:bg-purple-500 dark:bg-purple-600 dark:text-white dark:hover:bg-purple-800"
                href={`/d/${droplet.slug}`}
              >
                Preview
              </Link>
              <button
                onClick={handleAutoFormat}
                disabled={isAutoFormatting}
                className="flex items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-2 text-center text-black transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-700"
              >
                {isAutoFormatting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Formatting...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Auto-Format Slides
                  </>
                )}
              </button>
              {hasSlideBreaks ? (
                <Link
                  className="rounded-full bg-indigo-400 px-6 py-2 text-center text-black hover:bg-indigo-500 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-800"
                  href={`/d/${droplet.slug}/present`}
                  target="_blank"
                >
                  Present
                </Link>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-disabled="true"
                        onClick={(e) => e.preventDefault()}
                        className="w-full cursor-not-allowed rounded-full bg-slate-300 px-6 py-2 text-center text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      >
                        Present
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      No presentation blocks in sight
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Edit Draft - Special handling */}
              {droplet.originalDropletId && droplet.status === "draft" && (
                <>
                  {/* Content Creators can only request review for edit drafts */}
                  {!droplet.inReview && isContentCreator(user.roles) && (
                    <>
                      <ContentActionButton
                        droplet={droplet}
                        actionType="requestReview"
                        buttonText={
                          droplet.afterReview
                            ? "Re-Request Review"
                            : "Request Review"
                        }
                      />
                      <p className="px-2 text-xs text-slate-600 dark:text-slate-400">
                        Submit your changes for review before publishing
                      </p>
                    </>
                  )}

                  {/* Content Editors and Admins can request changes on edit drafts in review */}
                  {droplet.inReview &&
                    (isContentEditor(user.roles) ||
                      isAuthorizedUserFaculty(user.roles) ||
                      isAuthorizedUserAdmin(user.roles)) && (
                      <ContentActionButton
                        droplet={droplet}
                        actionType="requestChanges"
                        buttonText="Request Changes"
                      />
                    )}

                  {/* Faculty/Admin/Content Editors (when in review) can publish edit drafts */}
                  {(isAuthorizedUserAdmin(user.roles) ||
                    isAuthorizedUserFaculty(user.roles) ||
                    (isContentEditor(user.roles) && droplet.inReview)) && (
                    <>
                      <ContentActionButton
                        droplet={droplet}
                        actionType="publishDraft"
                        buttonText="Publish Changes"
                      />
                      <p className="px-2 text-xs text-slate-600 dark:text-slate-400">
                        This will update the published version with your changes
                      </p>
                    </>
                  )}
                </>
              )}

              {/* Regular Draft - Show normal workflow */}
              {!droplet.originalDropletId && (
                <>
                  {!droplet.inReview &&
                    droplet.status === "draft" &&
                    isContentCreator(user.roles) && (
                      <ContentActionButton
                        droplet={droplet}
                        actionType="requestReview"
                        buttonText={
                          droplet.afterReview
                            ? "Re-Request Review"
                            : "Request Review"
                        }
                      />
                    )}

                  {/* Review Droplet Button - Content editors and admins only, draft in review */}
                  {droplet.inReview &&
                    droplet.status === "draft" &&
                    (isContentEditor(user.roles) ||
                      isAuthorizedUserAdmin(user.roles)) && (
                      <ContentActionButton
                        droplet={droplet}
                        actionType="requestChanges"
                        buttonText="Request Changes"
                      />
                    )}

                  {/* Publish Button - Faculty/Admin anytime, Content Editor only when in review */}
                  {droplet.status === "draft" &&
                    (isAuthorizedUserFaculty(user.roles) ||
                      isAuthorizedUserAdmin(user.roles) ||
                      (isContentEditor(user.roles) && droplet.inReview)) && (
                      <ContentActionButton
                        droplet={droplet}
                        actionType="publish"
                        buttonText="Publish Droplet"
                      />
                    )}
                </>
              )}
            </div>

            <Separator
              orientation="horizontal"
              className="my-2 dark:bg-slate-500"
            />

            <Link
              href={`/draft/d/${droplet.slug}`}
              className={cn(
                "flex w-full items-center justify-start px-4 text-base dark:bg-black",
                classes.link,
                pathname === `/draft/d/${droplet.slug}` && classes.activeLink,
              )}
            >
              <div className="flex w-6 justify-center">
                <SettingsIcon className="h-5 w-5 shrink-0" />
              </div>
              <span className="ms-2 leading-snug">Metadata</span>
            </Link>

            {/* Add lesson section */}
            <MantineProvider>
              <AddLesson droplet={droplet} onAddLesson={addLessonCallback} />
            </MantineProvider>
            {/* Add existing lesson section - NEW */}
            <AddExistingLesson
              droplet={droplet}
              availableDroplets={availableDroplets}
              currentLessonCount={dropletLessons.length}
              onAddLesson={addLessonCallback}
            />

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
                <ul className="space-y-1">
                  {lessons.map((lesson) => (
                    <SortableLesson
                      key={lesson.id}
                      lesson={lesson}
                      droplet={droplet}
                      pathname={pathname}
                      classes={classes}
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
      </aside>
    </>
  );
}
