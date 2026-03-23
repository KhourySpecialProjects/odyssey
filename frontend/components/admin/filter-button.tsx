"use client";

import { useState } from "react";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FilterButtonProps {
  /** Called when the user clicks Apply. Commit whatever draft state the children expose. */
  onApply: () => void;
  /** Called when the user clicks Reset. Should clear all active filters. */
  onReset: () => void;
  /**
   * Controls active styling:
   * - `"Active State"` forces the active (teal glow) appearance
   * - `"Filters Button"` uses default styling
   * Alternatively leave unset — the component automatically enters active style
   * when the popout is open or `hasActiveFilters` is true.
   */
  property1?: "Filters Button" | "Active State";
  /**
   * Set to true when at least one filter is currently applied.
   * Keeps the button in active state even when the popout is closed.
   */
  hasActiveFilters?: boolean;
  /** Page-specific filter controls rendered inside the popout content area. */
  children: React.ReactNode;
}

/**
 * Reusable Filter Button with a popout panel.
 * ODY-361 — consistent across all admin pages; page-specific content injected via children.
 */
export function FilterButton({
  onApply,
  onReset,
  property1 = "Filters Button",
  hasActiveFilters = false,
  children,
}: FilterButtonProps) {
  const [open, setOpen] = useState(false);

  // Active when: forced via prop, popout is open, or a filter is currently applied
  const active = property1 === "Active State" || open || hasActiveFilters;

  const handleApply = () => {
    onApply();
    setOpen(false);
  };

  const handleReset = () => {
    onReset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Button: 89px × 40px, border-radius 8px, 16px horizontal padding */}
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "flex h-10 w-[89px] items-center justify-center gap-2 rounded-lg border bg-white px-4 text-sm font-medium text-[#344054] transition-all dark:bg-slate-800 dark:text-slate-300",
            active
              ? "border-[#2D7597] shadow-[0px_0px_4px_#2D7597]"
              : "border-[#D0D5DD] hover:border-slate-400 dark:border-slate-600",
          )}
        >
          <ListFilter className="h-4 w-4 flex-shrink-0" />
          <span>Filter</span>
        </button>
      </PopoverTrigger>

      {/* Popout: 216px wide, border-radius 8px, shadow 0px 0px 4px rgba(0,0,0,0.25) */}
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[216px] rounded-lg border-0 p-0 shadow-[0px_0px_4px_rgba(0,0,0,0.25)]"
      >
        {/* Title */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[15px] font-medium text-black">Filter</p>
        </div>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Page-specific filter content */}
        <div className="px-4 py-3">{children}</div>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-lg border border-[#D0D5DD] bg-white py-1.5 text-xs font-medium text-[#344054] hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 rounded-lg bg-[#2D7597] py-1.5 text-xs font-medium text-white hover:bg-[#255e78]"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
