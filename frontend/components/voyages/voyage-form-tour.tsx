"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const VOYAGE_TOUR_KEY = "voyage-form-tour-v1";

interface VoyageFormTourProps {
  run: boolean;
  setRun: (v: boolean) => void;
}

export function VoyageFormTour({ run, setRun }: VoyageFormTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    if (!run) {
      driverRef.current?.destroy();
      return;
    }

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
      doneBtnText: "Got it!",
      onCloseClick: () => {
        setRun(false);
        localStorage.setItem(VOYAGE_TOUR_KEY, "completed");
      },
      onDestroyStarted: () => {
        setRun(false);
        localStorage.setItem(VOYAGE_TOUR_KEY, "completed");
      },
      steps: [
        {
          popover: {
            title: "Welcome to Voyage Builder",
            description:
              "Voyages are structured learning paths made of islands. Each island can be a playlist, a droplet, or a placeholder for someone to claim. Let's walk through the tools.",
            side: "over",
            align: "center",
          },
        },
        {
          element: "#tour-voyage-name",
          popover: {
            title: "Voyage Name",
            description:
              "Give your voyage a descriptive name. This is what students will see when browsing voyages.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-node-type-tabs",
          popover: {
            title: "Island Types",
            description:
              "Choose what type of island to add:\n\n• Playlist — a collection of droplets\n• Droplet — a single learning unit\n• Placeholder — an empty spot for someone to claim and write",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tour-node-list",
          popover: {
            title: "Your Islands",
            description:
              "Islands appear here as you add them. Drag the grip handle to reorder main path islands. Use 'Branches from' to create optional side paths.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-sequential-toggle",
          popover: {
            title: "Sequential Progression",
            description:
              "When enabled, students must complete each island before unlocking the next. Placeholder islands are skipped automatically.",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-preview",
          popover: {
            title: "Live Preview",
            description:
              "See how your voyage tree looks in real-time as you build it. The preview updates as you add, remove, and reorder islands.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-publish-buttons",
          popover: {
            title: "Save & Publish",
            description:
              "Save as draft to continue editing later, or publish to make the voyage available to students. You can always edit after publishing.",
            side: "top",
            align: "center",
          },
        },
      ],
    });

    driverRef.current = d;
    d.drive();
  }, [run, setRun]);

  return null;
}
