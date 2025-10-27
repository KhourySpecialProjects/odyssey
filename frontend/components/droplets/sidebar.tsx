"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import { cn, getPath, isAuthorizedUserAdmin } from "@/lib/utils";
import { Droplet, User } from "@/types";
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
  PanelRightOpen,
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
  completedLessonIds = [],
  enrollmentId,
}: {
  user?: User | null;
  author: boolean;
  droplet: Pick<Droplet, "name" | "slug" | "droplet_lessons">;
  completedLessonIds: number[];
  enrollmentId?: string | undefined;
}) {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();
  const isAdmin = user && isAuthorizedUserAdmin(user.roles);

  const isEnrolled = !!enrollmentId || author || isAdmin;

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
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setExpanded(true);
      } else {
        setExpanded(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!user) return <UnauthorizedRoute />;

  const curPath = pathname.split("d/")[1];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/50 transition-opacity xl:hidden dark:bg-slate-900/80",
          expanded ? "z-30 opacity-1" : "-z-10 opacity-0",
        )}
        onClick={() => setExpanded(false)}
      ></div>

      {/* Mobile header - always visible on small screens */}
      <div className="fixed top-[107px] right-0 left-0 z-40 inline-flex w-full items-center gap-2 border-b border-b-slate-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm xl:hidden dark:border-b-slate-700 dark:bg-slate-800/80">
        {" "}
        <button
          aria-controls="sidebar"
          type="button"
          className="inline-flex items-center rounded-lg p-2 text-sm text-slate-500 hover:bg-slate-100 focus:ring-2 focus:ring-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="sr-only">
            {expanded ? "Close sidebar" : "Open sidebar"}
          </span>
          <PanelRightClose
            className="dark:text-white"
            data-testid="sidebar-overlay"
          />
        </button>
        <Link
          href={getPath("droplet", droplet.slug)}
          className="text-lg font-bold"
        >
          {droplet.name}
        </Link>
      </div>

      {/* Desktop header - only when sidebar closed */}
      {!expanded && (
        <div className="fixed top-[107px] right-0 left-0 z-40 hidden w-full items-center gap-2 border-b border-b-slate-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm xl:flex dark:border-b-slate-700 dark:bg-slate-800/80">
          {" "}
          <button
            aria-controls="sidebar"
            type="button"
            className="inline-flex items-center rounded-lg p-2 text-sm text-slate-500 hover:bg-slate-100 focus:ring-2 focus:ring-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
            onClick={() => setExpanded(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <PanelRightClose className="dark:text-white" />
          </button>
          <Link
            href={getPath("droplet", droplet.slug)}
            className="text-lg font-bold"
          >
            {droplet.name}
          </Link>
        </div>
      )}

      <aside
        id="sidebar"
        className={cn(
          "fixed left-0 z-40 h-screen w-64 transition-transform",
          expanded ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col overflow-y-auto bg-slate-50 py-4 xl:justify-between xl:pb-0 dark:bg-slate-800">
          <div className="px-3">
            <div className="flex flex-row justify-between pr-2">
              <Link
                type="button"
                href="/explore"
                className={cn(
                  "flex items-center justify-start gap-2 text-base",
                )}
              >
                <div className="flex w-6 justify-center">
                  <ArrowLeftIcon className="h-5 w-5 shrink-0" />
                </div>
                <Home />
              </Link>

              <div className="w-full"></div>
              {/* Close button - always visible inside sidebar */}
              <button onClick={() => setExpanded(false)}>
                <PanelRightOpen />
              </button>
            </div>

            <p className="my-2 p-2 text-lg leading-7 font-extrabold">
              {droplet.name}
            </p>

            {(author || isAdmin) && (
              <div className="w-full pb-4 text-center">
                <Link
                  className="w-full rounded-full bg-green-600 px-6 py-2 text-white hover:bg-green-700"
                  href={`/draft/d/${curPath === `${droplet.slug}/recap` ? `${droplet.slug}` : `/${curPath}`}`}
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
                  <span className="ms-3 leading-snug">Overview</span>
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

                  const isPreviousLessonIncomplete =
                    previousLesson &&
                    !completedLessonIds.includes(previousLesson.id) &&
                    !author &&
                    !isAdmin;

                  const isLocked = !isEnrolled || isPreviousLessonIncomplete;

                  return (
                    <li key={lesson.id} className="w-full">
                      <Link
                        href={`/d/${droplet.slug}/${lesson.slug}`}
                        className={cn(
                          pathname == `/d/${droplet.slug}/${lesson.slug}`
                            ? activeLinkClasses
                            : inactiveLinkClasses,
                          isLocked &&
                            "pointer-events-none cursor-not-allowed opacity-50",
                        )}
                        onClick={(e) => {
                          if (isLocked) {
                            e.preventDefault();
                            return;
                          }
                          setExpanded(false);
                        }}
                        aria-disabled={!!isLocked}
                      >
                        {lesson.type === "activity" ? (
                          <HammerIcon className="shrink-0" />
                        ) : lesson.type === "caseStudy" ? (
                          <FilePieChartIcon className="mr-0.5 h-5 w-5 shrink-0" />
                        ) : (
                          <BookTextIcon className="shrink-0" />
                        )}
                        <span className="ms-3 leading-snug">{lesson.name}</span>
                        {isLocked && (
                          <LockIcon
                            className="ml-auto h-4 w-4 shrink-0 text-slate-400"
                            data-testid="lock-icon"
                          />
                        )}
                        {completedLessonIds.includes(lesson.id) &&
                          !isLocked && (
                            <CheckCircle2
                              className="ml-auto h-4 w-4 shrink-0 text-green-500"
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
                  <span className="ms-3 leading-snug">Recap</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="bottom-0 left-0 mt-4 w-full space-y-4 border-t border-t-slate-200 bg-slate-50 p-2 xl:sticky xl:mb-0 xl:flex-col xl:px-3 dark:bg-slate-800">
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
