"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const VOYAGE_TOUR_KEY = "voyage-form-tour-v1";

interface VoyageFormTourProps {
  run: boolean;
  setRun: (v: boolean) => void;
}

export function VoyageFormTour({ run, setRun }: VoyageFormTourProps) {
  useEffect(() => {
    if (!run) return;

    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0,0,0,0.75)",
      overlayOpacity: 0.75,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 6,
      stageRadius: 8,
      popoverOffset: 24,
      popoverClass: "draft-tour-popover",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Got it!",
      // X, Done, Escape and overlay clicks all land here. Destroy directly: a
      // parent unmounted by navigation never re-renders to do it
      onDestroyStarted: () => {
        localStorage.setItem(VOYAGE_TOUR_KEY, "completed");
        d.destroy();
        setRun(false);
      },
      steps: [
        {
          popover: {
            title: "Let's build a Voyage!",
            description:
              "A voyage is a learning path your students follow, island by island. You can mix playlists, individual droplets, and even leave spots open for others to contribute.",
            side: "over",
            align: "center",
          },
        },
        {
          element: "#tour-voyage-name",
          popover: {
            title: "Name your Voyage",
            description:
              "Pick something students will recognize. This shows up on the explore page and their dashboard.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-node-type-tabs",
          popover: {
            title: "Islands",
            description:
              "Each island is one stop on the journey. Use the Playlist tab to add a group of droplets, the Droplet tab to add a single piece of content, or the Placeholder tab to leave a spot for someone else to claim and write.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tour-node-list",
          popover: {
            title: "Build your path",
            description:
              "Your islands show up here as you add them. Reorder them with the arrows, or use the Branches from dropdown to create optional side paths.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-sequential-toggle",
          popover: {
            title: "Sequential progression",
            description:
              "Turn this on if you want students to go through islands one at a time. They need to finish each stop before the next one unlocks. Placeholders are skipped automatically.",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-preview",
          popover: {
            title: "Live Preview",
            description:
              "This preview updates as you go. Add an island and watch it appear on the map. This is the same tree view students will see.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-publish-buttons",
          popover: {
            title: "Save and Publish",
            description:
              "Click Save as Draft if you are still working on it, or Publish Voyage to make it live. You can always come back and edit.",
            side: "top",
            align: "center",
          },
        },
      ],
    });

    d.drive();
    // Leaving the page mid-tour would otherwise orphan it on document.body
    return () => {
      if (d.isActive()) d.destroy();
    };
  }, [run, setRun]);

  return null;
}
