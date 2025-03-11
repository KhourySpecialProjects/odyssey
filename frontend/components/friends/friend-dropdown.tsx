"use client";

import { AlignJustify } from "lucide-react";
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
        <AlignJustify />
      </button>

      <div
        className={`flex align-center justify-start select-none ${expanded ? "" : "hidden"} relative`}
      >
        <div className="absolute z-[200] flex flex-col flex-nowrap px-2 py-2 w-max rounded-md bg-slate-200 divide-y divide-slate-500">
          {keys.map((key) => (
            <div
              key={key}
              className={
                "px-2 py-1 cursor-pointer z-[200]" +
                (selected == key
                  ? "bg-slate-200 dark:text-black"
                  : "hover:bg-slate-100 dark:hover:text-black")
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
