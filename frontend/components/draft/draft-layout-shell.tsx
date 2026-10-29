"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { DraftTour, TOUR_KEY } from "./draft-tour";
import { Droplet, User } from "@/types";
import { isReviewerFor } from "@/lib/review-roles";
import { ReviewCommentsProvider } from "./review/review-comments-context";

interface DraftLayoutShellProps {
  user: User;
  /** The caller is an author of this droplet (any role). */
  isAuthor: boolean;
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
    | "presentationEnabled"
  >;
  availableDroplets: Pick<Droplet, "id" | "name" | "slug" | "lessons">[];
  children: React.ReactNode;
}

export function DraftLayoutShell({
  user,
  isAuthor,
  droplet,
  availableDroplets,
  children,
}: DraftLayoutShellProps) {
  const [expanded, setExpanded] = useState(true);
  const [tourRun, setTourRun] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const t = setTimeout(() => setTourRun(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const restartTour = () => {
    localStorage.removeItem(TOUR_KEY);
    setTourRun(true);
  };

  // A reviewer's comments, shared by the sidebar and the page (ODY-806)
  const reviewing =
    droplet.status !== "published" &&
    !!droplet.inReview &&
    isReviewerFor(user.roles, true, isAuthor);

  return (
    <ReviewCommentsProvider dropletId={droplet.id} enabled={reviewing}>
      <div className="flex min-h-screen flex-col md:border-2 md:border-dashed md:border-slate-200 xl:flex-row md:dark:border-slate-700">
        <DraftTour run={tourRun} setRun={setTourRun} />
        <Sidebar
          droplet={droplet}
          user={user}
          isAuthor={isAuthor}
          availableDroplets={availableDroplets}
          expanded={expanded}
          setExpanded={setExpanded}
          onRestartTour={restartTour}
        />
        <main
          className={cn(
            "mx-auto w-full flex-1 items-center justify-center rounded-lg transition-all duration-300",
            expanded ? "xl:pl-64" : "xl:pl-0",
          )}
        >
          {children}
        </main>
      </div>
    </ReviewCommentsProvider>
  );
}
