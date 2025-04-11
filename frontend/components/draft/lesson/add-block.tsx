"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useOffClick } from "../metadata/hooks/useOffClick";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { useState } from "react";

export function AddBlock({ add }: { add: (block: any) => void }) {
  const ref = useRef(null);
  const { open, setOpen } = useOffClick(ref);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const dropdownVariants = "outline";

  return (
    <div className="w-full flex justify-center items-center gap-3 flex-wrap max-w-2xl">
      <Popover open={open}>
        <PopoverTrigger
          asChild
          onClick={() => {
            setDropdownVisible(false);
            setOpen(true);
          }}
        >
          <Button className="bg-slate-600 text-white px-3 py-2 rounded-md hover:bg-slate-700">
            Add Block
          </Button>
        </PopoverTrigger>

        <PopoverContent className="space-y-1" ref={ref}>
          <Button
            onClick={() => {
              setOpen(false);
              add({
                __component: "droplets.generic",
                content: "",
              });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Text Block
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              add({
                __component: "droplets.expandable",
                title: "",
                content: "",
              });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Expandable Block
          </Button>

          <Popover open={dropdownVisible}>
            <PopoverTrigger asChild>
              <Button
                onClick={() => {
                  setDropdownVisible(!dropdownVisible);
                }}
                variant="ghost"
                className="w-full border border-slate-200"
              >
                Callout Block
              </Button>
            </PopoverTrigger>

            <PopoverContent className="divide-y divide-slate-300 mb-3 min-w-[220px] bg-white cursor-pointer text-black text-center p-2 space-y-1 shadow-none">
              <div>
                <Button
                  onClick={(e) => {
                    setOpen(false);
                    e.preventDefault();
                    add({
                      __component: "droplets.callout",
                      content: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", text: "" }],
                        },
                      ],
                      color: "bg-red-300",
                      type: "info",
                    });
                  }}
                  variant={dropdownVariants}
                  className="w-full border border-slate-200 bg-red-300 dark:bg-red-300 dark:text-black mb-1 justify-between"
                >
                  Warning
                  {<CalloutIcon color={"bg-red-300"}></CalloutIcon>}
                </Button>
                <Button
                  onClick={(e) => {
                    setOpen(false);
                    e.preventDefault();
                    add({
                      __component: "droplets.callout",
                      content: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", text: "" }],
                        },
                      ],
                      color: "bg-blue-300",
                      type: "info",
                    });
                  }}
                  variant={dropdownVariants}
                  className="w-full border border-slate-200 bg-blue-300 dark:bg-blue-300 dark:text-black mb-1 justify-between"
                >
                  Question
                  {<CalloutIcon color={"bg-blue-300"}></CalloutIcon>}
                </Button>
                <Button
                  onClick={(e) => {
                    setOpen(false);
                    e.preventDefault();
                    add({
                      __component: "droplets.callout",
                      content: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", text: "" }],
                        },
                      ],
                      color: "bg-orange-300",
                      type: "info",
                    });
                  }}
                  variant={dropdownVariants}
                  className="w-full border border-slate-200 bg-orange-300 dark:bg-orange-300 dark:text-black mb-1 justify-between"
                >
                  Important
                  {<CalloutIcon color={"bg-orange-300"}></CalloutIcon>}
                </Button>
                <Button
                  onClick={(e) => {
                    setOpen(false);
                    e.preventDefault();
                    add({
                      __component: "droplets.callout",
                      content: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", text: "" }],
                        },
                      ],
                      color: "bg-green-300",
                      type: "info",
                    });
                  }}
                  variant={dropdownVariants}
                  className="w-full border border-slate-200 bg-green-300 dark:bg-green-300 dark:text-black mb-1 justify-between"
                >
                  Definition
                  {<CalloutIcon color={"bg-green-300"}></CalloutIcon>}
                </Button>
                <Button
                  onClick={(e) => {
                    setOpen(false);
                    e.preventDefault();
                    add({
                      __component: "droplets.callout",
                      content: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", text: "" }],
                        },
                      ],
                      color: "bg-purple-300",
                      type: "info",
                    });
                  }}
                  variant={dropdownVariants}
                  className="w-full border border-slate-200 bg-purple-300 dark:bg-purple-300 dark:text-black mb-1 justify-between"
                >
                  More Information
                  {<CalloutIcon color={"bg-purple-300"}></CalloutIcon>}
                </Button>
                <Button
                  onClick={(e) => {
                    setOpen(false);
                    e.preventDefault();
                    add({
                      __component: "droplets.callout",
                      content: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", text: "" }],
                        },
                      ],
                      color: "bg-amber-300",
                      type: "info",
                    });
                  }}
                  variant={dropdownVariants}
                  className="w-full border border-slate-200 bg-amber-300 dark:bg-amber-300 dark:text-black mb-1 justify-between"
                >
                  Caution
                  {<CalloutIcon color={"bg-amber-300"}></CalloutIcon>}
                </Button>
                <Button
                  onClick={(e) => {
                    setOpen(false);
                    e.preventDefault();
                    add({
                      __component: "droplets.callout",
                      content: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", text: "" }],
                        },
                      ],
                      color: "bg-sky-50",
                      type: "info",
                    });
                  }}
                  variant={dropdownVariants}
                  className="w-full border border-slate-200 bg-sky-50 dark:bg-sky-50 dark:text-black justify-between"
                >
                  Default
                  {<CalloutIcon color={"bg-sky-50"}></CalloutIcon>}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            onClick={() => {
              setOpen(false);
              add({
                __component: "droplets.video",
                url: "https://www.youtube.com/watch?v=_ZCTvmaPgao",
              });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Video Block
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              add({
                __component: "droplets.quiz",
                questions: [
                  {
                    id: Math.random(),
                    content: "",
                    answerOptions: [
                      { id: Math.random(), content: "", isCorrect: true },
                      { id: Math.random(), content: "", isCorrect: false },
                    ],
                  },
                ],
              });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Multiple Choice Quiz Block
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              add({
                __component: "droplets.open-ended-quiz",
                questions: [
                  {
                    id: Math.random(),
                    content: "",
                    correctAnswer: "",
                  },
                ],
              });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            Open Ended Quiz Block
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              add({
                __component: "droplets.quiz",
                questions: [
                  {
                    id: Math.random(),
                    content: "",
                    answerOptions: [
                      { id: Math.random(), content: "True", isCorrect: true },
                      { id: Math.random(), content: "False", isCorrect: false },
                    ],
                  },
                ],
              });
            }}
            variant="ghost"
            className="w-full border border-slate-200"
          >
            True/False Quiz Block
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
