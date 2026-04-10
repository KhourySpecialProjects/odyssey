"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DROPLET_FILTERS, SortFilterItem } from "@/lib/globals";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { IconFilter } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface TagOption {
  label: string;
  value: string;
}

interface DropletFiltersButtonProps {
  sortOptions: SortFilterItem[];
  defaultSort: SortFilterItem;
  tagOptions: TagOption[];
}

export function DropletFiltersButton({
  sortOptions,
  defaultSort,
  tagOptions,
}: DropletFiltersButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getValues = (name: string) =>
    searchParams.get(name)?.split(",").filter(Boolean) ?? [];

  const setValues = (name: string, values: string[]) => {
    const params = new URLSearchParams(searchParams);
    if (values.length > 0) {
      params.set(name, values.join(","));
    } else {
      params.delete(name);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleValue = (name: string, value: string) => {
    const current = getValues(name);
    if (current.includes(value)) {
      setValues(
        name,
        current.filter((v) => v !== value),
      );
    } else {
      setValues(name, [...current, value]);
    }
  };

  const currentSort = searchParams.get("sort") || defaultSort.slug;
  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value !== defaultSort.slug) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams);
    ["focusArea", "type", "difficulty", "tags", "sort"].forEach((k) =>
      params.delete(k),
    );
    router.push(`${pathname}?${params.toString()}`);
  };

  // Count active non-default filters
  const activeCount =
    ["focusArea", "type", "difficulty", "tags"].reduce(
      (n, k) => n + getValues(k).length,
      0,
    ) + (currentSort !== defaultSort.slug ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-[#D0D5DD] text-[#667085] dark:border-slate-700 dark:text-slate-400"
        >
          <IconFilter className="h-4 w-4 flex-shrink-0" stroke={1.5} />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 font-normal">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Filters</p>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-[#287697] hover:underline dark:text-[#4AABCF]"
            >
              Clear all
            </button>
          )}
        </div>

        <Separator />

        {/* Sort */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-[#667085] uppercase dark:text-slate-400">
            Sort by
          </p>
          <div className="flex flex-col gap-1">
            {sortOptions.map((option) => {
              const isSelected = currentSort === option.slug;
              return (
                <button
                  key={option.slug}
                  onClick={() => setSort(option.slug)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    isSelected
                      ? "bg-[#287697]/10 text-[#287697] dark:bg-[#287697]/20 dark:text-[#4AABCF]"
                      : "text-[#344054] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-[#287697] bg-[#287697] dark:border-[#4AABCF] dark:bg-[#4AABCF]"
                        : "border-slate-300 dark:border-slate-600",
                    )}
                  >
                    {isSelected && (
                      <CheckIcon className="h-2.5 w-2.5 text-white" />
                    )}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* DROPLET_FILTERS: Focus Area, Type, Difficulty */}
        {DROPLET_FILTERS.map((filter) => (
          <div key={filter.name}>
            <Separator />
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-medium tracking-wide text-[#667085] uppercase dark:text-slate-400">
                {filter.label}
              </p>
              <div className="flex flex-col gap-1">
                {filter.options.map((option) => {
                  const selected = getValues(filter.name).includes(
                    option.value,
                  );
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleValue(filter.name, option.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        selected
                          ? "bg-[#287697]/10 text-[#287697] dark:bg-[#287697]/20 dark:text-[#4AABCF]"
                          : "text-[#344054] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                          selected
                            ? "border-[#287697] bg-[#287697] dark:border-[#4AABCF] dark:bg-[#4AABCF]"
                            : "border-slate-300 dark:border-slate-600",
                        )}
                      >
                        {selected && (
                          <CheckIcon className="h-2.5 w-2.5 text-white" />
                        )}
                      </span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Tags */}
        {tagOptions.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-medium tracking-wide text-[#667085] uppercase dark:text-slate-400">
                Tags
              </p>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {tagOptions.map((tag) => {
                  const selected = getValues("tags").includes(tag.value);
                  return (
                    <button
                      key={tag.value}
                      onClick={() => toggleValue("tags", tag.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        selected
                          ? "bg-[#287697]/10 text-[#287697] dark:bg-[#287697]/20 dark:text-[#4AABCF]"
                          : "text-[#344054] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                          selected
                            ? "border-[#287697] bg-[#287697] dark:border-[#4AABCF] dark:bg-[#4AABCF]"
                            : "border-slate-300 dark:border-slate-600",
                        )}
                      >
                        {selected && (
                          <CheckIcon className="h-2.5 w-2.5 text-white" />
                        )}
                      </span>
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
