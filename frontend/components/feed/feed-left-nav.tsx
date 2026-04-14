"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  IconArchive,
  IconDroplet,
  IconHeart,
  IconLayoutList,
  IconMap,
  IconNews,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "feed", label: "Feed", Icon: IconNews },
  { value: "droplets", label: "Droplets", Icon: IconDroplet },
  { value: "playlists", label: "Playlists", Icon: IconLayoutList },
  { value: "voyages", label: "Voyages", Icon: IconMap },

  { value: "archived", label: "Archived", Icon: IconArchive },
  { value: "favorited", label: "Favorited", Icon: IconHeart },
];

export function FeedLeftNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "feed";

  const navigate = (tab: string) => {
    if (tab === activeTab) return;
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden py-6">
      {/* Tab navigation */}
      <nav aria-label="Content sections" className="flex-1">
        <ul className="space-y-0.5 px-3">
          {TABS.map(({ value, label, Icon }) => {
            const isActive = activeTab === value;
            return (
              <li key={value}>
                <button
                  onClick={() => navigate(value)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#287697]/10 text-[#287697] dark:bg-[#287697]/20 dark:text-[#4AABCF]"
                      : "text-[#344054] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-[#287697] dark:text-[#4AABCF]"
                        : "text-[#667085] dark:text-slate-400",
                    )}
                    stroke={1.75}
                  />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
