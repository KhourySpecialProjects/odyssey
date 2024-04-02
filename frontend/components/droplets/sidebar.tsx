"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import { cn } from "@/lib/utils";
import { Droplet, User } from "@/types";
import {
  BookTextIcon,
  ChevronDownIcon,
  CogIcon,
  HammerIcon,
  HistoryIcon,
  LogOutIcon,
  MenuIcon,
  ShipIcon,
  TargetIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";

export default function Sidebar({
  user,
  droplet,
}: {
  user?: User | null;
  droplet: Pick<Droplet, "name" | "slug" | "lessons">;
}) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  const activeLinkClasses =
    "flex font-bold items-center p-2 bg-slate-200 [&>svg]:text-sky-700 rounded-lg dark:text-white dark:hover:bg-slate-700 group text-sky-700 transition-colors";
  const inactiveLinkClasses =
    "flex items-center p-2 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 group transition-colors";

  const totalLessons = droplet.lessons?.length ?? 0;
  const totalPages = totalLessons + 2;
  const pageSlug = pathname.split("/").at(-1);

  let pageSlugIndex = 0;
  if (pageSlug === "recap") {
    pageSlugIndex = totalLessons;
  } else {
    pageSlugIndex =
      droplet.lessons?.map((l: any) => l.slug).indexOf(pageSlug) ?? 0;
  }

  const dropletProgress = Math.round(
    ((pageSlugIndex + 2) / totalPages) * 100 // offset for intro and 0-index
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
                  href={`/d/${droplet.slug}`}
                  className={
                    pathname == `/d/${droplet.slug}`
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  }
                >
                  <TargetIcon className="shrink-0" />
                  <span className="leading-snug ms-3">Overview</span>
                </Link>
              </li>

              {droplet.lessons?.map((lesson, i: number) => (
                <li key={i}>
                  <Link
                    href={`/d/${droplet.slug}/${lesson.slug}`}
                    className={
                      pathname == `/d/${droplet.slug}/${lesson.slug}`
                        ? activeLinkClasses
                        : inactiveLinkClasses
                    }
                  >
                    {lesson.name.toLowerCase().startsWith("activity") ? (
                      <HammerIcon className="shrink-0" />
                    ) : (
                      <BookTextIcon className="shrink-0" />
                    )}
                    <span className="leading-snug ms-3">{lesson.name}</span>
                  </Link>
                </li>
              ))}

              <li>
                <Link
                  href={`/d/${droplet.slug}/recap`}
                  className={
                    pathname == `/d/${droplet.slug}/recap`
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  }
                >
                  <HistoryIcon className="shrink-0" />
                  <span className="leading-snug ms-3">Recap</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="bottom-0 left-0 w-full p-2 mt-4 space-y-4 border-t bg-slate-50 border-t-slate-200 md:sticky md:px-3 md:mb-0 md:flex-col dark:bg-slate-800">
            <div className="px-2">
              <Label>{dropletProgress}% complete</Label>
              <Progress value={dropletProgress} className="mt-1.5" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="w-full group flex shrink cursor-pointer select-none items-center justify-between gap-1 rounded-lg p-1.5 px-2 text-sm text-slate-600 transition-colors duration-100 wg-antialiased hover:bg-slate-100 dark:hover:bg-white/5">
                  <div className="inline-flex flex-row items-center justify-between">
                    {user.image ? (
                      <Avatar variant="round" size="xs">
                        <AvatarImage src={user.image} />
                        <AvatarFallback>
                          {user.name?.charAt(0) || "?"}
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
                  Title: {user.jobTitle || "unknown"}
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/explore">
                    <ShipIcon className="w-4 h-4 mr-2" />
                    <span>Explore Droplets</span>
                  </Link>
                </DropdownMenuItem>
                {user.isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <CogIcon className="w-4 h-4 mr-2" />
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
