"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import {
  cn,
  getInitials,
  getPath,
  isAuthorizedUserAdmin,
  condenseRoleTitles,
} from "@/lib/utils";
import { Droplet, User } from "@/types";
import {
  ChevronDownIcon,
  CogIcon,
  LogOutIcon,
  MenuIcon,
  ShipIcon,
  TowerControlIcon,
  SettingsIcon,
  Hammer,
  FilePieChart,
  BookText,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, {
  useLayoutEffect,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { debounce } from "lodash";
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableLesson } from "@/components/draft/sortable-lesson";
import { updateDroplet } from "@/lib/actions";

export function Sidebar({
  user,
  droplet,
}: {
  user: User;
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons">;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lessons, setLessons] = useState(droplet.lessons || []);
  const bottom = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setLessons(droplet.lessons || []);
  }, [droplet.lessons]);

  const isAdmin = user && isAuthorizedUserAdmin(user.roles);

  const classes = {
    link: "flex items-center p-2 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 group transition-colors",
    activeLink: "font-bold bg-slate-200 [&>svg]:text-sky-700 text-sky-700",
  };

  const scrollToBottom = () => {
    if (bottom.current) {
      bottom.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useLayoutEffect(() => {
    window.addEventListener("resize", () => setExpanded(false));
    return () => window.removeEventListener("resize", () => setExpanded(false));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLessons((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });

      const oldIndex = lessons.findIndex((item) => item.id === active.id);
      const newIndex = lessons.findIndex((item) => item.id === over?.id);
      const newLessonIdOrder = arrayMove(lessons, oldIndex, newIndex).map(
        (lesson) => ({ id: lesson.id }),
      );
      debouncedUpdate(newLessonIdOrder);
    }
  };

  const updateLessonOrder = async (lessonIds: { id: number }[]) => {
    const result = await updateDroplet(
      droplet.id,
      {
        lessons: lessonIds,
      },
      { revalidate: true },
    );

    if (!result.ok) {
      console.error("Error updating lesson order:", result.error);
    }
  };

  const debouncedUpdate = useCallback(debounce(updateLessonOrder, 3000), []);

  if (!user) return <UnauthorizedRoute />;

  return (
    <>
      <div
        className={cn(
          "bg-slate-900/50 dark:bg-slate-900/80 fixed inset-0 transition-opacity",
          expanded ? "opacity-1 z-30" : "opacity-0 -z-10",
        )}
        onClick={() => setExpanded(false)}
      ></div>

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
          <div className="px-3">
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

            <p className="p-2 my-2 text-lg font-extrabold leading-7">
              {droplet.name}
            </p>

            <ul className="space-y-2 font-medium">
              <li>
                <Link
                  href={`/draft/d/${droplet.slug}`}
                  className={cn(
                    classes.link,
                    pathname == `/draft/d/${droplet.slug}` &&
                      classes.activeLink,
                  )}
                >
                  <SettingsIcon className="shrink-0" />
                  <span className="leading-snug ms-3">Metadata</span>
                </Link>
              </li>
            </ul>

            <Separator orientation="horizontal" className="my-2" />

            <AddLesson droplet={droplet} execute={scrollToBottom} />

            <ul className="space-y-1">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/draft/d/${droplet.slug}/${lesson.slug}`}
                    className={cn(
                      classes.link,
                      pathname == `/draft/d/${droplet.slug}/${lesson.slug}` &&
                        classes.activeLink,
                    )}
                    onClick={(e) => e.stopPropagation()}
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
                </li>
              ))}
            </ul>
          </div>

          <div
            ref={bottom}
            className="bottom-0 left-0 w-full p-2 mt-4 space-y-4 border-t bg-slate-50 border-t-slate-200 md:sticky md:px-3 md:mb-0 md:flex-col dark:bg-slate-800"
          >
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

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    signOut();
                  }}
                >
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
}
