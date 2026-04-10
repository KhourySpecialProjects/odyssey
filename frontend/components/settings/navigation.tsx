"use client";

import { cn } from "@/lib/utils";
import { NavItem } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsNavigation({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Settings navigation">
      {items.map((item) => {
        if (item.isHidden) return null;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-[#287697]/10 text-[#287697] dark:bg-[#287697]/20 dark:text-[#4AABCF]"
                : "text-[#344054] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
