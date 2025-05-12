"use client";

import { cn } from "@/lib/utils";
import { NavItem } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({
  items,
  className,
}: {
  items: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <ul className={cn("flex", className)}>
      {items.map((item) => (
        <li
          key={item.href}
          className={`${pathname.startsWith(item.href.split("?")[0]) ? "font-bold" : ""}`}
        >
          <Link
            href={item.href}
            className={cn(
              "block px-3 py-2",
              pathname.startsWith(item.href.split("?")[0])
                ? "rounded bg-sky-700 font-bold text-white md:bg-transparent md:p-0 md:text-sky-700 md:dark:text-sky-500"
                : "rounded text-slate-900 hover:bg-slate-100 md:p-0 md:hover:bg-transparent md:hover:text-sky-700 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700 dark:hover:text-white md:dark:hover:bg-transparent md:dark:hover:text-sky-500",
            )}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
