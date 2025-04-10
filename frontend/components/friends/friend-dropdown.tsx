"use client";

import { cn } from "@/lib/utils";
import { AlignJustify, Folders } from "lucide-react";
import React from "react";

export interface AdminContent {
  [name: string]: React.ReactNode;
}

export function FriendDropdown({ content }: { content: AdminContent }) {
  const keys = Object.keys(content!);
  const [selected, setSelected] = React.useState(keys[0]);
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="">
      <button onClick={() => setExpanded(!expanded)}>
      <div className={`p-2 border border-slate-300 ${expanded ? "bg-slate-300 rounded-md dark:bg-slate-600" : ""} rounded-md`}>
          <Folders className="h-6 w-6" />
        </div>
      </button>

      <div
        className={`flex align-center justify-start select-none ${expanded ? "" : "hidden"} relative`}
      >
        <div
          className={cn(
            "absolute z-[200] flex flex-col flex-nowrap px-2 py-2 w-max rounded-md bg-slate-200 dark:bg-slate-800 divide-y divide-slate-500",
            "shadow-[0px_0px_8px_rgb(29,58,138)] dark:shadow-[0px_0px_6px_rgb(0,255,255)] ",
          )}
        >
          {keys.map((key) => (
            <div
              key={key}
              className={
                "px-2 py-1 cursor-pointer z-[200] text-center items-center justify-center dark:text-white" +
                (selected == key ? "bg-slate-200" : "hover:bg-slate-100")
              }
              onClick={() => {
                setSelected(key), setExpanded(false);
              }}
            >
              {key}
            </div>
          ))}
        </div>
      </div>
      {content[selected]}
    </div>
  );
}
