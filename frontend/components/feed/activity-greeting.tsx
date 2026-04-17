"use client";

import { usePathname } from "next/navigation";

const SUBHEADINGS: Record<string, string> = {
  "/activity": "Check out what's happening right now.",
  "/activity/droplets": "View and manage your enrolled droplets.",
  "/activity/playlists": "View and manage your saved playlists.",
  "/activity/voyages": "View and manage your learning voyages.",
  "/activity/favorited": "View and manage your favorited droplets.",
  "/activity/archived": "View and manage your archived content.",
};

export function ActivityGreeting({ firstName }: { firstName?: string | null }) {
  const pathname = usePathname();
  const subheading = SUBHEADINGS[pathname] || "View and manage your content.";

  return (
    <div className="mb-5 shrink-0">
      <h1 className="text-3xl font-semibold text-black dark:text-white">
        Hi, {firstName || "there"}!
      </h1>
      <p className="mt-1 text-sm text-[#475569] md:text-base dark:text-slate-400">
        {subheading}
      </p>
    </div>
  );
}
