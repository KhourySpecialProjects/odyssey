"use client";

import { IconArchive, IconArchiveOff } from "@tabler/icons-react";
import { Button } from "./button";

export function ArchiveButton({
  isArchived,
  onToggle,
}: {
  isArchived: boolean;
  onToggle: () => void;
}) {
  const label = isArchived ? "Unarchive" : "Archive";
  const Icon = isArchived ? IconArchiveOff : IconArchive;
  return (
    <Button
      size="sm"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="bg-transparent shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
    >
      <div className="group relative">
        <Icon className="h-5 w-5 text-black dark:text-white" stroke={1.8} />
        <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {label}
        </span>
      </div>
    </Button>
  );
}
