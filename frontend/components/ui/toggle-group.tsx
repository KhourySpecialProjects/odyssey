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
        "rounded-3xl px-2 py-2 space-x-2 border border-slate-200 dark:border-slate-500 w-fit",
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
        "rounded-3xl text-sm px-3 py-2   text-slate-900  focus:outline-none  disabled:cursor-not-allowed dark:border-slate-800  dark:text-slate-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 data-[state=on]:bg-slate-200 dark:data-[state=on]:bg-slate-700 dark:hover:bg-slate-800 hover:bg-slate-100",
        className,
      )}
      {...props}
    ></ToggleGroupPrimitive.Item>
  );
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
