"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CardSkeleton } from "@/components/admin/card-skeleton";

export function AdminLoadingOverlay({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    if (pathname !== prevPathname) {
      setIsNavigating(false);
      setPrevPathname(pathname);
    }
  }, [pathname, prevPathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (
        anchor?.href &&
        anchor.href.includes("/admin") &&
        !anchor.href.includes("#") &&
        new URL(anchor.href).pathname !== pathname
      ) {
        setIsNavigating(true);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  if (!isNavigating) return <>{children}</>;

  return (
    <div className="w-full px-4 py-4 md:px-[56px] md:py-8">
      <div className="mb-6">
        <div className="h-7 w-[120px] animate-pulse rounded bg-slate-200 md:h-10 md:w-[160px] dark:bg-slate-700" />
        <div className="mt-2 h-4 w-[200px] animate-pulse rounded bg-slate-100 md:h-5 md:w-[320px] dark:bg-slate-700" />
      </div>

      {/* Mobile skeleton */}
      <div className="flex flex-col gap-2 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} showAvatar />
        ))}
      </div>

      {/* Desktop skeleton - generic table */}
      <div className="hidden space-y-4 md:block">
        <div className="flex items-center justify-between">
          <div className="h-10 w-[560px] animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-10 w-[100px] animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-[80px] animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
        <div className="overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] dark:border-slate-700">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-[#eaecf0] px-6 py-4 dark:border-slate-700"
            >
              <div className="h-4 w-[200px] animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-[150px] animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
              <div className="ml-auto h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
