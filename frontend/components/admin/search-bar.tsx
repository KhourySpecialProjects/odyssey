"use client";

import { IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Pill-shaped search input.
 * ODY-357 — border-radius 30px, bg #FCFCFD, 2px border #EFEFF0,
 * search icon 20px from left, placeholder Lato Regular 16px #667085.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = "Search",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative flex w-full items-center", className)}>
      {/* Search icon — 20px from left edge */}
      <IconSearch
        className="pointer-events-none absolute left-5 h-5 w-5 flex-shrink-0 text-[#667085]"
        stroke={1.8}
      />

      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "h-11 w-full rounded-[30px] border-2 border-[#EFEFF0] bg-[#FCFCFD]",
          "pr-2 pl-11",
          "text-base text-slate-900 placeholder:font-normal placeholder:text-[#667085]",
          "transition-colors outline-none focus:border-[#2D7597] focus:ring-0",
          "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
        )}
      />
    </div>
  );
}
