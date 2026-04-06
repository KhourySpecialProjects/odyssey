"use client";

import UnauthorizedRoute from "@/app/(general)/unauthorized/page";
import { cn, getPath, isAuthorizedUserAdmin } from "@/lib/utils";
import { Droplet, User } from "@/types";
import {
  IconLock,
  IconArrowLeft,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarLeftCollapse,
  IconPencil,
  IconPresentation,
  IconSearch,
  IconListCheck,
} from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { duplicateDroplet } from "@/lib/requests/droplet";
import { toast } from "sonner";

export default function Sidebar({
  user,
  author = false,
  droplet,
  completedLessonIds = [],
  enrollmentId,
  expanded,
  setExpanded,
}: {
  user?: User | null;
  author: boolean;
  droplet: Pick<Droplet, "name" | "slug" | "lessons" | "status" | "id">;
  completedLessonIds: number[];
  enrollmentId?: string | undefined;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(69);
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user && isAuthorizedUserAdmin(user.roles);

  const isEnrolled = !!enrollmentId || author || isAdmin;
  const canPresent = isEnrolled && (droplet.lessons?.length ?? 0) > 0;

  const activeLinkClasses =
    "relative flex h-[44px] w-full items-center rounded-[78px] bg-[#2D7597] text-white transition-colors";
  const inactiveLinkClasses =
    "relative flex h-[44px] w-full items-center rounded-[78px] text-slate-900 transition-colors hover:bg-slate-200 dark:text-white dark:hover:bg-slate-700";

  const totalLessons = droplet.lessons?.length ?? 0;

  const totalLessonsCompleted = completedLessonIds.filter((id) =>
    droplet.lessons?.some((lesson) => lesson.id === id),
  ).length;

  const dropletProgress = Math.round(
    (totalLessonsCompleted / totalLessons) * 100,
  );

  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector<HTMLElement>(".sticky.top-0.z-50");
      if (header) setHeaderHeight(header.getBoundingClientRect().height);
    };

    const handleResize = () => {
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

  if (!user) return <UnauthorizedRoute />;

  const curPath = pathname.split("/d/")[1];
  const targetSegment =
    curPath === `${droplet.slug}/recap` ? droplet.slug : curPath;
  const editPath = `/draft/d/${targetSegment}`;

  const handleEditClick = () => {
    // Show warning if droplet is published (for both authors and admins)
    if (droplet.status === "published") {
      setShowEditDialog(true);
    } else {
      // Navigate directly without warning for draft droplets
      router.push(editPath);
    }
  };

  const handleEditConfirm = async () => {
    setIsCreatingDraft(true);

    try {
      // Call the server action directly
      const result = await duplicateDroplet(droplet.id);

      if (!result.ok) {
        throw new Error(result.error || "Failed to create draft droplet");
      }

      // Show different message based on whether it's existing or new
      if (result.isExisting) {
        toast.success("Navigating to your existing draft");
      } else {
        toast.success("Draft created successfully");
      }

      // Navigate to the draft droplet's edit page
      router.push(
        `/draft/d/${result.data.attributes?.slug || result.data.slug}`,
      );
    } catch (error) {
      console.error("Error creating draft:", error);
      alert("Failed to create draft. Please try again.");
    } finally {
      setIsCreatingDraft(false);
      setShowEditDialog(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/50 transition-opacity xl:hidden dark:bg-slate-900/80",
          expanded ? "z-30 opacity-100" : "-z-10 opacity-0",
        )}
        onClick={() => setExpanded(false)}
      ></div>

      {/* Mobile header - visible on small screens, hidden when sidebar is open */}
      <div
        className={cn(
          "fixed top-[107px] right-0 left-0 z-40 w-full items-center gap-2 border-b border-b-slate-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm xl:hidden dark:border-b-slate-700 dark:bg-slate-800/80",
          expanded ? "hidden" : "inline-flex",
        )}
      >
        <button
          aria-controls="sidebar"
          type="button"
          className="inline-flex items-center rounded-lg p-2 text-sm text-slate-500 hover:bg-slate-100 focus:ring-2 focus:ring-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
          onClick={() => setExpanded(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <IconLayoutSidebarLeftExpand
            className="dark:text-white"
            data-testid="sidebar-overlay"
          />
        </button>
        <Link
          href={getPath("droplet", droplet.slug)}
          className="text-base font-bold"
        >
          {droplet.name}
        </Link>
      </div>

      {/* Desktop floating button - no bar background */}
      {!expanded && (
        <button
          aria-controls="sidebar"
          type="button"
          className="fixed top-[120px] left-3 z-40 hidden items-center rounded-lg bg-white p-2 text-slate-800 shadow-md transition-all hover:bg-slate-100 focus:ring-2 focus:ring-slate-200 focus:outline-none xl:inline-flex dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-slate-600"
          onClick={() => setExpanded(true)}
        >
          <IconLayoutSidebarLeftExpand className="h-5 w-5 dark:text-white" />
          <span className="sr-only">Open sidebar</span>
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
              <Link
                href="/explore"
                className="flex flex-1 items-center p-2 text-[#344054] transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <IconArrowLeft className="h-5 w-5 flex-shrink-0" />
              </Link>
              <div className="flex items-center">
                {(author || isAdmin) && (
                  <button
                    onClick={handleEditClick}
                    className="p-2 text-[#344054] transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    title="Edit droplet"
                  >
                    <IconPencil className="h-5 w-5" />
                  </button>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {canPresent ? (
                        <Link
                          href={`/d/${droplet.slug}/present`}
                          target="_blank"
                          className="p-2 text-[#344054] transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
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
                    <TooltipContent side="bottom">Present</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-2 text-[#344054] hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  <IconLayoutSidebarLeftCollapse className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="-mt-2 flex flex-col space-y-1.5">
              <p className="mt-6 px-4 pb-3 text-xl leading-7 font-extrabold">
                {droplet.name}
              </p>

              <ul className="flex flex-col items-center space-y-1.5 font-medium">
                <li className="w-full">
                  <Link
                    href={`/d/${droplet.slug}`}
                    className={
                      pathname == `/d/${droplet.slug}`
                        ? activeLinkClasses
                        : inactiveLinkClasses
                    }
                  >
                    <IconSearch
                      className={cn(
                        "ml-4 h-4 w-4 shrink-0",
                        pathname === `/d/${droplet.slug}` ? "text-white" : "",
                      )}
                      stroke={1.8}
                    />
                    <span className="ml-2 text-base leading-none">
                      Overview
                    </span>
                  </Link>
                </li>

                {(droplet.lessons || [])
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((lesson, index) => {
                    const previousLesson =
                      index > 0 ? (droplet.lessons || [])[index - 1] : null;

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
                          }}
                          aria-disabled={!!isLocked}
                        >
                          <span
                            className={cn(
                              "ml-7 h-4 w-px shrink-0 self-center rounded-full",
                              pathname === `/d/${droplet.slug}/${lesson.slug}`
                                ? "bg-white"
                                : "bg-slate-300 dark:bg-slate-600",
                            )}
                          />
                          <span className="pl-3 text-base leading-snug">
                            {lesson.name}
                          </span>
                          {isLocked && (
                            <IconLock
                              className="ml-auto h-4 w-4 shrink-0 text-slate-400"
                              data-testid="lock-icon"
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
                  >
                    <IconListCheck
                      className={cn(
                        "ml-4 h-4 w-4 shrink-0",
                        pathname === `/d/${droplet.slug}/recap`
                          ? "text-white"
                          : "",
                      )}
                      stroke={1.8}
                    />
                    <span className="ml-2 text-base leading-none">Recap</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="bottom-0 left-0 mt-4 w-full space-y-4 border-t border-t-slate-200 bg-slate-50 p-2 xl:sticky xl:mb-0 xl:flex-col xl:px-3 dark:bg-slate-800">
            <div className="px-2">
              <Label>{dropletProgress}% complete</Label>
              <Progress value={dropletProgress} className="mt-1.5" />
            </div>
          </div>
        </div>
      </aside>

      {/* Edit Warning Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Droplet Content</AlertDialogTitle>
            <AlertDialogDescription>
              {droplet.status === "published" ? (
                <>
                  We'll check if you already have a draft for this droplet. If
                  not, a new draft titled "[EDIT] {droplet.name}" will be
                  created. You'll be able to make changes without affecting the
                  live content.
                </>
              ) : (
                <>
                  You are about to edit this draft. Changes will be saved
                  automatically.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingDraft}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditConfirm}
              disabled={isCreatingDraft}
            >
              {isCreatingDraft ? "Creating Draft..." : "Create Draft & Edit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
