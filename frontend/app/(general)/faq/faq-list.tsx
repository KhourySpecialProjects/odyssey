"use client";

import { useState } from "react";

export function FAQList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="w-[50%]">
      <ul className="divide-slate-200 dark:divide-slate-700 md:space-y-0">
        <div>
          {[0, 1, 2].map((index) => (
            <li
              key={index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="py-4 px-6 [&:not(:first-child)]:pt-3 relative border border-gray-300 rounded-md transition duration-150 hover:border-gray-500 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold truncate text-slate-900 dark:text-white text-center">
                    {index === 0 && "When was Odyssey first created?"}
                    {index === 1 && "What was the motivation behind this website?"}
                    {index === 2 && "What are the plans for Odyssey in the future?"}
                  </p>
                </div>
              </div>

              <div
                className={`overflow-hidden transition-[max-height] duration-300 ease-in-out text-center ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div>(insert answer here)</div>
              </div>
            </li>
          ))}
        </div>
      </ul>
    </div>
  );
}