"use client";

import { useState } from "react";
import { NoteTypeTitle } from "@/lib/globals";
import { Checkbox } from "@/components/ui/checkbox";

interface NotesFilterProps {
  onFilterChange: (selectedColors: NoteTypeTitle[]) => void;
}

export function NotesFilter({ onFilterChange }: NotesFilterProps) {
  const colorOptions = [
    {
      value: NoteTypeTitle.Pink,
      label: "Pink",
      color: "bg-[#f9a8d4] dark:text-black",
    },
    {
      value: NoteTypeTitle.Orange,
      label: "Orange",
      color: "bg-[#fbd38d] dark:text-black",
    },
    {
      value: NoteTypeTitle.Yellow,
      label: "Yellow",
      color: "bg-[#fff300] dark:text-black",
    },
    {
      value: NoteTypeTitle.Green,
      label: "Green",
      color: "bg-[#86efac] dark:text-black",
    },
    {
      value: NoteTypeTitle.Blue,
      label: "Blue",
      color: "bg-[#93c5fd] dark:text-black",
    },
  ] as const;

  const [selectedColors, setSelectedColors] = useState<NoteTypeTitle[]>(
    colorOptions.map((color) => color.value),
  );

  const toggleRole = (color: NoteTypeTitle) => {
    const newSelectedColors = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];

    setSelectedColors(newSelectedColors);
    onFilterChange(newSelectedColors);
  };

  return (
    <div className="space-y-2 pt-4">
      {colorOptions.map((color) => (
        <div
          key={color.value}
          className={`flex items-center space-x-2 rounded-md p-1 ${color.color}`}
        >
          <Checkbox
            id={color.value}
            checked={selectedColors.includes(color.value)}
            onCheckedChange={() => toggleRole(color.value)}
            className="border-sky-500 focus-visible:ring-sky-500 data-[state=checked]:border-sky-500 data-[state=checked]:bg-sky-500"
          />
          <label
            htmlFor={color.value}
            className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {color.label}
          </label>
        </div>
      ))}
    </div>
  );
}
