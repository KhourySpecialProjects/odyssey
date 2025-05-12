"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "@/lib/utils";

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentProps<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(
        "w-fit space-x-2 rounded-3xl border border-slate-200 px-2 py-2 dark:border-slate-500",
        className,
      )}
      {...props}
      ref={ref}
    />
  );
});
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  // React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  HTMLButtonElement,
  React.ComponentProps<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        "rounded-3xl px-3 py-2 text-sm text-slate-900 hover:bg-slate-100 focus:outline-none disabled:cursor-not-allowed data-[state=on]:bg-slate-200 dark:border-slate-800 dark:text-slate-50 dark:ring-offset-slate-950 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300 dark:data-[state=on]:bg-slate-700",
        className,
      )}
      {...props}
    ></ToggleGroupPrimitive.Item>
  );
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
