"use client";

import { useState } from "react";
import { NoteTypeTitle } from "@/lib/globals";
import { Switch } from "@/components/ui/switch";

interface NotesFilterProps {
  onFilterChange: (selectedColors: NoteTypeTitle[]) => void;
}

export function NotesFilter({ onFilterChange }: NotesFilterProps) {
  const colorOptions = [
    {
      value: NoteTypeTitle.Pink,
      label: "Pink",
      switchColor: "peer-checked:bg-[#f9a8d4]",
    },
    {
      value: NoteTypeTitle.Orange,
      label: "Orange",
      switchColor: "peer-checked:bg-[#fbd38d]",
    },
    {
      value: NoteTypeTitle.Yellow,
      label: "Yellow",
      switchColor: "peer-checked:bg-[#fff300]",
    },
    {
      value: NoteTypeTitle.Green,
      label: "Green",
      switchColor: "peer-checked:bg-[#86efac]",
    },
    {
      value: NoteTypeTitle.Blue,
      label: "Blue",
      switchColor: "peer-checked:bg-[#93c5fd]",
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
    <div className="space-y-3">
      {colorOptions.map((color) => (
        <div
          key={color.value}
          className="flex items-center justify-between gap-2"
        >
          <label
            htmlFor={color.value}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {color.label}
          </label>
          <Switch
            id={color.value}
            checked={selectedColors.includes(color.value)}
            onCheckedChange={() => toggleRole(color.value)}
            className={color.switchColor}
          />
        </div>
      ))}
    </div>
  );
}
