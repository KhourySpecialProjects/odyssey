"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconListCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { FOCUS } from "@/components/draft/overview-scan/focus";

/** Links to the pre-publish checks; the panel only shows for reviewers, who may run them. */
export function ScanLink({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const href = `/draft/d/${slug}/scan`;
  const current = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 aria-[current=page]:border-[#2d7597] aria-[current=page]:text-[#2d7597] dark:border-[#33425c] dark:bg-[#131c2e] dark:text-slate-200 dark:hover:border-slate-500 dark:aria-[current=page]:border-sky-400 dark:aria-[current=page]:text-sky-300",
        FOCUS,
        className,
      )}
    >
      <IconListCheck className="h-4 w-4" aria-hidden="true" />
      Pre-publish checks
    </Link>
  );
}
