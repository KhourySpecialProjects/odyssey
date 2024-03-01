"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import { cn } from "@/lib/utils";
import { DebugBanner } from "@/ui/debug-banner";
import { Avatar, DropdownMenu, ProgressBar } from "@lemonsqueezy/wedges";
import {
  ArrowLeftCircleIcon,
  ChevronDownIcon,
  HistoryIcon,
  LogOutIcon,
  MenuIcon,
  NotebookTextIcon,
  TargetIcon,
} from "lucide-react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";

export default function Sidebar({
  session,
  droplet,
}: {
  session: Session | null;
  droplet: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  const activeLinkClasses =
    "flex items-center p-2 bg-slate-200 [&>svg]:text-purple-700 rounded-lg dark:text-white dark:hover:bg-slate-700 group text-purple-700 transition-colors";
  const inactiveLinkClasses =
    "flex items-center p-2 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 group transition-colors";

  const totalLessons = droplet.lessons.length + 1;
  const lessonSlug = pathname.split("/").at(-1);
  const lessonSlugIndex = droplet.lessons
    .map((l: any) => l.slug)
    .indexOf(lessonSlug);
  const dropletProgress = Math.round(
    ((lessonSlugIndex + 1) / totalLessons) * 100
  );

  useLayoutEffect(() => {
    window.addEventListener("resize", () => setExpanded(false));
    return () => window.removeEventListener("resize", () => setExpanded(false));
  }, []);

  if (!session || !session?.user) return <UnauthorizedRoute />;

  return (
    <>
      <div
        className={cn(
          "bg-slate-900/50 dark:bg-slate-900/80 fixed inset-0 transition-opacity",
          expanded ? "opacity-1 z-30" : "opacity-0 -z-10"
        )}
        onClick={() => setExpanded(false)}
      ></div>

      <button
        aria-controls="sidebar"
        type="button"
        className="z-50 inline-flex items-center p-2 mt-2 text-sm rounded-lg ms-3 text-slate-500 sm:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
        onClick={() => setExpanded(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <MenuIcon />
      </button>

      <aside
        id="sidebar"
        className={cn(
          "fixed top-0 left-0 z-40 w-64 h-screen transition-transform",
          expanded
            ? "sm:translate-x-80 -transform-none"
            : "sm:translate-x-0 -translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-slate-50 dark:bg-slate-800">
          <DebugBanner className="mb-2" />

          <Link
            href="/"
            className="block p-2 text-2xl font-extrabold leading-7 text-slate-900 dark:text-slate-100"
          >
            Khoury
            <br />
            Odyssey
          </Link>

          <Link
            href="/"
            className="flex items-center p-2 mb-6 text-xs font-normal uppercase rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 group"
          >
            <ArrowLeftCircleIcon className="w-4 h-4" />
            <span className="ms-2">Back to Explore</span>
          </Link>

          <ul className="space-y-2 font-medium">
            <li>
              <Link
                href={`/d/${droplet.slug}`}
                className={
                  pathname == `/d/${droplet.slug}`
                    ? activeLinkClasses
                    : inactiveLinkClasses
                }
              >
                <TargetIcon />
                <span className="ms-3">Overview</span>
              </Link>
            </li>

            {droplet.lessons.map((lesson: any, i: number) => (
              <li key={i}>
                <Link
                  href={`/d/${droplet.slug}/${lesson.slug}`}
                  className={
                    pathname == `/d/${droplet.slug}/${lesson.slug}`
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  }
                >
                  {lesson.title.toLowerCase() === "recap" ? (
                    <HistoryIcon className="shrink-0" />
                  ) : (
                    <NotebookTextIcon className="shrink-0" />
                  )}
                  <span className="ms-3">{lesson.title}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="bottom-0 left-0 w-full p-2 mt-4 space-y-4 md:px-3 md:mg-0 md:flex-col md:absolute dark:bg-slate-800">
            <div className="px-2">
              <ProgressBar
                label={`${dropletProgress}% complete`}
                value={dropletProgress}
              />
            </div>

            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <div className="w-full group flex shrink cursor-pointer select-none items-center justify-between gap-1 rounded-lg p-1.5 px-2 text-sm text-slate-600 transition-colors duration-100 wg-antialiased hover:bg-slate-100 dark:hover:bg-white/5">
                  <div className="inline-flex flex-row items-center justify-between">
                    {session.user.image ? (
                      <Avatar
                        size="xs"
                        src={session.user.image}
                        initials={session.user.name?.charAt(0) || "?"}
                      />
                    ) : null}

                    <span className="font-medium ms-2">
                      Hi, <b>{session.user.name ?? session.user.email}</b>!
                    </span>
                  </div>

                  <ChevronDownIcon className="w-5 h-5 trigger-icon text-slate-400" />
                </div>
              </DropdownMenu.Trigger>

              <DropdownMenu.Content
                align="start"
                className="mb-3 min-w-[220px]"
              >
                <DropdownMenu.Label>
                  NUID: {session.employeeId || "unknown"}
                  <br />
                  Title: {session.jobTitle || "unknown"}
                </DropdownMenu.Label>

                <DropdownMenu.Separator />

                <DropdownMenu.Item
                  onClick={(e) => {
                    e.preventDefault();
                    signOut();
                  }}
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>Log Out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
}
