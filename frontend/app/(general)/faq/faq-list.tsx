"use client";

import { useState } from "react";

export function FAQList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="w-[85%] md:w-[50%]">
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
                  <p className="text-xl font-bold whitespace-normal text-slate-900 dark:text-slate-300 text-center">
                    {index === 0 && "How can I create a droplet?"}
                    {index === 1 && "When was Odyssey first created?"}
                    {index === 2 &&
                      "What are the plans for Odyssey in the future?"}
                  </p>
                </div>
              </div>

              <div
                className={`overflow-hidden transition-[max-height] duration-500 ease-in-out text-center dark:text-slate-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div>
                  {index === 0 &&
                    "Contact a member of the Odyssey team to ask for permission to become a content creator."}
                  {index === 1 && "January 2024"}
                  {index === 2 &&
                    "We are looking to add support for multiple authors on droplets as well as creating personalized badges for completing droplets."}
                </div>
              </div>
            </li>
          ))}
        </div>
      </ul>
    </div>
  );
}
