"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const TOUR_KEY = "draft-tour-v1";

interface DraftTourProps {
  run: boolean;
  setRun: (v: boolean) => void;
}

export function DraftTour({ run, setRun }: DraftTourProps) {
  useEffect(() => {
    if (!run) return;

    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0,0,0,0.4)",
      overlayOpacity: 0.4,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 6,
      stageRadius: 8,
      popoverOffset: 24,
      popoverClass: "draft-tour-popover",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      // X, Done, Escape and overlay clicks all land here. Destroy directly: a
      // parent unmounted by navigation never re-renders to do it
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_KEY, "completed");
        d.destroy();
        setRun(false);
      },
      steps: [
        {
          popover: {
            title: "Welcome to the Lesson Editor",
            description:
              "Let's take a quick tour of the tools available while drafting a droplet. You can skip at any time.",
            side: "over",
            align: "center",
          },
        },
        {
          element: "#tour-back-btn-icon",
          popover: {
            title: "Back to My Content",
            description: "Click here to go back to your content library.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-auto-format",
          popover: {
            title: "Auto-Format Slides",
            description:
              "Use AI to automatically insert slide breaks into your lesson content. This can only be used once per droplet.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-present",
          popover: {
            title: "Present as Slides",
            description:
              "Once you've added slide breaks, launch your lesson as a slideshow presentation.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-overview",
          popover: {
            title: "Droplet Overview",
            description:
              "Jump to the droplet overview page to edit the title, description, learning objectives, and other metadata.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-add-lesson",
          popover: {
            title: "Add Lessons",
            description:
              "Create a new lesson, import one from Markdown, or upload a file (PDF, PPTX) to convert it into a lesson.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-bottom-actions",
          popover: {
            title: "Preview & Publish",
            description:
              "Preview how your droplet looks to learners, or submit it for review / publish it when it's ready.",
            side: "top",
            align: "start",
          },
        },
      ],
    });

    d.drive();
    // Leaving the page mid-tour would otherwise orphan it on document.body
    return () => {
      if (d.isActive()) d.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setRun is only called from a driver callback; re-running the tour when the parent passes a new setter would restart it
  }, [run]);

  return null;
}
