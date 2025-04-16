"use client";

import { cn } from "@/lib/utils";
import { AlignJustify, Folders, ChevronDown } from "lucide-react";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";

export interface AdminContent {
  [name: string]: React.ReactNode;
}

//WARNING: this dropdown has not been modified to retain which tab its on
//so if each page is making calls that revalidate the page, the dropdown
//will reset with each call
export function ComponentDropdown({ content }: { content: AdminContent }) {
  const keys = Object.keys(content!);
  const [selected, setSelected] = React.useState(keys[0]);
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="">
      <div className="w-full flex flex-row justify-center pb-4">
        <select
          className="w-[65%] px-3 py-2 border text-sm border-slate-300 focus:border-slate-500 dark:text-white dark:border-slate-400 rounded-md dark:bg-black dark:focus:border-slate-200 focus:outline-none focus:ring-0"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {keys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
      {content[selected]}
    </div>
  );
}
