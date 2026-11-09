"use client";

import { CircleHelpIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DropletCategory } from "@/lib/droplet-categories";

// Popover (not Tooltip) so it also opens on touch.
export function CategoryInfo({
  label,
  categories,
}: {
  label: string;
  categories: DropletCategory[];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="ml-1 inline-flex align-middle text-slate-400 transition-colors hover:text-[#297496] dark:hover:text-sky-400"
        >
          <CircleHelpIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-sm font-normal">
        <dl className="space-y-3">
          {categories.map((category) => (
            <div key={category.name}>
              <dt className="font-semibold text-slate-900 dark:text-white">
                {category.name}
              </dt>
              <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
                {category.description}
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
