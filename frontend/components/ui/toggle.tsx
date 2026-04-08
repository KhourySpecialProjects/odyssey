"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cn } from "@/lib/utils";

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentProps<typeof TogglePrimitive.Root>
>(({ className, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      "border border-[#d0d5dd] bg-white text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]",
      "hover:bg-slate-50",
      "data-[state=on]:border-[#2D7597] data-[state=on]:bg-[#2D7597] data-[state=on]:text-white",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle };
