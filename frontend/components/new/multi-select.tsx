"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface MultiSelectItem {
  id: number;
  name: string;
}

import { CheckIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiSelect({
  label,
  items,
  selected,
  setSelected,
  align = "center",
}: {
  label: string;
  items: MultiSelectItem[];
  selected: MultiSelectItem[];
  setSelected: (selected: MultiSelectItem[]) => void;
  align?: "center" | "start" | "end";
}) {
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            before={<ChevronDown />}
            className="max-w-96 h-fit"
          >
            {label}
            {selected?.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-4 mx-2" />

                <div className="gap-1 flex flex-wrap items-center justify-center max-w-48">
                  {selected.map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.id}
                      className="px-1 py-0 font-normal rounded-sm"
                    >
                      {option.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align={align}>
          <Command>
            <CommandInput placeholder={label} />
            <CommandList>
              <CommandGroup>
                {items.map((option) => {
                  //is the item in the selected list
                  const isSelected = selected.filter((item) => item.id === option.id).length > 0;

                  return (
                    <CommandItem
                      key={option.id}
                      onSelect={() => {
                        if (isSelected) {
                          setSelected(selected.filter((val) => val.id !== option.id));
                        } else {
                          setSelected([...selected, option]);
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-sky-600",
                          isSelected
                            ? "bg-sky-600 text-white"
                            : "opacity-50 [&_svg]:invisible",
                        )}
                      >
                        <CheckIcon className="w-4 h-4" />
                      </div>
                      <span>{option.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
