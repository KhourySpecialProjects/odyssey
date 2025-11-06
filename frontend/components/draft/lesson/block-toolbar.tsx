"use client";

import { useState, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { Block } from "@/types";
import {
  Type,
  ChevronDown,
  MessageSquare,
  Video,
  ListChecks,
  Edit3,
  ToggleLeft,
} from "lucide-react";

export function BlockToolbar({
  onAddBlock,
}: {
  onAddBlock: (block: Block) => void;
}) {
  const [calloutMenuOpen, setCalloutMenuOpen] = useState(false);
  const calloutRef = useRef<HTMLDivElement>(null);

  const buttonClass =
    "inline-flex items-center justify-center gap-2 h-11 text-base font-medium";

  return (
    <div className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
      <Button
        onClick={() => {
          onAddBlock({
            __component: "droplets.generic",
            content: "",
          });
        }}
        variant="outline"
        className={buttonClass}
      >
        <Type size={16} className="text-blue-600" />
        Text Block
      </Button>

      <Button
        onClick={() => {
          onAddBlock({
            __component: "droplets.expandable",
            title: "",
            content: "",
          });
        }}
        variant="outline"
        className={buttonClass}
      >
        <ChevronDown size={16} className="text-purple-600" />
        Expandable
      </Button>

      <div className="relative" ref={calloutRef}>
        <Popover open={calloutMenuOpen} onOpenChange={setCalloutMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={buttonClass}>
              <MessageSquare size={16} className="text-orange-600" />
              Callout
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-1">
              <Button
                onClick={() => {
                  setCalloutMenuOpen(false);
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
                variant="outline"
                size="sm"
                className="w-full justify-between bg-red-300 dark:bg-red-300 dark:text-black"
              >
                Warning
                <CalloutIcon color="bg-red-300" />
              </Button>
              <Button
                onClick={() => {
                  setCalloutMenuOpen(false);
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
                variant="outline"
                size="sm"
                className="w-full justify-between bg-blue-300 dark:bg-blue-300 dark:text-black"
              >
                Question
                <CalloutIcon color="bg-blue-300" />
              </Button>
              <Button
                onClick={() => {
                  setCalloutMenuOpen(false);
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
                variant="outline"
                size="sm"
                className="w-full justify-between bg-orange-300 dark:bg-orange-300 dark:text-black"
              >
                Important
                <CalloutIcon color="bg-orange-300" />
              </Button>
              <Button
                onClick={() => {
                  setCalloutMenuOpen(false);
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
                variant="outline"
                size="sm"
                className="w-full justify-between bg-green-300 dark:bg-green-300 dark:text-black"
              >
                Definition
                <CalloutIcon color="bg-green-300" />
              </Button>
              <Button
                onClick={() => {
                  setCalloutMenuOpen(false);
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
                variant="outline"
                size="sm"
                className="w-full justify-between bg-purple-300 dark:bg-purple-300 dark:text-black"
              >
                More Information
                <CalloutIcon color="bg-purple-300" />
              </Button>
              <Button
                onClick={() => {
                  setCalloutMenuOpen(false);
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
                variant="outline"
                size="sm"
                className="w-full justify-between bg-amber-300 dark:bg-amber-300 dark:text-black"
              >
                Caution
                <CalloutIcon color="bg-amber-300" />
              </Button>
              <Button
                onClick={() => {
                  setCalloutMenuOpen(false);
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
                variant="outline"
                size="sm"
                className="w-full justify-between bg-sky-50 dark:bg-sky-200 dark:text-black"
              >
                Default
                <CalloutIcon color="bg-sky-50" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Button
        onClick={() => {
          onAddBlock({
            __component: "droplets.video",
            url: "",
          });
        }}
        variant="outline"
        className={buttonClass}
      >
        <Video size={16} className="text-red-600" />
        Video
      </Button>

      <Button
        onClick={() => {
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
        variant="outline"
        className={buttonClass}
      >
        <ListChecks size={16} className="text-green-600" />
        Multiple Choice
      </Button>

      <Button
        onClick={() => {
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
        variant="outline"
        className={buttonClass}
      >
        <Edit3 size={16} className="text-teal-600" />
        Open Ended
      </Button>

      <Button
        onClick={() => {
          onAddBlock({
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
        variant="outline"
        className={buttonClass}
      >
        <ToggleLeft size={16} className="text-indigo-600" />
        True/False
      </Button>
    </div>
  );
}
