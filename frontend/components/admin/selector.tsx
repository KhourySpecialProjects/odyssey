"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { ChevronDownIcon } from "lucide-react";

export interface AdminContent {
  [name: string]: React.ReactNode;
}

export function AdminSelector({ content }: { content: AdminContent }) {
  const keys = Object.keys(content!);
  const [selected, setSelected] = React.useState(keys[0]);

  return (
    <>
      <div className="flex align-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="w-min cursor-pointer select-none text-md  transition-colors duration-100 wg-antialiased hover:bg-slate-100 dark:hover:bg-white/5 px-2 py-2 rounded-xl border-inherit border-2 hover:border-transparent"
            asChild
          >
            <div className="flex flex-row items-center">
              <div className="min-w-40 flex justify-start items-center pl-2">
                <span className="font-medium text-nowrap">{selected}</span>
              </div>
              <ChevronDownIcon className="h-6 w-6 trigger-icon text-slate-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            {keys.map((key) => (
              <DropdownMenuItem
                className="text-md flex min-w-36"
                key={key}
                onClick={() => setSelected(key)}
              >
                {key}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {content[selected]}
    </>
  );
}
