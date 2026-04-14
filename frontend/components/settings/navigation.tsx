"use client";

import { cn } from "@/lib/utils";
import { NavItem } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useEffect, useRef, useState } from "react";

export function SettingsNavigation({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [headerHeight, setHeaderHeight] = useState(69);
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      const header = document.querySelector<HTMLElement>(".sticky.top-0.z-50");
      if (header) setHeaderHeight(header.getBoundingClientRect().height);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const updateBottom = () => {
      if (!navRef.current) return;
      const footer = document.querySelector<HTMLElement>("footer");
      if (!footer) return;
      const footerTop = footer.getBoundingClientRect().top;
      const bottom = Math.max(0, window.innerHeight - footerTop);
      navRef.current.style.bottom = `${bottom}px`;
    };
    updateBottom();
    window.addEventListener("scroll", updateBottom, { passive: true });
    window.addEventListener("resize", updateBottom);
    return () => {
      window.removeEventListener("scroll", updateBottom);
      window.removeEventListener("resize", updateBottom);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed left-0 z-40 hidden w-64 flex-shrink-0 flex-col border-r border-[#D0D5DD] bg-[#FCFCFD] md:flex dark:border-slate-700 dark:bg-slate-900"
      style={{ top: headerHeight, bottom: 0 }}
      aria-label="Settings navigation"
    >
      <ul className="mt-6 flex flex-col gap-1 px-3">
        {items.map((item) => {
          if (item.isHidden) return null;
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#287697]/10 text-[#287697] dark:bg-[#287697]/20 dark:text-[#4AABCF]"
                    : "text-[#344054] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.icon && (
                  <span
                    className={cn(
                      "flex shrink-0 items-center",
                      isActive
                        ? "text-[#287697] dark:text-[#4AABCF]"
                        : "text-[#667085] dark:text-slate-400",
                    )}
                  >
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
