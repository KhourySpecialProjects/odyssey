"use client";

import { useEffect, useRef, useState } from "react";
import Wave from "react-wavify";

const WAVE_FILL = "#2F5569";
const WAVE_STYLE = { display: "flex" };
const WAVE_OPTIONS = { height: 2, amplitude: 20, speed: 0.15, points: 3 };
const WAVE_CLASS_NAME = "bg-transparent dark:bg-transparent";

/**
 * Animated footer wave that only runs while the footer is on screen.
 *
 * react-wavify keeps a requestAnimationFrame + setState loop going for as long
 * as it's mounted (`paused` only freezes the shape), so while the footer is out
 * of view the Wave is swapped for a static copy of its markup holding the last
 * frame. The swap happens just outside the viewport, so it isn't visible.
 * Motion is paused for users who prefer reduced motion.
 */
export function FooterWave() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Paused until the observer reports whether the footer is visible
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [frozenPath, setFrozenPath] = useState("");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);

    const handleChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          const path = container.querySelector("path")?.getAttribute("d");
          if (path) setFrozenPath(path);
        }
        setInView(entry.isIntersecting);
      },
      // Start animating slightly before the footer scrolls into view
      { rootMargin: "200px 0px" },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      {inView ? (
        <Wave
          fill={WAVE_FILL}
          paused={reducedMotion}
          style={WAVE_STYLE}
          options={WAVE_OPTIONS}
          className={WAVE_CLASS_NAME}
        />
      ) : (
        // Same markup react-wavify renders, without the animation loop
        <div
          style={{ width: "100%", ...WAVE_STYLE }}
          className={WAVE_CLASS_NAME}
        >
          <svg
            width="100%"
            height="100%"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={frozenPath} fill={WAVE_FILL} />
          </svg>
        </div>
      )}
    </div>
  );
}
