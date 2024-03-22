"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useDebugStore from "@/stores/debug-store";
import { BugIcon } from "lucide-react";
import { Button } from "../ui/button";

export default function DebugToggle() {
  const toggleDebug = useDebugStore((state) => state.toggle);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleDebug}
          className="z-50 fixed -bottom-1 -right-1"
          size="icon"
          aria-label="Debug"
        >
          <BugIcon className="w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Toggle debugging</p>
      </TooltipContent>
    </Tooltip>
  );
}
