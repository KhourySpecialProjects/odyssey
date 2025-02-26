"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { FilterOption } from "@/lib/globals";
import { cn } from "@/lib/utils";
import { CheckIcon, PlusCircleIcon } from "lucide-react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

export function Filter({
  name,
  label,
  options,
  defaultValue = [],
}: {
  name: string;
  label: string;
  options: FilterOption[];
  defaultValue?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedValues = searchParams.get(name)?.split(",") || defaultValue;

  const updateQueryString = (values: string[]) => {
    const params = new URLSearchParams(searchParams);
    if (values.length > 0) {
      params.set(name, values.join(","));
    } else {
      params.delete(name);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-0.25 border-dashed dark:text-slate-300"
        >
          <PlusCircleIcon className="w-4 h-4 mr-2" />

          {label}

          {selectedValues?.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4 mx-2" />

              <Badge variant="secondary" className="px-1 font-normal lg:hidden">
                {selectedValues.length}
              </Badge>

              <div className="hidden space-x-1 lg:flex">
                {selectedValues.length > 2 ? (
                  <Badge variant="secondary" className="px-1 font-normal">
                    {selectedValues.length} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.includes(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="px-1 font-normal rounded-sm"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={label} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        updateQueryString(
                          selectedValues.filter((val) => val !== option.value),
                        );
                      } else {
                        updateQueryString([...selectedValues, option.value]);
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
                    <span>{option.label}</span>
                    {option.count ? (
                      <span className="flex items-center justify-center w-4 h-4 ml-auto font-mono text-xs">
                        {option.count}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {selectedValues.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => updateQueryString([])}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
