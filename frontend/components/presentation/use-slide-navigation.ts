"use client";

import { useEffect, useState, useCallback } from "react";
import { useQueryState, parseAsInteger } from "nuqs";
import { useRouter } from "next/navigation";
import { Slide } from "./utils";

interface UseSlideNavigationProps {
  /** All slides grouped by lesson: allSlides[lessonIndex][slideIndex] */
  allSlides: Slide[][];
  /** The droplet slug, used to navigate back on Escape */
  dropletSlug: string;
}

export interface SlideNavigation {
  currentLessonIndex: number;
  currentSlideIndex: number;
  currentSlides: Slide[];
  currentSlide: Slide | undefined;
  totalSlides: number;
  globalSlideNumber: number;
  totalGlobalSlides: number;
  goNext: () => void;
  goPrev: () => void;
  goToLesson: (lessonIndex: number) => void;
  goToSlide: (slideIndex: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export function useSlideNavigation({
  allSlides,
  dropletSlug,
}: UseSlideNavigationProps): SlideNavigation {
  const router = useRouter();

  // Lesson index is persisted in URL so sharing/refreshing preserves position
  const [currentLessonIndex, setCurrentLessonIndex] = useQueryState(
    "lesson",
    parseAsInteger.withDefault(0),
  );

  // Slide index resets when the lesson changes — kept in local state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Clamp lessonIndex to valid range
  const safeLessonIndex = Math.min(
    Math.max(0, currentLessonIndex),
    Math.max(0, allSlides.length - 1),
  );

  const currentSlides = allSlides[safeLessonIndex] ?? [];
  const safeSlideIndex = Math.min(
    Math.max(0, currentSlideIndex),
    Math.max(0, currentSlides.length - 1),
  );

  const currentSlide = currentSlides[safeSlideIndex];
  const totalSlides = currentSlides.length;

  // Compute global slide number across all lessons (1-based for display)
  let globalSlideNumber = 0;
  let totalGlobalSlides = 0;
  for (let li = 0; li < allSlides.length; li++) {
    const count = allSlides[li].length;
    if (li < safeLessonIndex) {
      globalSlideNumber += count;
    } else if (li === safeLessonIndex) {
      globalSlideNumber += safeSlideIndex + 1;
    }
    totalGlobalSlides += count;
  }

  const isLastSlideInLesson = safeSlideIndex >= currentSlides.length - 1;
  const isFirstSlideInLesson = safeSlideIndex === 0;
  const isLastLesson = safeLessonIndex >= allSlides.length - 1;
  const isFirstLesson = safeLessonIndex === 0;

  const canGoNext = !(isLastSlideInLesson && isLastLesson);
  const canGoPrev = !(isFirstSlideInLesson && isFirstLesson);

  const goNext = useCallback(() => {
    if (!canGoNext) return;

    if (!isLastSlideInLesson) {
      // Advance within current lesson
      setCurrentSlideIndex((prev) => prev + 1);
    } else if (!isLastLesson) {
      // Advance to first slide of next lesson
      setCurrentLessonIndex(safeLessonIndex + 1);
      setCurrentSlideIndex(0);
    }
  }, [
    canGoNext,
    isLastSlideInLesson,
    isLastLesson,
    safeLessonIndex,
    setCurrentLessonIndex,
  ]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;

    if (!isFirstSlideInLesson) {
      setCurrentSlideIndex((prev) => prev - 1);
    } else if (!isFirstLesson) {
      // Jump to the last slide of the previous lesson
      const prevLessonSlides = allSlides[safeLessonIndex - 1];
      setCurrentLessonIndex(safeLessonIndex - 1);
      setCurrentSlideIndex(Math.max(0, (prevLessonSlides?.length ?? 1) - 1));
    }
  }, [
    canGoPrev,
    isFirstSlideInLesson,
    isFirstLesson,
    safeLessonIndex,
    allSlides,
    setCurrentLessonIndex,
  ]);

  const goToLesson = useCallback(
    (lessonIndex: number) => {
      const clamped = Math.min(Math.max(0, lessonIndex), allSlides.length - 1);
      setCurrentLessonIndex(clamped);
      setCurrentSlideIndex(0);
    },
    [allSlides.length, setCurrentLessonIndex],
  );

  const goToSlide = useCallback(
    (slideIndex: number) => {
      const clamped = Math.min(
        Math.max(0, slideIndex),
        currentSlides.length - 1,
      );
      setCurrentSlideIndex(clamped);
    },
    [currentSlides.length],
  );

  // NOTE: Do NOT reset slide index on lesson change here.
  // goNext and goToLesson explicitly set slideIndex to 0.
  // goPrev sets it to the last slide of the previous lesson.
  // A blanket reset would override goPrev's target.

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in an input / textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          router.push(`/d/${dropletSlug}`);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, router, dropletSlug]);

  return {
    currentLessonIndex: safeLessonIndex,
    currentSlideIndex: safeSlideIndex,
    currentSlides,
    currentSlide,
    totalSlides,
    globalSlideNumber,
    totalGlobalSlides,
    goNext,
    goPrev,
    goToLesson,
    goToSlide,
    canGoNext,
    canGoPrev,
  };
}
