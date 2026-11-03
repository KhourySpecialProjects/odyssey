"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconListCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { FOCUS } from "@/components/draft/overview-scan/focus";

/** Opens the Final Overview Scan; the panel only shows for reviewers, who may scan. */
export function ScanLink({ slug }: { slug: string }) {
  const href = `/draft/d/${slug}/scan`;
  const current = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "mt-2 flex h-9 items-center justify-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm font-medium text-[#344054] transition-colors hover:border-slate-400 aria-[current=page]:border-[#2d7597] aria-[current=page]:text-[#2d7597]",
        FOCUS,
      )}
    >
      <IconListCheck className="h-4 w-4" aria-hidden="true" />
      Final Overview Scan
    </Link>
  );
}
