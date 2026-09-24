"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type SectionTab = {
  href: string;
  label: string;
  isHidden?: boolean;
  /** Count shown after the label (hidden when 0), e.g. pending requests */
  badge?: { count: number; label: string };
};

// Horizontally scrolling pill tabs (same style as the Explore content type
// pills). Stands in for a section's side nav on screens too narrow for it.
export function SectionTabs({
  items,
  label,
  className,
}: {
  items: SectionTab[];
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);

  // Bring the current tab into view when it starts past the right edge
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !current) return;
    const overflow =
      current.offsetLeft + current.offsetWidth - list.clientWidth;
    if (overflow > list.scrollLeft) list.scrollLeft = overflow;
  }, [pathname]);

  return (
    <nav aria-label={label} className={className}>
      <ul
        ref={listRef}
        // relative: offsets above are measured from the list. py-1 leaves
        // room for the focus ring, which overflow-x-auto would clip. No
        // scrollbar: the clipped pill at the edge shows there's more.
        className="relative flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items
          .filter((item) => !item.isHidden)
          .map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[#287697]/50 focus-visible:outline-none",
                    isActive
                      ? "border-[#287697] bg-[#287697] text-white"
                      : "border-[#D0D5DD] text-[#667085] hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800",
                  )}
                >
                  {item.label}
                  {item.badge && item.badge.count > 0 && (
                    <>
                      {/* Keeps label and count apart in the accessible
                          name; flex layout doesn't render it */}{" "}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-xs leading-5",
                          isActive
                            ? "bg-white text-[#287697]"
                            : "bg-[#287697] text-white",
                        )}
                      >
                        {item.badge.count}
                        <span className="sr-only"> {item.badge.label}</span>
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
