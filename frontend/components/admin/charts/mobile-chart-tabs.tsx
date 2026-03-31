"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface MobileChartTabsProps {
  charts: {
    label: string;
    content: React.ReactNode;
  }[];
}

export function MobileChartTabs({ charts }: MobileChartTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {charts.map((chart, i) => (
          <button
            key={chart.label}
            onClick={() => setActiveTab(i)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              i === activeTab
                ? "bg-white text-[#2D7597] shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-[#667085] dark:text-slate-400",
            )}
          >
            {chart.label}
          </button>
        ))}
      </div>
      <div className="mt-3">{charts[activeTab].content}</div>
    </div>
  );
}
