"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { DraftTour, TOUR_KEY } from "./draft-tour";
import { Droplet, User } from "@/types";
import { isReviewerFor } from "@/lib/review-roles";
import { ReviewCommentsProvider } from "./review/review-comments-context";
import { ReviewPanelDock } from "./review/review-panel-dock";
import { ReviewTranscript } from "./review/review-transcript";
import { useMediaQuery } from "@/hooks/use-media-query";
import { lessonDots, type PanelScore } from "@/lib/review-panel/model";
import type { ReviewPanelData } from "@/lib/requests/reviews";

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
  /** The reviewer's panel data; null when it didn't load (only read while reviewing) */
  reviewPanel?: ReviewPanelData | null;
  /** Names for the panel header's "Reviewed by … · Created by …" line */
  reviewMeta?: { reviewerName?: string | null; authorNames?: string[] };
  children: React.ReactNode;
}

export function DraftLayoutShell({
  user,
  isAuthor,
  droplet,
  availableDroplets,
  reviewPanel = null,
  reviewMeta,
  children,
}: DraftLayoutShellProps) {
  const [expanded, setExpandedState] = useState(true);
  const [panelMode, setPanelMode] = useState<"open" | "rail">("open");
  const [liveScores, setLiveScores] = useState<PanelScore[] | null>(null);
  const isWide = useMediaQuery("(min-width: 1440px)");
  const isXl = useMediaQuery("(min-width: 1280px)");
  const [ready, setReady] = useState(false);
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

  // The panel starts open; below 1440 the sidebar starts collapsed, below 1280 the panel is a rail
  useEffect(() => {
    setReady(true);
    if (!reviewing) return;
    if (!window.matchMedia("(min-width: 1440px)").matches) {
      setExpandedState(false);
    }
    if (!window.matchMedia("(min-width: 1280px)").matches) {
      setPanelMode("rail");
    }
  }, [reviewing]);

  // Below 1440 the sidebar and the panel don't share the screen (D6)
  const setExpanded = (open: boolean) => {
    setExpandedState(open);
    if (open && reviewing && !isWide) setPanelMode("rail");
  };
  const openPanel = () => {
    setPanelMode("open");
    if (!isWide) setExpandedState(false);
  };

  // An open drawer (below 1280) covers the page, so the page is inert behind it
  const drawerOpen = ready && reviewing && panelMode === "open" && !isXl;

  // Set on the DOM node: the React 19 runtime Next bundles treats `inert=""` as false
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.toggleAttribute("inert", drawerOpen);
  }, [drawerOpen]);

  // Crossing below 1280 turns an open panel into a drawer: show the rail instead, no focus move
  const wasXl = useRef(isXl);
  useEffect(() => {
    if (wasXl.current && !isXl) setPanelMode("rail");
    wasXl.current = isXl;
  }, [isXl]);

  const dots = useMemo(
    () =>
      reviewing
        ? lessonDots(
            liveScores ?? reviewPanel?.scores ?? [],
            reviewPanel?.criteria ?? [],
          )
        : {},
    [reviewing, liveScores, reviewPanel?.scores, reviewPanel?.criteria],
  );

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
          hideReviewActions={reviewing}
          lessonDots={dots}
        />
        <main
          data-review-panel={reviewing ? panelMode : undefined}
          ref={mainRef}
          className={cn(
            "mx-auto w-full flex-1 items-center justify-center rounded-lg transition-all duration-300 motion-reduce:transition-none",
            expanded ? "xl:pl-64" : "xl:pl-0",
            reviewing && [
              "group",
              panelMode === "open" ? "xl:pr-[384px]" : "xl:pr-12",
            ],
          )}
        >
          {children}
        </main>
        {reviewing && (
          <ReviewPanelDock
            mode={panelMode}
            onOpen={openPanel}
            onCollapse={() => setPanelMode("rail")}
          >
            <ReviewTranscript
              droplet={droplet}
              panel={reviewPanel}
              meta={reviewMeta}
              onScoresChange={setLiveScores}
            />
          </ReviewPanelDock>
        )}
      </div>
    </ReviewCommentsProvider>
  );
}
