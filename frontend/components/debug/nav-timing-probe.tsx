"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Measures client-side route transitions — the thing users actually feel when
 * they click between Activity / Explore / Groups / Create / Review.
 *
 * Reports two numbers per navigation:
 *
 *   rsc      How long the server took to produce the RSC payload for the new
 *            route, and how big that payload was. This is server render time
 *            plus Strapi time; cross-reference it with the PERF PROBE block in
 *            the server console for the same route.
 *
 *   click→paint
 *            Wall-clock from the pathname changing to the browser finishing
 *            the next paint. This is the number the user experiences.
 *
 * Enabled via NEXT_PUBLIC_PERF_PROBE=1 (must be the NEXT_PUBLIC_ variant — it
 * has to reach the browser).
 */
export function NavTimingProbe() {
  const pathname = usePathname();
  const navStartRef = useRef<number | null>(null);
  const previousPathRef = useRef<string | null>(null);
  const sameRouteClicksRef = useRef(0);

  // Report RSC payload fetches as the browser completes them.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PERF_PROBE !== "1") return;
    if (typeof PerformanceObserver === "undefined") return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.name.includes("_rsc=")) continue;

        const resource = entry as PerformanceResourceTiming;
        const route = new URL(resource.name).pathname;
        // transferSize is 0 for cached/CORS-opaque responses; decodedBodySize
        // still reports the real payload size.
        const size = resource.decodedBodySize || resource.transferSize;

        console.log(
          `%c[nav] rsc ${route}  ${Math.round(resource.duration)}ms  ` +
            `${(size / 1024).toFixed(1)}KB  ` +
            `(ttfb ${Math.round(resource.responseStart - resource.requestStart)}ms)`,
          "color:#0284c7;font-weight:bold",
        );
      }
    });

    observer.observe({ type: "resource", buffered: true });
    return () => observer.disconnect();
  }, []);

  // Stamp the clock when the user clicks an internal link, so the pathname
  // effect below can measure from the actual interaction rather than from the
  // end of the previous navigation.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PERF_PROBE !== "1") return;

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href?.startsWith("/")) return;

      navStartRef.current = performance.now();

      // Clicking a link to the route you are already on still triggers a full
      // RSC fetch, but `pathname` never changes — so the transition effect
      // below never runs and the cost would go unattributed. Count these
      // explicitly: an `rsc` line with no matching transition line is exactly
      // the case that was invisible before.
      const samePath = href.split("?")[0] === pathname;
      if (samePath) {
        sameRouteClicksRef.current += 1;
        console.log(
          `%c[nav] re-click ${pathname} (#${sameRouteClicksRef.current} since last route change) ` +
            `— triggers a full RSC refetch, no transition`,
          "color:#ea580c;font-weight:bold",
        );
      }
    };

    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, [pathname]);

  // Report perceived transition time on every pathname change.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PERF_PROBE !== "1") return;

    const previous = previousPathRef.current;
    previousPathRef.current = pathname;
    sameRouteClicksRef.current = 0;

    // Skip the initial mount — there is no transition to measure yet.
    if (previous === null) return;

    const start = navStartRef.current;
    navStartRef.current = null;

    // No recorded click means this was a back/forward or programmatic nav.
    const origin = start === null ? "history" : "click";
    const elapsedFrom = start ?? performance.now();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const elapsed = Math.round(performance.now() - elapsedFrom);
        console.log(
          `%c[nav] ${previous} → ${pathname}  ` +
            `${origin}→paint ${elapsed}ms`,
          "color:#c026d3;font-weight:bold",
        );
      });
    });
  }, [pathname]);

  return null;
}
