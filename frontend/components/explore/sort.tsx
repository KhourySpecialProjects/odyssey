"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortFilterItem } from "@/lib/globals";
import { ArrowUpDownIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

export function Sort({
  options,
  defaultValue,
}: {
  options: SortFilterItem[];
  defaultValue: SortFilterItem;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedValue = searchParams.get("sort") || defaultValue.slug;

  const updateQueryString = (value: string) => {
    const params = new URLSearchParams(searchParams);
    // Always set the param (even for the default) so client grids can tell a
    // user choice from the server-rendered sort; see useSortKey.
    params.set("sort", value);
    // Grids sort client-side, so update the URL without a server render.
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-0.25 border-[#D0D5DD] text-[#667085] dark:border-slate-700 dark:text-slate-400"
        >
          <ArrowUpDownIcon className="mr-2 h-4 w-4" />
          {options.find((item) => item.slug === selectedValue)?.label}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedValue}
          onValueChange={updateQueryString}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.slug} value={option.slug}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
