"use client";

import { updateLesson } from "@/lib/actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRef } from "react";
import { useOffClick } from "../metadata/hooks/useOffClick";
import { CalloutIcon } from "@/components/ui/callout-icons";


import {
  getInitials,
  isAuthorizedUserAdmin,
  isAuthorizedUserFaculty,
  condenseRoleTitles,
} from "@/lib/utils";
import { AuthorizedUser, User } from "@/types";
import {
  ChevronDownIcon,
  CogIcon,
  LogOutIcon,
  PersonStanding,
  TowerControlIcon,
  User2Icon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@radix-ui/react-dropdown-menu";

export function AddBlock({ add }: { add: (block: any) => void }) {
  const ref = useRef(null);
  const { open, setOpen } = useOffClick(ref);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const dropdownVariants = "outline"

  return (
    <div className="w-full flex justify-center items-center gap-3 flex-wrap max-w-2xl">
      <Popover open={open}>
        <PopoverTrigger asChild onClick={() => {
          setDropdownVisible(false);
          setOpen(true);
        }}>
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
            Generic Rich Text Block
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
                        type: "paragraph", children: [{ type: "text", text: "" }],
                      },
                    ],
                    color: "bg-red-300",
                    type: "info",
                  });
                }}
                variant={dropdownVariants}
                className="w-full border border-slate-200 bg-red-300 mb-1"
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
                        type: "paragraph", children: [{ type: "text", text: "" }],
                      },
                    ],
                    color: "bg-blue-300",
                    type: "info",
                  });

                }}
                variant={dropdownVariants}
                className="w-full border border-slate-200 bg-blue-300 mb-1"
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
                        type: "paragraph", children: [{ type: "text", text: "" }],
                      },
                    ],
                    color: "bg-orange-300",
                    type: "info",
                  });
                }}
                variant={dropdownVariants}
                className="w-full border border-slate-200 bg-orange-300 mb-1"
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
                        type: "paragraph", children: [{ type: "text", text: "" }],
                      },
                    ],
                    color: "bg-green-300",
                    type: "info",
                  });
                }}
                variant={dropdownVariants}
                className="w-full border border-slate-200 bg-green-300 mb-1"
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
                        type: "paragraph", children: [{ type: "text", text: "" }],
                      },
                    ],
                    color: "bg-purple-300",
                    type: "info",
                  });
                }}
                variant={dropdownVariants}
                className="w-full border border-slate-200 bg-purple-300 mb-1"
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
                        type: "paragraph", children: [{ type: "text", text: "" }],
                      },
                    ],
                    color: "bg-amber-300",
                    type: "info",
                  });
                }}
                variant={dropdownVariants}
                className="w-full border border-slate-200 bg-amber-300"
              >
                Caution
                {<CalloutIcon color={"bg-amber-300"}></CalloutIcon>}
              </Button>
              </div>
            </PopoverContent>
            
          </Popover>







          <Button
            onClick={() => {
              setOpen(false);
              add({
                __component: "droplets.video",
                url: "https://www.youtube.com/asdfgsfd",
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
            Quiz Block
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
