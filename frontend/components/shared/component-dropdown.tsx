"use client";

import React from "react";

export interface AdminContent {
  [name: string]: React.ReactNode;
}

//WARNING: this dropdown has not been modified to retain which tab its on
//so if each page is making calls that revalidate the page, the dropdown
//will reset with each call
export function ComponentDropdown({ content }: { content: AdminContent }) {
  const keys = Object.keys(content!);
  const [selected, setSelected] = React.useState(keys[0]);

  return (
    <div className="">
      <div className="flex w-full flex-row justify-center pb-4">
        <select
          className="w-[65%] rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:ring-0 focus:outline-none dark:border-slate-400 dark:bg-black dark:text-white dark:focus:border-slate-200"
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
