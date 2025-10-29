"use client";

import { useState, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { Block } from "./add-block";
import { useOffClick } from "../metadata/hooks/useOffClick";

export function BlockToolbar({
  onAddBlock,
}: {
  onAddBlock: (block: Block) => void;
}) {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const ref = useRef(null);
  const { open: isOpen, setOpen } = useOffClick(ref);
  const dropdownVariants = "outline";

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/30" />}
      <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-3 pb-4">
        <Popover open={isOpen}>
          <PopoverTrigger
            asChild
            onClick={() => {
              setDropdownVisible(false);
              setOpen(true);
            }}
          >
            <div className="flex flex-row items-center justify-center">
              <Separator
                className="h-[2px] w-full bg-slate-400 dark:bg-slate-300"
                orientation="horizontal"
              />
              <Button
                className="mx-2 text-lg text-slate-600 hover:bg-transparent hover:text-slate-900 dark:text-slate-300 dark:hover:bg-transparent dark:hover:text-slate-50"
                variant="ghost"
              >
                Add Block
              </Button>
              <Separator
                className="h-[2px] w-full bg-slate-400 dark:bg-slate-300"
                orientation="horizontal"
              />
            </div>
          </PopoverTrigger>

          <PopoverContent
            className="z-50 max-h-[calc(100vh-4rem)] space-y-1 overflow-y-auto"
            ref={ref}
          >
            <Button
              onClick={() => {
                setOpen(false);
                onAddBlock({
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
                onAddBlock({
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

            <Button
              onClick={() => setDropdownVisible(!dropdownVisible)}
              variant="ghost"
              className="w-full border border-slate-200"
            >
              Callout Block
            </Button>

            {dropdownVisible && (
              <div className="mb-3 min-w-[220px] cursor-pointer space-y-1 divide-y divide-slate-300 rounded-md border p-2 text-center text-black shadow">
                <div>
                  <Button
                    onClick={(e) => {
                      setOpen(false);
                      e.preventDefault();
                      onAddBlock({
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
                    className="mb-1 w-full justify-between border border-slate-200 bg-red-300 dark:bg-red-300 dark:text-black"
                  >
                    Warning
                    {<CalloutIcon color={"bg-red-300"}></CalloutIcon>}
                  </Button>
                  <Button
                    onClick={(e) => {
                      setOpen(false);
                      e.preventDefault();
                      onAddBlock({
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
                    className="mb-1 w-full justify-between border border-slate-200 bg-blue-300 dark:bg-blue-300 dark:text-black"
                  >
                    Question
                    {<CalloutIcon color={"bg-blue-300"}></CalloutIcon>}
                  </Button>
                  <Button
                    onClick={(e) => {
                      setOpen(false);
                      e.preventDefault();
                      onAddBlock({
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
                    className="mb-1 w-full justify-between border border-slate-200 bg-orange-300 dark:bg-orange-300 dark:text-black"
                  >
                    Important
                    {<CalloutIcon color={"bg-orange-300"}></CalloutIcon>}
                  </Button>
                  <Button
                    onClick={(e) => {
                      setOpen(false);
                      e.preventDefault();
                      onAddBlock({
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
                    className="mb-1 w-full justify-between border border-slate-200 bg-green-300 dark:bg-green-300 dark:text-black"
                  >
                    Definition
                    {<CalloutIcon color={"bg-green-300"}></CalloutIcon>}
                  </Button>
                  <Button
                    onClick={(e) => {
                      setOpen(false);
                      e.preventDefault();
                      onAddBlock({
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
                    className="mb-1 w-full justify-between border border-slate-200 bg-purple-300 dark:bg-purple-300 dark:text-black"
                  >
                    More Information
                    {<CalloutIcon color={"bg-purple-300"}></CalloutIcon>}
                  </Button>
                  <Button
                    onClick={(e) => {
                      setOpen(false);
                      e.preventDefault();
                      onAddBlock({
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
                    className="mb-1 w-full justify-between border border-slate-200 bg-amber-300 dark:bg-amber-300 dark:text-black"
                  >
                    Caution
                    {<CalloutIcon color={"bg-amber-300"}></CalloutIcon>}
                  </Button>
                  <Button
                    onClick={(e) => {
                      setOpen(false);
                      e.preventDefault();
                      onAddBlock({
                        __component: "droplets.callout",
                        content: [
                          {
                            type: "paragraph",
                            children: [{ type: "text", text: "" }],
                          },
                        ],
                        color: "bg-sky-50 dark:bg-sky-200",
                        type: "info",
                      });
                    }}
                    variant={dropdownVariants}
                    className="w-full justify-between border border-slate-200 bg-sky-50 dark:bg-sky-200 dark:text-black"
                  >
                    Default
                    {<CalloutIcon color={"bg-sky-50"}></CalloutIcon>}
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                setOpen(false);
                onAddBlock({
                  __component: "droplets.video",
                  url: "",
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
                onAddBlock({
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
                onAddBlock({
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
                onAddBlock({
                  __component: "droplets.quiz",
                  questions: [
                    {
                      id: Math.random(),
                      content: "",
                      answerOptions: [
                        { id: Math.random(), content: "True", isCorrect: true },
                        {
                          id: Math.random(),
                          content: "False",
                          isCorrect: false,
                        },
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
    </>
  );
}
