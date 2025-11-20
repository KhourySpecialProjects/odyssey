"use client";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

export interface MultiSelectItem {
  id: number;
  name: string;
}

import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { createNewTag } from "@/lib/requests/droplet";

export function MultiSelect({
  label,
  items,
  selected,
  setSelected,
  align = "center",
  className = "",
}: {
  label: string;
  items: MultiSelectItem[];
  selected: MultiSelectItem[];
  setSelected: (selected: MultiSelectItem[]) => void;
  align?: "center" | "start" | "end";
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const onOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const handleNewTag = async () => {
    try {
      if (tagName) {
        const result = await createNewTag(tagName);
        if (result.success) {
          toast.success("Tag created successfully");
        } else {
          console.error("Failed to create tag", result.error);
          toast.error(`"${tagName} tag already exists"`);
        }
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to create new tag: ", error);
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("h-fit dark:hover:bg-black", className)}
          >
            {selected?.length > 0 ? (
              <>
                <div className="flex w-full flex-wrap items-center justify-start gap-1">
                  {selected.map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.id}
                      className="rounded-sm px-1 py-0 font-normal dark:text-black"
                    >
                      {option.name}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-slate-400">
                {label === "Tags"
                  ? "Select Tags..."
                  : label === "Prerequisites"
                    ? "Select Prerequisites..."
                    : "Select Similar Droplets..."}
              </p>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align={align}>
          <Command>
            <CommandInput placeholder={label} />
            <CommandList>
              <CommandGroup>
                {items.map((option) => {
                  const isSelected =
                    selected.filter((item) => item.id === option.id).length > 0;

                  return (
                    <CommandItem
                      key={option.id}
                      onSelect={() => {
                        if (isSelected) {
                          setSelected(
                            selected.filter((val) => val.id !== option.id),
                          );
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
                        <CheckIcon className="h-4 w-4" />
                      </div>
                      <span>{option.name}</span>
                    </CommandItem>
                  );
                })}
                <div
                  className={`flex pt-3 ${label === "Tags" ? "visibility: visible" : "visibility: hidden"}`}
                  onClick={() => setIsOpen(true)}
                >
                  <Plus size={20} />
                  Add Tag
                </div>
                <Dialog open={isOpen} onOpenChange={onOpenChange}>
                  <DialogContent className="sm:max-w-[250px]">
                    <DialogHeader>
                      <DialogTitle>Enter the name of your new tag</DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 flex flex-col gap-4">
                      <Input
                        id="name"
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        placeholder="Enter new tag name"
                        className="max-w-xl"
                      />
                      <Button onClick={handleNewTag}>Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
