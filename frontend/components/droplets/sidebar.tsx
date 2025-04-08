"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import { cn, getPath, isAuthorizedUserAdmin } from "@/lib/utils";
import { AuthorizedUser, Droplet, User } from "@/types";
import {
  BookTextIcon,
  FilePieChartIcon,
  HammerIcon,
  HistoryIcon,
  TargetIcon,
  CheckCircle2,
  LockIcon,
  ArrowLeftIcon,
  PanelRightClose,
  Home,
  ChevronsLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";

export default function Sidebar({
  user,
  author = false,
  droplet,
  authorizedUser,
  completedLessonIds = [],
}: {
  user?: User | null;
  author: boolean;
  droplet: Pick<
    Droplet,
    "name" | "slug" | "droplet_lessons" | "shouldBeLocked"
  >;
  authorizedUser: AuthorizedUser | null;
  completedLessonIds: number[];
}) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const isAdmin = user && isAuthorizedUserAdmin(user.roles);

  const activeLinkClasses =
    "w-full flex font-bold items-center p-2 bg-slate-200 dark:bg-slate-700 [&>svg]:text-sky-700 rounded-lg dark:text-white dark:hover:bg-slate-700 group text-sky-700 transition-colors";
  const inactiveLinkClasses =
    "w-full flex items-center p-2 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 group transition-colors";

  const totalLessons = droplet.droplet_lessons?.length ?? 0;

  const totalLessonsCompleted = completedLessonIds.filter((id) =>
    droplet.droplet_lessons?.some((lesson) => lesson.lesson.id === id),
  ).length;

  const dropletProgress = Math.round(
    (totalLessonsCompleted / totalLessons) * 100,
  );

  useLayoutEffect(() => {
    window.addEventListener("resize", () => setExpanded(false));
    return () => window.removeEventListener("resize", () => setExpanded(false));
  }, []);

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

      <div className="z-20 inline-flex items-center w-full gap-2 px-3 py-2 text-sm border-b xl:hidden border-b-slate-200">
        <button
          aria-controls="sidebar"
          type="button"
          className="z-20 inline-flex items-center p-2 text-sm rounded-lg text-slate-500 xl:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
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
          "fixed xl:sticky xl:top-0 left-0 z-40 w-64 h-screen transition-transform",
          expanded ? "translate-x-0" : "-translate-x-full xl:translate-x-0",
        )}
        aria-label="Sidebar"
      >
        <div className="flex flex-col h-full py-4 overflow-y-auto xl:justify-between xl:pb-0 bg-slate-50 dark:bg-slate-800">
          <div className="px-3">
            <div className="flex flex-row justify-between pr-2">
              <Link
                type="button"
                href="/explore"
                className={cn(
                  "flex items-center justify-start text-base  gap-2",
                )}
              >
                <div className="w-6 flex justify-center">
                  <ArrowLeftIcon className="shrink-0 w-5 h-5" />
                </div>
                <Home />
              </Link>

              <div className="w-full"></div>

              <button
                onClick={() => setExpanded(false)}
                className={`xl:hidden`}
              >
                <ChevronsLeft />
              </button>
            </div>

            <p className="p-2 my-2 text-lg font-extrabold leading-7">
              {droplet.name}
            </p>

            {(author || isAdmin) && (
              <div className="pb-4 w-full text-center">
                <Link
                  className="w-full px-6 py-2 rounded-full text-white bg-green-600 hover:bg-green-700"
                  href={`/draft/d/${pathname.split("d/")[1]}`}
                >
                  Edit
                </Link>
              </div>
            )}

            <ul className="flex flex-col items-center space-y-2 font-medium">
              <li className="w-full">
                <Link
                  href={`/d/${droplet.slug}`}
                  className={
                    pathname == `/d/${droplet.slug}`
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  }
                  onClick={() => setExpanded(false)}
                >
                  <TargetIcon className="shrink-0" />
                  <span className="leading-snug ms-3">Overview</span>
                </Link>
              </li>

              {droplet.droplet_lessons
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((dropletLesson, index) => {
                  const lesson = dropletLesson.lesson;
                  const previousLesson =
                    index > 0
                      ? droplet.droplet_lessons[index - 1].lesson
                      : null;
                  const isLocked =
                    previousLesson &&
                    !(droplet.shouldBeLocked === false) &&
                    !completedLessonIds.includes(previousLesson.id) &&
                    !author &&
                    !isAdmin;

                  return (
                    <li key={lesson.id} className="w-full">
                      <Link
                        href={`/d/${droplet.slug}/${lesson.slug}`}
                        className={cn(
                          pathname == `/d/${droplet.slug}/${lesson.slug}`
                            ? activeLinkClasses
                            : inactiveLinkClasses,
                          isLocked && "opacity-50",
                        )}
                        onClick={() => setExpanded(false)}
                      >
                        {lesson.type === "activity" ? (
                          <HammerIcon className="shrink-0" />
                        ) : lesson.type === "caseStudy" ? (
                          <FilePieChartIcon className="w-5 h-5 mr-0.5 shrink-0" />
                        ) : (
                          <BookTextIcon className="shrink-0" />
                        )}
                        <span className="leading-snug ms-3">{lesson.name}</span>
                        {isLocked && (
                          <LockIcon
                            className="ml-auto w-4 h-4 text-slate-400 shrink-0"
                            data-testid="lock-icon"
                          />
                        )}
                        {completedLessonIds.includes(lesson.id) && (
                          <CheckCircle2
                            className="ml-auto w-4 h-4 text-green-500 shrink-0"
                            data-testid="check-circle-icon"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}

              <li className="w-full">
                <Link
                  href={`/d/${droplet.slug}/recap`}
                  className={
                    pathname == `/d/${droplet.slug}/recap`
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  }
                  onClick={() => setExpanded(false)}
                >
                  <HistoryIcon className="shrink-0" />
                  <span className="leading-snug ms-3">Recap</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="bottom-0 left-0 w-full p-2 mt-4 space-y-4 border-t bg-slate-50 border-t-slate-200 xl:sticky xl:px-3 xl:mb-0 xl:flex-col dark:bg-slate-800">
            <div className="px-2">
              <Label>{dropletProgress}% complete</Label>
              <Progress value={dropletProgress} className="mt-1.5" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
