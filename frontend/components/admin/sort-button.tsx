"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SortButtonProps {
  /** Called when the user clicks Apply. Commit whatever draft state the children expose. */
  onApply: () => void;
  /** Called when the user clicks Reset. Should clear the sort selection and close. */
  onReset: () => void;
  /**
   * When true the button renders in its active style (popout open indicator).
   * If omitted the component manages this automatically via the open state.
   */
  isActive?: boolean;
  /** Page-specific sort controls rendered inside the popout content area. */
  children: React.ReactNode;
}

/**
 * Reusable Sort Button with a popout panel.
 * ODY-360 — consistent across all admin pages; page-specific content injected via children.
 */
export function SortButton({
  onApply,
  onReset,
  isActive,
  children,
}: SortButtonProps) {
  const [open, setOpen] = useState(false);

  const active = isActive ?? open;

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
        {/* Button: 100px × 40px, border #D0D5DD, border-radius 8px */}
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "flex h-10 w-[100px] items-center justify-center gap-2 rounded-lg border bg-white px-3.5 text-sm font-medium text-[#344054] transition-colors",
            active
              ? "border-[#2D7597] shadow-[0px_0px_4px_#2D7597]"
              : "border-[#D0D5DD] hover:border-slate-400",
          )}
        >
          <ArrowUpDown className="h-4 w-4 flex-shrink-0" />
          <span>Sort by</span>
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
          <p className="text-[15px] font-medium text-black">Sort by</p>
        </div>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Page-specific sort content */}
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
