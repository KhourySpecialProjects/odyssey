"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import { cn, getInitials, getPath, condenseRoleTitles } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AuthorizedUser, Droplet, Lesson, User } from "@/types";
import {
  ChevronDownIcon,
  PersonStanding,
  LogOutIcon,
  ShipIcon,
  SettingsIcon,
  ArrowLeftIcon,
  PanelRightClose,
  PanelRightOpen,
  Home,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useLayoutEffect, useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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

export function Sidebar({
  user,
  droplet,
  authorizedUser,
}: {
  user: User;
  droplet: Pick<Droplet, "id" | "name" | "slug" | "droplet_lessons" | "status">;
  authorizedUser: AuthorizedUser | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  const lessons = droplet.droplet_lessons
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((dl) => dl.lesson);

  const {
    dropletLessons,
    handleLessonReorder,
    updateDropletLessons,
    isProcessing,
  } = useLessonOrder(droplet);

  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    window.addEventListener("resize", () => setExpanded(false));
    return () => window.removeEventListener("resize", () => setExpanded(false));
  }, []);

  const handleDropletPost = async () => {
    try {
      await createDropletAnnouncement(droplet.name, droplet.id);
      router.push(`/drafts`);
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
      const newLessons = arrayMove(lessons, oldIndex, newIndex);

      const newDropletLessons = newLessons.map((lesson, index) => ({
        id: dropletLessons.find((dl) => dl.lesson.id === lesson.id)?.id,
        lesson,
        orderIndex: index,
      }));

      handleLessonReorder(
        newDropletLessons.map((dl) => ({
          id: dl.id ?? 0,
          lesson: dl.lesson,
          orderIndex: dl.orderIndex,
        })),
      );
    }
  };

  const addLessonCallback = (newLesson: Lesson) => {
    updateDropletLessons([
      ...dropletLessons,
      {
        id: 0,
        lesson: newLesson,
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
          "fixed inset-0 bg-slate-900/50 transition-opacity dark:bg-slate-900/80",
          expanded ? "z-30 opacity-1" : "-z-10 opacity-0",
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

      <aside
        id="sidebar"
        className={cn(
          "fixed left-0 z-40 h-screen w-64 transition-transform xl:sticky xl:top-0",
          expanded ? "translate-x-0" : "-translate-x-full xl:translate-x-0",
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
                    : router.push(`/drafts`)
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

              <button
                onClick={() => setExpanded(false)}
                className={`xl:hidden`}
              >
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
                      <Button onClick={() => router.push(`/drafts`)}>
                        Not Now
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </li>
              <li className="w-full pb-2 text-center">
                <Link
                  className="w-full rounded-full bg-purple-500 px-6 py-2 text-white hover:bg-purple-600"
                  href={`/d/${pathname.split("d/")[1]}`}
                >
                  Preview
                </Link>
              </li>
            </ul>

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
            <AddLesson droplet={droplet} onAddLesson={addLessonCallback} />

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

          <div className="bottom-0 left-0 mt-4 w-full space-y-4 border-t border-t-slate-200 bg-slate-50 p-2 md:sticky md:mb-0 md:flex-col md:px-3 dark:bg-slate-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="group wg-antialiased flex w-full shrink cursor-pointer items-center justify-between gap-1 rounded-lg p-1.5 px-2 text-sm text-slate-600 transition-colors duration-100 select-none hover:bg-slate-100 dark:hover:bg-white/5">
                  <div className="inline-flex flex-row items-center justify-between">
                    {authorizedUser?.profilePhoto ? (
                      <Avatar variant="round" size="xs">
                        <AvatarImage
                          src={
                            authorizedUser?.profilePhoto ||
                            user?.image ||
                            undefined
                          }
                        />
                      </Avatar>
                    ) : user.image ? (
                      <Avatar variant="round" size="xs">
                        <AvatarImage src={user.image} />
                        <AvatarFallback>
                          {getInitials(user.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}

                    <span className="ms-2 font-medium dark:text-slate-300">
                      Hi, <b>{user.name ?? user.email}</b>!
                    </span>
                  </div>

                  <ChevronDownIcon className="trigger-icon h-5 w-5 text-slate-400" />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="mb-3 min-w-[220px]">
                <DropdownMenuLabel className="text-xs">
                  NUID: {user.nuid || "unknown"}
                  <br />
                  <p className="text-muted-foreground max-w-56 text-xs leading-none">
                    Role(s): {condenseRoleTitles(user.roles)}
                  </p>
                </DropdownMenuLabel>

                <DropdownMenuItem asChild>
                  <Link href="/explore">
                    <ShipIcon className="mr-2 h-4 w-4" />
                    <span>Explore</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <PersonStanding className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer"
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
}
