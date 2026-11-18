"use client";

import { usePathname } from "next/navigation";

/** Renders its children only on the Activity home (/activity), not its tabs. */
export function HomeOnly({ children }: { children: React.ReactNode }) {
  return usePathname() === "/activity" ? <>{children}</> : null;
}
