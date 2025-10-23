"use client";

import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ContentSelector({
  droplets,
  playlists,
  groups,
  archived,
  favorited,
}: {
  droplets: number;
  playlists: number;
  groups: number;
  archived: number;
  favorited: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "droplets";

  const tabs = [
    { name: `Droplets (${droplets})`, value: "droplets" },
    { name: `Playlists (${playlists})`, value: "playlists" },
    { name: `Groups (${groups})`, value: "groups" },
    { name: `Archived (${archived})`, value: "archived" },
    { name: `Archived (${favorited})`, value: "favorited"}
  ];

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(name, value);
    return params.toString();
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              router.push(`${pathname}?${createQueryString("tab", tab.value)}`);
            }}
            className={cn(
              tab.value === currentTab
                ? "border-primary-500 light:text-primary-600 dark:text-primary-300"
                : "light:text-gray-500 border-transparent hover:border-gray-300 hover:text-gray-700 dark:text-slate-300 dark:hover:text-gray-400",
              "border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap",
            )}
          >
            {tab.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
