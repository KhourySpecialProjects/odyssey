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
import { useQueryState } from "nuqs";

export function Sort({
  options,
  defaultValue,
}: {
  options: SortFilterItem[];
  defaultValue: SortFilterItem;
}) {
  const [selectedValue, setSelectedValue] = useQueryState("sort", {
    defaultValue: defaultValue.slug,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-0.25 border-dashed">
          <ArrowUpDownIcon className="mr-2 w-4 h-4" />

          {options.find((item) => item.slug === selectedValue)!.label}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedValue}
          onValueChange={setSelectedValue}
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
