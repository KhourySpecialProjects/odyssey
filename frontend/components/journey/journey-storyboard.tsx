"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import {
  CHAPTERS,
  ROUTE,
  STOPS,
  WORLD,
  type ChapterId,
} from "./journey-config";
import {
  applyActivity,
  applyCreate,
  applyExplore,
  applyGroup,
  applyLesson,
  applyVoyage,
  applyWorld,
  collectHooks,
  measure,
} from "./journey-renderer";
import { JourneyWorld } from "./journey-world";
import { ActivityPanel } from "./panels/activity-panel";
import { PANEL_SIZE } from "./panels/app-frame";
import { CreatePanel } from "./panels/create-panel";
import { ExplorePanel } from "./panels/explore-panel";
import { GroupPanel } from "./panels/group-panel";
import { LessonPanel } from "./panels/lesson-panel";
import { VoyagePanel } from "./panels/voyage-panel";
import { BoatMark, FinaleLinks } from "./journey-parts";
import { OdysseyWordmark } from "./odyssey-wordmark";

// The reduced-motion version of the journey: the same scenes as a static,
// normally scrolling storyboard, each replica frozen at its key moment.

const chapter = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;

type Scene = {
  chapters: ChapterId[];
  Panel: (props: { compact: boolean }) => React.ReactElement;
};

const SCENES: Scene[] = [
  { chapters: ["explore", "discover"], Panel: ExplorePanel },
  { chapters: ["learn", "checkin"], Panel: LessonPanel },
  { chapters: ["voyage"], Panel: VoyagePanel },
  { chapters: ["create"], Panel: CreatePanel },
  { chapters: ["groups"], Panel: GroupPanel },
  { chapters: ["activity"], Panel: ActivityPanel },
];

/** Shows a replica at a fixed design size, scaled to its column. */
function ScaledPanel({
  compact,
  children,
}: {
  compact: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const size = PANEL_SIZE[compact ? "compact" : "wide"];
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(el.clientWidth / size.w, 1));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [size.w]);

  return (
    <div ref={ref} className="w-full" style={{ height: size.h * scale }}>
      <div
        className="relative origin-top-left [&>[data-j]]:!visible [&>[data-j]]:!opacity-100"
        style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function Caption({ id }: { id: ChapterId }) {
  const c = chapter(id);
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.22em] text-[#297496] uppercase dark:text-[#5FB4E5]">
        {c.eyebrow}
      </p>
      <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-3xl dark:text-white">
        {c.title}
      </h3>
      <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
        {c.body}
      </p>
    </div>
  );
}

export function JourneyStoryboard() {
  const ref = useRef<HTMLElement>(null);
  const compact = useMediaQuery("(max-width: 699px)");

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const h = collectHooks(root);
    const geo = measure(h, 0, 0, "wide", compact);
    applyExplore(h, 0.9, geo.slots);
    applyLesson(h, 1, 0.5, geo.quizOffset);
    applyVoyage(h, 1);
    applyCreate(h, 0.86);
    applyGroup(h, 0.8);
    applyActivity(h, 0.62);
    applyWorld(h, 1);
    // Draw the whole route at the overview's scale.
    h.get("trail")?.setAttribute("stroke-dashoffset", "0");
    for (const id of ["trail", "voy-line", "draft-outline"]) {
      h.get(id)?.style.setProperty("stroke-width", "6");
    }
    for (let i = 0; i < 4; i++)
      h.get(`buoy-${i}`)?.style.setProperty("opacity", "1");
  }, [compact]);

  const harbor = ROUTE.at(ROUTE.waypointDistances[STOPS.harbor]);
  const departure = chapter("departure");
  const finale = chapter("finale");

  return (
    <section
      ref={ref}
      id="odyssey-journey"
      aria-labelledby="odyssey-journey-heading"
      className="bg-gradient-to-b from-white via-[#eef7fb] to-[#e2f1f8] px-6 py-16 sm:py-24 dark:from-zinc-950 dark:via-[#081722] dark:to-[#0b2230]"
    >
      <h2 id="odyssey-journey-heading" className="sr-only">
        The Odyssey journey
      </h2>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#297496] uppercase dark:text-[#5FB4E5]">
            {departure.eyebrow}
          </p>
          <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {departure.title}
          </h3>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            {departure.body}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="relative mt-10 overflow-hidden rounded-2xl border border-[#297496]/15 bg-gradient-to-b from-[#f4fafd] to-[#d8edf6] dark:from-[#07131b] dark:to-[#0b2332]"
        >
          <svg
            data-j="world-svg"
            viewBox={`0 540 ${WORLD.w} 1560`}
            className="block h-auto w-full"
          >
            <JourneyWorld route={ROUTE} />
            <foreignObject
              x={harbor.x - 40}
              y={harbor.y - 70}
              width={80}
              height={80}
            >
              <BoatMark className="h-full w-full" />
            </foreignObject>
          </svg>
        </div>

        <div className="mt-20 space-y-20 sm:mt-28 sm:space-y-28">
          {SCENES.map(({ chapters, Panel }, i) => (
            <div
              key={chapters[0]}
              className={cn(
                "grid items-center gap-8 lg:gap-14",
                i % 2 === 1
                  ? "lg:grid-cols-[minmax(0,8fr)_minmax(0,5fr)] lg:[&>*:first-child]:order-2"
                  : "lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]",
              )}
            >
              <div className="space-y-8">
                {chapters.map((id) => (
                  <Caption key={id} id={id} />
                ))}
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none select-none"
              >
                <ScaledPanel compact={compact}>
                  <Panel compact={compact} />
                </ScaledPanel>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 flex flex-col items-center text-center sm:mt-32">
          <OdysseyWordmark width={230} />
          <h3 className="mt-5 max-w-2xl text-3xl font-black tracking-tight text-balance text-slate-900 sm:text-4xl dark:text-white">
            {finale.title}
          </h3>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300">
            {finale.body}
          </p>
          <div className="mt-7">
            <FinaleLinks />
          </div>
          <p className="mt-10 text-xs text-slate-500 dark:text-slate-400">
            Names and content shown are examples.
          </p>
        </div>
      </div>
    </section>
  );
}
