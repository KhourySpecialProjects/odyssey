"use client";

import React from "react";

export interface AdminContent {
  [name: string]: React.ReactNode;
}

export function StatisticsSelector({ content }: { content: AdminContent }) {
  const keys = Object.keys(content!);
  const [selected, setSelected] = React.useState(keys[0]);

  return (
    <>
      <div className={`align-center flex justify-center pb-4 select-none`}>
        <div className="flex w-max flex-row flex-nowrap space-x-2 rounded-lg px-2 py-2 shadow">
          {keys.map((key) => (
            <div
              key={key}
              className={
                "cursor-pointer rounded-lg px-2 py-1 " +
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
