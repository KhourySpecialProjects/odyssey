"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { cn } from "@/lib/utils";
import { IconArchive, IconHeart } from "@tabler/icons-react";

interface FilterSelectorProps {
  droplets: number;
  playlists: number;
  groups: number;
  archived: number;
  favorited: number;
}

export function FilterSelector({
  droplets,
  playlists,
  groups,
  archived,
  favorited,
}: FilterSelectorProps) {
  const contentTypes: Array<{
    name: string;
    value: string;
    icon?: React.ReactNode;
  }> = [
    { name: `Droplets (${droplets})`, value: "droplets" },
    { name: `Playlists (${playlists})`, value: "playlists" },
    { name: `Groups (${groups})`, value: "groups" },
    {
      name: `Archived (${archived})`,
      value: "archived",
      icon: <IconArchive className="h-3.5 w-3.5" stroke={2} />,
    },
    {
      name: `Favorited (${favorited})`,
      value: "favorited",
      icon: <IconHeart className="h-3.5 w-3.5" stroke={2} />,
    },
  ];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("contentType") || "droplets";

  const createQueryString = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("contentType", value);
    return params.toString();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {contentTypes.map((type) => (
        <button
          key={type.value}
          onClick={() => {
            router.push(`${pathname}?${createQueryString(type.value)}`);
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            currentType === type.value
              ? "border-[#287697] bg-[#287697] text-white"
              : "border-[#D0D5DD] text-[#667085] hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800",
          )}
        >
          {type.icon && (
            <span
              className={
                currentType === type.value
                  ? "text-white"
                  : "text-black dark:text-white"
              }
            >
              {type.icon}
            </span>
          )}
          {type.name}
        </button>
      ))}
    </div>
  );
}
