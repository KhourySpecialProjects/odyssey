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
        <li key={item.href}>
          <Link
            href={item.href}
            className={cn(
              "block px-3 py-2",
              pathname.startsWith(item.href)
                ? "font-bold text-white bg-sky-700 rounded md:bg-transparent md:text-sky-700 md:p-0 md:dark:text-sky-500"
                : "text-slate-900 rounded hover:bg-slate-100 md:hover:bg-transparent md:hover:text-sky-700 md:p-0 md:dark:hover:text-sky-500 dark:text-white dark:hover:bg-slate-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-slate-700",
            )}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
