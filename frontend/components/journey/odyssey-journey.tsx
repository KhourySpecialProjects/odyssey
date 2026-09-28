"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAPTERS,
  MAP_LABELS,
  ROUTE,
  TOTAL_LENGTH,
  WORLD,
  type Layout,
} from "./journey-config";
import { clamp01 } from "./journey-math";
import {
  collectHooks,
  createRenderer,
  FLEET,
  measure,
  MIST,
} from "./journey-renderer";
import { BoatMark, FinaleLinks } from "./journey-parts";
import { OdysseyWordmark } from "./odyssey-wordmark";
import { JourneyStoryboard } from "./journey-storyboard";
import { JourneyWorld } from "./journey-world";
import { ActivityPanel } from "./panels/activity-panel";
import { CreatePanel } from "./panels/create-panel";
import { ExplorePanel } from "./panels/explore-panel";
import { GroupPanel } from "./panels/group-panel";
import { LessonPanel } from "./panels/lesson-panel";
import { VoyagePanel } from "./panels/voyage-panel";

/**
 * The homepage's scroll-driven product story: a boat sails across a map of
 * Odyssey, and each stop opens into the real interface it stands for.
 * Visitors who prefer reduced motion get a static storyboard instead.
 */
export function OdysseyJourney() {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  return reducedMotion ? <JourneyStoryboard /> : <JourneyStage />;
}

const SMOOTHING_SECONDS = 0.085;

function JourneyStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>("wide");
  const [compactPanels, setCompactPanels] = useState(false);
  const wide = layout === "wide";

  // Layout comes from the stage width so the markup and the measured
  // geometry always agree.
  useEffect(() => {
    const update = () => {
      const w = stageRef.current?.clientWidth ?? window.innerWidth;
      setLayout(w >= 1024 ? "wide" : "compact");
      setCompactPanels(w < 700);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const hooks = collectHooks(section);
    let render: (p: number) => void = () => {};
    let target = 0;
    let current = 0;
    let raf = 0;
    let last = 0;

    const headerOffset = () => {
      // The sticky bar above the page holds the header plus any banners.
      const bar = document.querySelector("header")?.parentElement;
      return bar ? Math.round(bar.getBoundingClientRect().height) : 0;
    };
    const readProgress = () => {
      const top = parseFloat(section.style.getPropertyValue("--jtop")) || 0;
      const range = section.offsetHeight - stage.offsetHeight;
      const rect = section.getBoundingClientRect();
      return range > 0 ? clamp01((top - rect.top) / range) : 0;
    };
    const setup = () => {
      section.style.setProperty("--jtop", `${headerOffset()}px`);
      render = createRenderer(
        hooks,
        measure(
          hooks,
          stage.clientWidth,
          stage.clientHeight,
          layout,
          compactPanels,
        ),
      );
      target = readProgress();
      current = target;
      render(current);
    };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      current += (target - current) * (1 - Math.exp(-dt / SMOOTHING_SECONDS));
      if (Math.abs(target - current) < 0.00004) current = target;
      render(current);
      raf = current === target ? 0 : requestAnimationFrame(tick);
    };
    const onScroll = () => {
      target = readProgress();
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    setup();
    window.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(setup);
    observer.observe(stage);
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [layout, compactPanels]);

  // Keyboard users tabbing to the closing links jump to the final scene.
  const revealFinale = useCallback(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const range = section.offsetHeight - stage.offsetHeight;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const jtop = parseFloat(section.style.getPropertyValue("--jtop")) || 0;
    window.scrollTo({ top: top - jtop + range });
  }, []);

  const boatSize = wide ? 46 : 34;
  const panelProps = { compact: compactPanels };

  return (
    <>
      <section
        ref={sectionRef}
        id="odyssey-journey"
        aria-labelledby="odyssey-journey-heading"
        className="relative"
        style={
          {
            "--jtop": "0px",
            height: `calc(${TOTAL_LENGTH + 1} * (100svh - var(--jtop)))`,
          } as React.CSSProperties
        }
      >
        <h2 id="odyssey-journey-heading" className="sr-only">
          The Odyssey journey
        </h2>
        <a
          href="#after-odyssey-journey"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-md focus:ring-2 focus:ring-[#2D7597]/50 focus:outline-none"
        >
          Skip the journey
        </a>

        <div
          ref={stageRef}
          className="sticky overflow-hidden"
          style={{ top: "var(--jtop)", height: "calc(100svh - var(--jtop))" }}
        >
          {/* Ocean */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-[#f4fafd] via-[#e7f3f9] to-[#d8edf6] dark:from-[#07131b] dark:via-[#091b27] dark:to-[#0b2332]"
          />
          <div
            aria-hidden="true"
            data-j="far"
            className="absolute -inset-[25%] will-change-transform"
          >
            <div className="absolute top-[18%] left-[12%] h-[55%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(152,209,181,0.32),rgba(152,209,181,0))] dark:bg-[radial-gradient(closest-side,rgba(41,116,150,0.22),rgba(41,116,150,0))]" />
            <div className="absolute right-[10%] bottom-[14%] h-[60%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(160,224,239,0.4),rgba(160,224,239,0))] dark:bg-[radial-gradient(closest-side,rgba(95,180,229,0.12),rgba(95,180,229,0))]" />
          </div>

          {/* World */}
          <svg
            data-j="world-svg"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
            preserveAspectRatio="xMidYMid slice"
          >
            <JourneyWorld route={ROUTE} />
          </svg>

          {/* Labels and boats (HTML, so they stay crisp at any zoom) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            {MAP_LABELS.map((label) => (
              <span
                key={label.id}
                data-j={`label-${label.id}`}
                className={cn(
                  "absolute top-0 left-0 whitespace-nowrap opacity-0",
                  label.tone === "island"
                    ? "rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow-[0_2px_8px_rgba(12,51,84,0.15)] dark:bg-slate-800 dark:text-slate-200"
                    : "text-[11px] font-semibold tracking-[0.24em] text-[#0C3354]/80 uppercase dark:text-[#cfe9f6]/90",
                )}
              >
                {label.text}
              </span>
            ))}
            {FLEET.map((_, i) => (
              <div
                key={i}
                data-j={`fleet-${i}`}
                className="absolute top-0 left-0 opacity-0 will-change-transform"
                style={{ width: boatSize, height: boatSize }}
              >
                <div
                  className="animate-bob h-full w-full"
                  style={{ animationDelay: `${-i * 0.7}s` }}
                >
                  <BoatMark className="h-full w-full opacity-75" />
                </div>
              </div>
            ))}
            <div
              data-j="boat"
              className="absolute top-0 left-0 will-change-transform"
              style={{ width: boatSize, height: boatSize }}
            >
              <div className="animate-bob h-full w-full">
                <BoatMark className="h-full w-full drop-shadow-[0_3px_4px_rgba(12,51,84,0.25)]" />
              </div>
            </div>
          </div>

          {wide && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {MIST.map((_, i) => (
                <div
                  key={i}
                  data-j={`mist-${i}`}
                  className="absolute top-0 left-0 h-[220px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.75),rgba(255,255,255,0))] will-change-transform dark:bg-[radial-gradient(closest-side,rgba(148,197,222,0.08),rgba(148,197,222,0))]"
                />
              ))}
            </div>
          )}

          <div
            aria-hidden="true"
            data-j="scrim"
            className={cn(
              "absolute inset-0 bg-[#f4fafd]/80 opacity-0 dark:bg-[#07131b]/80",
              wide && "backdrop-blur-[2px]",
            )}
          />

          {/* Odyssey UI, revealed from the map */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 select-none"
          >
            <ExplorePanel {...panelProps} />
            <LessonPanel {...panelProps} />
            <VoyagePanel {...panelProps} />
            <CreatePanel {...panelProps} />
            <GroupPanel {...panelProps} />
            <ActivityPanel {...panelProps} />
          </div>

          {wide && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-[48%] bg-[radial-gradient(ellipse_75%_50%_at_20%_22%,rgba(244,250,253,0.94),rgba(244,250,253,0))] dark:bg-[radial-gradient(ellipse_75%_50%_at_20%_22%,rgba(7,19,27,0.92),rgba(7,19,27,0))]"
            />
          )}

          {/* Chapter captions */}
          <div
            className={cn(
              "pointer-events-none absolute",
              wide
                ? "top-[9%] left-[5%] w-[29%] max-w-[400px]"
                : "top-4 right-5 left-5",
            )}
          >
            {CHAPTERS.filter((c) => c.id !== "finale").map((chapter) => (
              <div
                key={chapter.id}
                data-j={`caption-${chapter.id}`}
                className="absolute inset-x-0 top-0"
                style={{ opacity: chapter.id === "departure" ? 1 : 0 }}
              >
                <p
                  className={cn(
                    "font-semibold tracking-[0.22em] text-[#297496] uppercase dark:text-[#5FB4E5]",
                    wide ? "text-xs" : "text-[10px]",
                  )}
                >
                  {chapter.eyebrow}
                </p>
                <h3
                  className={cn(
                    "font-extrabold tracking-tight text-balance text-slate-900 dark:text-white",
                    wide ? "mt-3 text-3xl xl:text-4xl" : "mt-1.5 text-xl",
                  )}
                >
                  {chapter.title}
                </h3>
                <p
                  className={cn(
                    "text-slate-600 dark:text-slate-300",
                    wide
                      ? "mt-4 text-base leading-7"
                      : "mt-1.5 text-[13px] leading-5",
                  )}
                >
                  {chapter.body}
                </p>
              </div>
            ))}
          </div>

          <Finale onFocus={revealFinale} compact={!wide} />

          {wide && (
            <p
              aria-hidden="true"
              data-j="example-note"
              className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-slate-500 opacity-0 dark:text-slate-400"
            >
              Names and content shown are examples.
            </p>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[2px] bg-[#297496]/10"
          >
            <div
              data-j="progress-line"
              className="h-full origin-left scale-x-0 bg-[#297496] dark:bg-[#5FB4E5]"
            />
          </div>
        </div>
      </section>
      <div id="after-odyssey-journey" />
    </>
  );
}

const FINALE = CHAPTERS[CHAPTERS.length - 1];

function Finale({
  onFocus,
  compact,
}: {
  onFocus: () => void;
  compact: boolean;
}) {
  return (
    <div
      data-j="finale"
      className={cn(
        "pointer-events-none absolute inset-x-0 mx-auto flex max-w-2xl flex-col items-center px-6 text-center opacity-0",
        compact ? "top-[6%]" : "top-[8%] [@media(max-height:760px)]:top-[5%]",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute -inset-x-24 -inset-y-16 -z-10 bg-[radial-gradient(closest-side,rgba(244,250,253,0.95),rgba(244,250,253,0))] dark:bg-[radial-gradient(closest-side,rgba(7,19,27,0.9),rgba(7,19,27,0))]"
      />
      <OdysseyWordmark width={compact ? 170 : 230} />
      <h3
        className={cn(
          "mt-5 font-black tracking-tight text-balance text-slate-900 dark:text-white",
          compact
            ? "text-2xl"
            : "text-4xl xl:text-5xl [@media(max-height:760px)]:text-3xl",
        )}
      >
        {FINALE.title}
      </h3>
      <p
        className={cn(
          "mt-4 max-w-lg text-slate-600 dark:text-slate-300",
          compact ? "text-sm leading-6" : "text-base leading-7",
        )}
      >
        {FINALE.body}
      </p>
      <div className="mt-7">
        <FinaleLinks onFocus={onFocus} />
      </div>
      {compact && (
        <p className="mt-5 text-[11px] text-slate-500 dark:text-slate-400">
          Names and content shown are examples.
        </p>
      )}
    </div>
  );
}
