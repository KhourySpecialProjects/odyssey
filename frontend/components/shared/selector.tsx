"use client";

import { useState } from "react";

// A component that displays a tab selector for different admin views.
// It takes a `content` prop, which is an object where keys are tab names and values are React nodes to display for each tab.
// Uses local state for instant tab switching without server re-renders.
export function AdminSelector({
  content,
}: {
  content: Record<string, React.ReactNode>;
}) {
  const [currentTab, setCurrentTab] = useState(Object.keys(content)[0]);

  return (
    <div>
      <div className="align-center flex justify-center pb-4 select-none">
        <div className="flex w-max flex-row flex-nowrap space-x-2 rounded-lg px-2 py-2 shadow">
          {Object.keys(content).map((key) => (
            <div
              key={key}
              className={
                "cursor-pointer rounded-lg px-2 py-1 " +
                (currentTab === key
                  ? "bg-slate-200 dark:text-black"
                  : "hover:bg-slate-100 dark:hover:text-black")
              }
              onClick={() => setCurrentTab(key)}
            >
              {key}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">{content[currentTab]}</div>
    </div>
  );
}
