"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import {
  cn,
  getInitials,
  getPath,
  isAuthorizedUserAdmin,
  condenseRoleTitles,
} from "@/lib/utils";
import { Droplet, Lesson, User } from "@/types";
import {
  ChevronDownIcon,
  PersonStanding,
  LogOutIcon,
  MenuIcon,
  ShipIcon,
  TowerControlIcon,
  SettingsIcon,
  ArrowLeftIcon,
  MoveLeftIcon,
  CogIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useLayoutEffect, useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

export function Sidebar({
  user,
  droplet,
  onLessonsUpdate,
}: {
  user: User;
  droplet: Pick<Droplet, "id" | "name" | "slug" | "droplet_lessons">;
  onLessonsUpdate?: (lessons: Lesson[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  // Convert droplet_lessons to lessons for existing logic
  const lessons = droplet.droplet_lessons
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((dl) => dl.lesson);

  const {
    dropletLessons,
    handleLessonReorder,
    updateDropletLessons,
    isProcessing,
  } = useLessonOrder(droplet);

  const isAdmin = user && isAuthorizedUserAdmin(user.roles);

  const classes = {
    link: "flex items-center p-2 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 group transition-colors",
    activeLink: "font-bold bg-slate-200 [&>svg]:text-sky-700 text-sky-700",
  };

  // Handle window resize
  useLayoutEffect(() => {
    const handleResize = () => setExpanded(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // DnD sensors setup
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

      // Convert lessons back to droplet_lessons format
      const newDropletLessons = newLessons.map((lesson, index) => ({
        id: dropletLessons.find((dl) => dl.lesson.id === lesson.id)?.id,
        lesson,
        orderIndex: index,
      }));

      handleLessonReorder(
        newDropletLessons.map((dl) => ({
          id: dl.id ?? 0, // Provide a default value if id is undefined
          lesson: dl.lesson,
          orderIndex: dl.orderIndex,
        })),
      );
    }
  };
  // // Handle drag end and reorder
  // const handleDragEnd = (event: DragEndEvent) => {
  //   const { active, over } = event;

  //   if (active.id !== over?.id) {
  //     const oldIndex = lessons.findIndex((item) => item.id === active.id);
  //     const newIndex = lessons.findIndex((item) => item.id === over?.id);
  //     const newLessons = arrayMove(lessons, oldIndex, newIndex);

  //     handleLessonReorder(newLessons);
  //   }
  // };

  const addLessonCallback = (newLesson: Lesson) => {
    // updateDropletLessons([...lessons, newLesson]);
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
  };

  const handleLessonDelete = (lessonId: string) => {
    console.log("deleting lesson from frontend");
    const newLessons = lessons.filter(
      (lesson) => lesson.id.toString() !== lessonId,
    );
    // updateDropletLessons(newLessons);
    updateDropletLessons(
      newLessons.map((lesson, index) => ({
        id: 0,
        lesson,
        orderIndex: index,
      })),
    );
  };

  // Add this state to ensure consistent mounting
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Use useEffect to handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Render nothing until mounted on client
  if (!mounted) return null;

  if (!user) return <UnauthorizedRoute />;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "bg-slate-900/50 dark:bg-slate-900/80 fixed inset-0 transition-opacity",
          expanded ? "opacity-1 z-30" : "opacity-0 -z-10",
        )}
        onClick={() => setExpanded(false)}
      />

      {/* Mobile header */}
      <div className="z-20 inline-flex items-center w-full gap-2 px-3 py-2 text-sm border-b md:hidden border-b-slate-200">
        <button
          aria-controls="sidebar"
          type="button"
          className="z-20 inline-flex items-center p-2 text-sm rounded-lg text-slate-500 md:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
          onClick={() => setExpanded(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <MenuIcon />
        </button>
        <Link
          href={getPath("droplet", droplet.slug)}
          className="z-20 text-lg font-bold"
        >
          {droplet.name}
        </Link>
      </div>

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "fixed top-0 left-0 z-40 w-64 h-screen transition-transform",
          expanded
            ? "md:translate-x-80 -transform-none"
            : "md:translate-x-0 -translate-x-full",
        )}
        aria-label="Sidebar"
      >
        <div className="flex flex-col h-full py-4 overflow-y-auto md:justify-between md:pb-0 bg-slate-50 dark:bg-slate-800">
          {/* Top section */}
          <div className="px-3">
            {/* Logo */}
            <Link href="/explore" className="block p-2 mb-4">
              <Image
                src="/logo.svg"
                alt="Khoury Odyssey Logo"
                width={200}
                height={55}
                priority
              />
            </Link>

            <Separator />

            {/* Droplet name */}
            <div className="flex items-center justify-between p-2 my-2">
              <p className="text-lg font-extrabold leading-7">{droplet.name}</p>
              <Link
                href={`/draft/d/${droplet.slug}`}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-9 w-9"
                aria-label="Back to Drafts"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
            </div>

            {/* Metadata link */}
            <ul className="space-y-4 w-full font-medium flex flex-col items-center">
              <li className="w-full space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className={cn(
                    classes.link,
                    "w-full flex items-center justify-start text-base px-4",
                  )}
                >
                  <div className="w-6 flex justify-center">
                    <ArrowLeftIcon className="shrink-0 w-5 h-5" />
                  </div>
                  <span className="leading-snug ms-2">Save Droplet</span>
                </Button>
                <Link
                  href={`/draft/d/${droplet.slug}`}
                  className={cn(
                    "w-full flex items-center justify-start text-base px-4",
                    classes.link,
                    pathname === `/draft/d/${droplet.slug}` &&
                      classes.activeLink,
                  )}
                >
                  <div className="w-6 flex justify-center">
                    <SettingsIcon className="shrink-0 w-5 h-5" />
                  </div>
                  <span className="leading-snug ms-2">Metadata</span>
                </Link>
              </li>
              <li className="pb-2 w-full text-center">
                <Link
                  className="w-full px-6 py-2 rounded-full text-white bg-purple-500 hover:bg-purple-600"
                  href={`/d/${droplet.slug}`}
                >
                  Preview
                </Link>
              </li>
            </ul>

            <Separator orientation="horizontal" className="my-2" />

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

            {/* Loading indicator when processing updates */}
            {isProcessing && (
              <div className="text-sm text-slate-500 dark:text-slate-400 p-2 text-center">
                Updating lesson order...
              </div>
            )}
          </div>

          {/* User menu section */}
          <div className="bottom-0 left-0 w-full p-2 mt-4 space-y-4 border-t bg-slate-50 border-t-slate-200 md:sticky md:px-3 md:mb-0 md:flex-col dark:bg-slate-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="w-full group flex shrink cursor-pointer select-none items-center justify-between gap-1 rounded-lg p-1.5 px-2 text-sm text-slate-600 transition-colors duration-100 wg-antialiased hover:bg-slate-100 dark:hover:bg-white/5">
                  <div className="inline-flex flex-row items-center justify-between">
                    {user.image ? (
                      <Avatar variant="round" size="xs">
                        <AvatarImage src={user.image} />
                        <AvatarFallback>
                          {getInitials(user.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}

                    <span className="font-medium ms-2">
                      Hi, <b>{user.name ?? user.email}</b>!
                    </span>
                  </div>

                  <ChevronDownIcon className="w-5 h-5 trigger-icon text-slate-400" />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="mb-3 min-w-[220px]">
                <DropdownMenuLabel className="text-xs">
                  NUID: {user.nuid || "unknown"}
                  <br />
                  Role(s): {condenseRoleTitles(user.roles) || "unknown"}
                </DropdownMenuLabel>

                <DropdownMenuItem asChild>
                  <Link href="/explore">
                    <ShipIcon className="w-4 h-4 mr-2" />
                    <span>Explore</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <CogIcon className="w-4 h-4 mr-2" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>

                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <TowerControlIcon className="w-4 h-4 mr-2" />
                      <span>Admin</span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer"
                >
                  <LogOutIcon className="w-4 h-4 mr-2" />
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
