"use client";

import { cn } from "@/lib/utils";
import { NavItem } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsNavigation({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-4 text-sm text-slate-500">
      {items.map((item) => {
        if (item.isHidden) return null;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "font-semibold dark:text-slate-300 text-xl",
              pathname == item.href && "text-sky-600 dark:text-sky-600",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
