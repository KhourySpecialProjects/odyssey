"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export interface AdminContent {
  [name: string]: React.ReactNode;
}

export function AdminSelector({
  content,
  initialTab,
}: {
  content: AdminContent;
  initialTab?: string;
}) {
  const keys = Object.keys(content);
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabFromUrl = searchParams.get("tab");
  const fallbackTab =
    initialTab && keys.includes(initialTab) ? initialTab : keys[0];

  const [selected, setSelected] = useState(fallbackTab);

  useEffect(() => {
    console.log("content is ", content);
    const currentTab = searchParams.get("tab");

    if (currentTab !== tabFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", selected);
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }, [selected]);

  return (
    <>
      <div className={`flex align-center justify-center select-none pb-4`}>
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
