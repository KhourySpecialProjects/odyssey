"use client";

/**
 * PresentationShell — Reveal.js-style fullscreen slide presenter.
 * Supports both light and dark mode via Tailwind dark: variants.
 */

import { useSlideNavigation } from "./use-slide-navigation";
import { PresentationBlockRenderer } from "./presentation-block-renderer";
import type { Slide } from "./utils";
import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GoalIcon,
  BookTextIcon,
} from "lucide-react";
import { Logo } from "@/components/header/logo";

interface PresentationShellProps {
  dropletName: string;
  dropletSlug: string;
  dropletDescription?: string;
  dropletTags?: string[];
  dropletOverview?: string;
  dropletObjectives?: string[];
  dropletAuthors?: { firstName: string; lastName: string }[];
  allSlides: Slide[][];
  lessonNames: string[];
}

export function PresentationShell({
  dropletName,
  dropletSlug,
  dropletDescription,
  dropletTags,
  dropletOverview,
  dropletObjectives,
  dropletAuthors,
  allSlides,
  lessonNames,
}: PresentationShellProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Build slide deck: intro + lessons + end (memoized) ──
  const { titleSlideArray, allLessonNames } = useMemo(() => {
    const introSlides: Slide[][] = [];
    const introNames: string[] = [];

    introSlides.push([
      {
        blocks: [],
        title: dropletName,
        lessonName: "",
        lessonIndex: -1,
        layout: "default",
      },
    ]);
    introNames.push("");

    if (dropletOverview) {
      introSlides.push([
        {
          blocks: [
            {
              __component: "droplets.generic" as const,
              id: -100,
              content: `<h2>Overview</h2>${dropletOverview}`,
            },
          ],
          title: "Overview",
          lessonName: "Overview",
          lessonIndex: -2,
          layout: "default",
        },
      ]);
      introNames.push("Overview");
    }

    if (dropletObjectives && dropletObjectives.length > 0) {
      introSlides.push([
        {
          blocks: [
            {
              __component: "droplets.generic" as const,
              id: -200,
              content: `<!--OBJECTIVES-->${JSON.stringify(dropletObjectives)}`,
            },
          ],
          title: "Learning Objectives",
          lessonName: "Learning Objectives",
          lessonIndex: -3,
          layout: "default",
        },
      ]);
      introNames.push("Learning Objectives");
    }

    // 4. What's Inside (lesson table of contents)
    if (lessonNames.length > 0) {
      introSlides.push([
        {
          blocks: [
            {
              __component: "droplets.generic" as const,
              id: -300,
              content: `<!--WHATS_INSIDE-->${JSON.stringify(lessonNames)}`,
            },
          ],
          title: "What's Inside",
          lessonName: "What's Inside",
          lessonIndex: -4,
          layout: "default",
        },
      ]);
      introNames.push("What's Inside");
    }

    // 5. About the Authors
    if (dropletAuthors && dropletAuthors.length > 0) {
      introSlides.push([
        {
          blocks: [
            {
              __component: "droplets.generic" as const,
              id: -400,
              content: `<!--AUTHORS-->${JSON.stringify(dropletAuthors)}`,
            },
          ],
          title: "About the Authors",
          lessonName: "About the Authors",
          lessonIndex: -5,
          layout: "default",
        },
      ]);
      introNames.push("About the Authors");
    }

    const endSlide: Slide[][] = [
      [
        {
          blocks: [],
          title: "End",
          lessonName: "",
          lessonIndex: -99,
          layout: "default",
        },
      ],
    ];

    return {
      titleSlideArray: [...introSlides, ...allSlides, ...endSlide] as Slide[][],
      allLessonNames: [...introNames, ...lessonNames, ""],
    };
  }, [
    dropletName,
    dropletDescription,
    dropletTags,
    dropletOverview,
    dropletObjectives,
    dropletAuthors,
    allSlides,
    lessonNames,
  ]);

  const nav = useSlideNavigation({
    allSlides: titleSlideArray,
    dropletSlug,
  });

  const exit = useCallback(
    () => router.push(`/d/${dropletSlug}`),
    [router, dropletSlug],
  );

  const currentSlideKey = `${nav.currentLessonIndex}-${nav.currentSlideIndex}`;

  // Before mount, show the title card as a static placeholder
  // to avoid hydration mismatch from nuqs URL state
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white text-slate-900 dark:bg-[#191919] dark:text-white">
        <h1 className="text-5xl font-bold tracking-tight">{dropletName}</h1>
      </div>
    );
  }

  // ── Empty state: no lessons have slide breaks ──
  if (allSlides.length === 0 && lessonNames.length > 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-white text-slate-900 dark:bg-[#191919] dark:text-white">
        <p className="text-3xl font-bold">No Slide Breaks Found</p>
        <p className="max-w-md text-center text-slate-500 dark:text-slate-400">
          Add slide breaks in the lesson editor using the{" "}
          <kbd className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs dark:border-slate-600">
            /slide-break
          </kbd>{" "}
          command to create presentation slides.
        </p>
        <button
          onClick={exit}
          className="rounded-md bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500"
        >
          Exit
        </button>
      </div>
    );
  }

  const currentSlide = nav.currentSlide;
  const isTitleCard = nav.currentLessonIndex === 0;
  const isEndSlide = currentSlide?.lessonIndex === -99;
  const progress =
    nav.totalGlobalSlides > 0
      ? (nav.globalSlideNumber / nav.totalGlobalSlides) * 100
      : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-white text-slate-900 select-none dark:bg-[#191919] dark:text-white">
      {/* ── Odyssey logo (top-right) ── */}
      <div className="fixed top-5 right-6 z-[102]">
        <Logo width={160} height={50} />
      </div>

      {/* ── Slide viewport ── */}
      <div className="flex h-full w-full items-center justify-center overflow-hidden px-16 py-12">
        <div
          key={currentSlideKey}
          className="flex w-full max-w-5xl flex-col items-center justify-center text-center"
        >
          {isEndSlide ? (
            /* ── End slide ── */
            <div className="flex flex-col items-center gap-6">
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
                Thank You
              </h1>
              <p className="text-xl text-slate-500 dark:text-slate-400">
                {dropletName}
              </p>
              <div className="mt-4 h-0.5 w-16 rounded-full bg-sky-400/40" />
              <button
                onClick={exit}
                className="mt-6 rounded-md bg-sky-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500"
              >
                Exit Presentation
              </button>
            </div>
          ) : isTitleCard ? (
            /* ── Title card ── */
            <div className="flex flex-col items-center gap-6">
              {dropletTags && dropletTags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {dropletTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                {dropletName}
              </h1>

              {dropletDescription && (
                <p className="max-w-2xl text-lg leading-relaxed text-slate-500 sm:text-xl dark:text-slate-400">
                  {dropletDescription}
                </p>
              )}

              <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
                Press{" "}
                <kbd className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  →
                </kbd>{" "}
                to start{" "}
                <span className="mx-1 text-slate-300 dark:text-slate-600">
                  ·
                </span>{" "}
                <kbd className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  Esc
                </kbd>{" "}
                to exit
              </p>
            </div>
          ) : currentSlide ? (
            (() => {
              const firstBlock = currentSlide.blocks[0];
              const isObjectives =
                firstBlock?.__component === "droplets.generic" &&
                firstBlock.content.startsWith("<!--OBJECTIVES-->");
              const isWhatsInside =
                firstBlock?.__component === "droplets.generic" &&
                firstBlock.content.startsWith("<!--WHATS_INSIDE-->");
              const isAuthors =
                firstBlock?.__component === "droplets.generic" &&
                firstBlock.content.startsWith("<!--AUTHORS-->");
              const isLessonTitle =
                firstBlock?.__component === "droplets.generic" &&
                firstBlock.content.includes('class="text-center"') &&
                /^<h1/.test(firstBlock.content);

              if (isObjectives) {
                let objs: string[] = [];
                try {
                  objs = JSON.parse(
                    firstBlock.content.replace("<!--OBJECTIVES-->", ""),
                  );
                } catch {
                  /* ignore */
                }
                return (
                  <div className="flex flex-col items-center gap-6">
                    <h2 className="text-3xl font-bold">Learning Objectives</h2>
                    <div className="flex w-full max-w-3xl flex-col gap-3">
                      {objs.map((obj, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-100 px-5 py-3 text-left dark:border-slate-700 dark:bg-slate-800/50"
                        >
                          <GoalIcon className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                          <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">
                            {obj}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (isWhatsInside) {
                let lessons: string[] = [];
                try {
                  lessons = JSON.parse(
                    firstBlock.content.replace("<!--WHATS_INSIDE-->", ""),
                  );
                } catch {
                  /* ignore */
                }
                return (
                  <div className="flex flex-col items-center gap-6">
                    <h2 className="text-3xl font-bold">What&rsquo;s Inside</h2>
                    <p className="text-slate-500 dark:text-slate-400">
                      This Droplet contains the following lessons:
                    </p>
                    <div className="flex w-full max-w-2xl flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-100/50 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800/50">
                      {lessons.map((name, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <BookTextIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className="text-base text-slate-700 dark:text-slate-200">
                            {name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (isAuthors) {
                let authors: { firstName: string; lastName: string }[] = [];
                try {
                  authors = JSON.parse(
                    firstBlock.content.replace("<!--AUTHORS-->", ""),
                  );
                } catch {
                  /* ignore */
                }
                return (
                  <div className="flex flex-col items-center gap-6">
                    <h2 className="text-3xl font-bold">About the Authors</h2>
                    <p className="text-slate-500 dark:text-slate-400">
                      This Droplet was written by:
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      {authors.map((author, i) => {
                        const initials = `${author.firstName?.[0] ?? ""}${author.lastName?.[0] ?? ""}`;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-100/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-300 text-sm font-semibold text-sky-600 dark:border-sky-500 dark:text-sky-400">
                              {initials}
                            </div>
                            <span className="text-base text-slate-700 dark:text-slate-200">
                              {author.firstName} {author.lastName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (isLessonTitle) {
                const titleText = firstBlock.content
                  .replace(/<[^>]+>/g, "")
                  .trim();
                return (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm font-medium tracking-widest text-sky-500/70 uppercase">
                      Lesson
                    </p>
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                      {titleText}
                    </h1>
                    <div className="mt-2 h-0.5 w-16 rounded-full bg-sky-400/40" />
                  </div>
                );
              }

              const layout = currentSlide.layout;
              const layoutImageUrl = currentSlide.layoutImageUrl;
              const allBlocks = currentSlide.blocks;

              if (
                (layout === "image-left" || layout === "image-right") &&
                layoutImageUrl
              ) {
                const imgSide = (
                  <div className="flex h-full w-1/2 shrink-0 items-center justify-center rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/60">
                    <img
                      src={layoutImageUrl}
                      alt=""
                      className="max-h-[60vh] w-full rounded-xl object-cover shadow-md"
                    />
                  </div>
                );
                const textSide = (
                  <div className="flex h-full w-1/2 flex-col justify-center space-y-5 overflow-y-auto px-2">
                    {allBlocks.map((block, idx) => (
                      <PresentationBlockRenderer
                        key={`${currentSlideKey}-${idx}`}
                        block={block}
                      />
                    ))}
                  </div>
                );
                return (
                  <div
                    className="flex w-full max-w-5xl items-stretch gap-10 text-left"
                    style={{ minHeight: "60vh" }}
                  >
                    {layout === "image-left" ? (
                      <>
                        {imgSide}
                        {textSide}
                      </>
                    ) : (
                      <>
                        {textSide}
                        {imgSide}
                      </>
                    )}
                  </div>
                );
              }

              if (layout === "full-image" && layoutImageUrl) {
                return (
                  <div className="flex w-full items-center justify-center">
                    <img
                      src={layoutImageUrl}
                      alt=""
                      className="max-h-[75vh] w-auto rounded-lg object-contain"
                    />
                  </div>
                );
              }

              // Default layout
              return (
                <div className="w-full max-w-4xl text-left">
                  <div className="space-y-4">
                    {allBlocks.map((block, idx) => (
                      <PresentationBlockRenderer
                        key={`${currentSlideKey}-${idx}`}
                        block={block}
                      />
                    ))}
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="text-xl text-slate-400 dark:text-slate-500">
              Empty slide
            </p>
          )}
        </div>
      </div>

      {/* ── Navigation arrows ── */}
      {nav.canGoPrev && (
        <button
          onClick={() => nav.goPrev()}
          className="fixed top-1/2 left-3 z-[102] -translate-y-1/2 p-2 text-slate-300 transition hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon className="h-10 w-10" strokeWidth={1.5} />
        </button>
      )}
      {nav.canGoNext && (
        <button
          onClick={() => nav.goNext()}
          className="fixed top-1/2 right-3 z-[102] -translate-y-1/2 p-2 text-slate-300 transition hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300"
          aria-label="Next slide"
        >
          <ChevronRightIcon className="h-10 w-10" strokeWidth={1.5} />
        </button>
      )}

      {/* ── Slide number (bottom-right) ── */}
      <div className="fixed right-4 bottom-3 z-[102] text-xs text-slate-400 tabular-nums dark:text-slate-500">
        {nav.globalSlideNumber} / {nav.totalGlobalSlides}
      </div>

      {/* ── Lesson indicator (bottom-left) ── */}
      {!isTitleCard &&
        !isEndSlide &&
        currentSlide &&
        currentSlide.lessonIndex >= 0 && (
          <div className="fixed bottom-3 left-4 z-[102] max-w-[40%] truncate text-xs text-slate-400 dark:text-slate-600">
            Lesson {currentSlide.lessonIndex + 1}: {currentSlide.lessonName}
          </div>
        )}

      {/* ── Progress bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-[102] h-[3px] bg-transparent">
        <div
          className="h-full bg-sky-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Lesson dots ── */}
      {titleSlideArray.length > 2 && (
        <div className="fixed inset-x-0 bottom-4 z-[102] flex justify-center">
          <div className="flex items-center gap-1">
            {titleSlideArray.map((_, idx) => (
              <button
                key={idx}
                onClick={() => nav.goToLesson(idx)}
                title={
                  idx === 0 ? "Title" : allLessonNames[idx] ?? `Lesson ${idx}`
                }
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === nav.currentLessonIndex
                    ? "w-4 bg-sky-400"
                    : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-500",
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
