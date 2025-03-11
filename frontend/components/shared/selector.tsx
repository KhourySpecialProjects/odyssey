"use client";

import { AlignJustify } from "lucide-react";
import React, { useState } from "react";

export interface AdminContent {
  [name: string]: React.ReactNode;
}

export function AdminSelector({ content }: { content: AdminContent }) {
  const keys = Object.keys(content!);
  const [selected, setSelected] = React.useState(keys[0]);

  return (
    <>
    

      <div className={`flex align-center justify-center select-none`}>
        <div className="flex flex-row flex-nowrap px-2 py-2 shadow rounded-lg w-max space-x-2">
          {keys.map((key) => (
            <div
              key={key}
              className={
                "px-2 py-1 cursor-pointer rounded-lg " +
                (selected == key
                  ? "bg-slate-200 dark:text-black"
                  : "hover:bg-slate-100 dark:hover:text-black")
              }
              onClick={() => setSelected(key)}
            >
              {key}
            </div>
          ))}
        </div>
      </div>

      {content[selected]}
    </>
  );
}
