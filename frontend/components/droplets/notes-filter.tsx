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
            className="border-slate-700 focus-visible:ring-slate-700 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900 dark:border-slate-800"
          />
          <label
            htmlFor={color.value}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {color.label}
          </label>
        </div>
      ))}
    </div>
  );
}
